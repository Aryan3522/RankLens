import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "./lib/auth/passport.js";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { pool } from "./db/index.js";
import { env } from "./lib/env.js";
import { generalRateLimiter } from "./lib/concurrency.js";

const app: Express = express();

// --- 1. CORS Configuration (ABSOLUTE TOP) ---
// Parse and normalize allowed origins from environment
const clientUrls = (env.CLIENT_URL || "")
  .split(",")
  .map((url: string) => url.trim().replace(/\/$/, "")) // Remove trailing slashes
  .filter(Boolean);

// Define comprehensive list of allowed origins
const allowedOrigins = [
  ...new Set([
    ...clientUrls,
    "https://rank-lens-delta.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173", // Vite preview
  ]),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Normalize origin for comparison
    const normalizedOrigin = origin.replace(/\/$/, "");
    
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      logger.warn({ origin, allowed: allowedOrigins }, "CORS blocked origin");
      // In production, we don't want to fail the request here, but rather 
      // not set the Access-Control-Allow-Origin header. 
      // However, for preflight to work correctly, we must be careful.
      callback(null, false);
    }
  },
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
    "X-CSRF-Token",
    "Access-Control-Allow-Origin", // Some clients send this
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight for all routes
app.options("*", cors(corsOptions));

const PostgresStore = connectPgSimple(session);

// --- 2. Security & Performance ---
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Adjust Content Security Policy for cross-domain usage if needed
    contentSecurityPolicy: false, 
  })
);
app.use(compression());
app.set("trust proxy", 1); // Required for Vercel/proxies

// --- 3. Parsers & Logging ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.SESSION_SECRET)); // Added cookie-parser with secret

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
  })
);

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
      secure: true, // ALWAYS true for cross-origin SameSite: None
      sameSite: "none", // REQUIRED for cross-domain cookies on Vercel
      path: "/",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- 5. Custom Enterprise Rate Limiting ---
const apiRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // SKIP rate limiting for OPTIONS pre-flight requests
  if (req.method === "OPTIONS") return next();

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

// --- 6. Global Error Handler ---
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  logger.error({ err, status, message }, "Unhandled Application Error");
  
  // Ensure CORS headers are present even on errors
  const origin = req.headers.origin;
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  }
  
  res.status(status).json({
    error: isProd ? "Internal Server Error" : message,
    debug: isProd ? undefined : err.stack,
  });
});

export default app;
