import express, { type Express, type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "@/lib/auth/passport.js";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import router from "@/routes/index.js";
import { logger } from "@/lib/logger.js";
import { pool } from "@/db/index.js";
import { env } from "@/lib/env.js";

const app: Express = express();

// --- 1. MANUAL CORS HEADERS (ABSOLUTE TOP) ---
const clientUrls = (env.CLIENT_URL || "")
  .split(",")
  .map((url: string) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [...new Set([...clientUrls, "https://rank-lens-delta.vercel.app"])];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  }

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

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

// --- 4. Health Check (No DB dependency) ---
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: env.NODE_ENV,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// --- Session & Auth Setup ---
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  logger.error("SESSION_SECRET is required in production!");
}

const isProd = env.NODE_ENV === "production";

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
      maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days for permanent login
      httpOnly: true,
      secure: isProd, // Requires HTTPS in production
      sameSite: isProd ? "none" : "lax", // 'none' is required for cross-origin cookies
      path: "/",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { error: "Too many requests, please try again later." },
  keyGenerator: (req) => {
    return (req as any).user?.id?.toString() || req.ip || "anonymous";
  },
});

// Apply rate limiter and routes
app.use("/api", apiLimiter, router);

// Ping for debugging
app.get("/api/ping", (req, res) => {
  res.json({ pong: true, origin: req.headers.origin, allowed: allowedOrigins });
});

// --- Global Error Handler ---
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  logger.error({ err, status, message }, "Unhandled Application Error");
  
  // MANUALLY set CORS headers for error responses
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : message,
    debug: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

export default app;
