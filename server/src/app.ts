import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
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
const PostgresStore = connectPgSimple(session);
const JWT_SECRET = env.JWT_SECRET;

// --- Security & Performance ---
app.use(helmet()); // Sets various security headers
app.use(compression()); // Compresses response bodies
app.set("trust proxy", 1); // Required for Vercel/Render behind a proxy

// --- Middleware Setup ---
const clientUrls = (env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Always allow the specific production URL as a safety fallback
const allowedOrigins = [...new Set([...clientUrls, "https://rank-lens-delta.vercel.app"])];

logger.info({ allowedOrigins }, "CORS configuration");

// Logger first
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
          origin: req.headers.origin, // Log origin for debugging
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS restricted to CLIENT_URL for security
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // If the origin matches any of the allowedOrigins, allow it
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn({ origin, allowed: allowedOrigins }, "CORS blocked origin");
        // Returning null, false instead of an Error prevents Express from 500ing
        // This ensures the browser receives a clean CORS rejection instead of a server crash.
        callback(null, false);
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// --- Global Error Handler ---
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  logger.error({ err, status, message }, "Unhandled Application Error");
  
  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : message,
  });
});

export default app;
