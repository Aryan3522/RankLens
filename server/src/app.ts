import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "./lib/auth/passport.js";
import jwt from "jsonwebtoken";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { pool } from "./db/index.js";
import { env } from "./lib/env.js";
import { generalRateLimiter } from "./lib/concurrency.js";

const app: Express = express();

// --- 1. CORS (ABSOLUTE TOP) ---
// Parse and normalize allowed origins from environment
const clientUrls = (env.CLIENT_URL || "")
  .split(",")
  .map((url: string) => url.trim().replace(/\/$/, "")) // Remove trailing slashes
  .filter(Boolean);

const allowedOrigins = [...new Set([...clientUrls, "https://rank-lens-delta.vercel.app"])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or matched origins
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        callback(null, true);
      } else {
        logger.warn({ origin, allowed: allowedOrigins }, "CORS blocked origin");
        callback(null, false);
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "X-CSRF-Token"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200,
  }),
);

const PostgresStore = connectPgSimple(session);

// --- 2. Security & Performance ---
app.use(helmet()); 
app.use(compression());
app.set("trust proxy", 1); 

// --- 3. Logging & Parsers ---
app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req: any) => ({
        id: req.id,
        method: req.method,
        url: req.url?.split("?")[0],
        origin: req.headers.origin,
      }),
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 4. Health Check ---
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: env.NODE_ENV,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// --- Session & Auth Setup ---
const isProd = env.NODE_ENV === "production";
if (isProd && !process.env.SESSION_SECRET) {
  logger.error("SESSION_SECRET is required in production!");
}

app.use(
  session({
    store: new PostgresStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    name: "ranklens.sid",
    cookie: {
      maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days
      httpOnly: true,
      secure: isProd, // Requires HTTPS in production
      sameSite: isProd ? "none" : "lax", // 'none' is required for cross-origin cookies
      path: "/",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- 5. Custom Enterprise Rate Limiting ---
const apiRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const key = (req as any).user?.id?.toString() || req.ip || "anonymous";
  if (generalRateLimiter.isRateLimited(key)) {
    return res.status(429).json({ 
      error: "Too many requests, please try again later.",
      retryAfter: "15 minutes"
    });
  }
  next();
};

// Apply rate limiter and routes
app.use("/api", apiRateLimitMiddleware, router);

// Ping for debugging
app.get("/api/ping", (req, res) => {
  res.json({ 
    pong: true, 
    origin: req.headers.origin, 
    allowed: allowedOrigins,
    env: env.NODE_ENV
  });
});

// --- 6. Global Error Handler (With CORS Fail-safe) ---
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  logger.error({ err, status, message }, "Unhandled Application Error");
  
  // MANUALLY set CORS headers for error responses as a final fail-safe
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin.replace(/\/$/, ""))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : message,
    debug: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

export default app;
