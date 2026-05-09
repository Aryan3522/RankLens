import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { env } from "./lib/env.js";
import { generalRateLimiter } from "./lib/concurrency.js";

const app: Express = express();

// --- 1. CORS Configuration ---
const clientUrls = (env.CLIENT_URL || "")
  .split(",")
  .map((url: string) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...clientUrls,
    "https://rank-lens-delta.vercel.app",
    "http://localhost:5173",
    "http://localhost:8081", // Added from your .env
  ]),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // If no origin (like mobile or curl), allow it
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      logger.warn({ origin, allowed: allowedOrigins }, "CORS blocked unauthorized origin");
      // Use null instead of Error to avoid triggering the global error handler during preflight
      callback(null, false);
    }
  },
  credentials: false,
  allowedHeaders: ["Content-Type", "Accept", "X-Requested-With", "Authorization"],
  methods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
  preflightContinue: false,
  optionsSuccessStatus: 200, // Changed from 204 to 200 for broader compatibility
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS preflight for all routes using a safe middleware approach
// to avoid Express 5 path-to-regexp syntax errors with strings like "*" or "/*"
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return cors(corsOptions)(req, res, next);
  }
  next();
});

// Also provide an explicit options handler using a RegExp literal which is safe in Express 5
app.options(/.*/, cors(corsOptions));

// --- 2. Security & Performance ---
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, 
  })
);
app.use(compression());
app.set("trust proxy", 1); 

// --- 3. Parsers & Logging ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const isProd = env.NODE_ENV === "production";

// --- 5. Rate Limiting ---
const apiRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") return next();

  const key = req.ip || "anonymous";
  if (generalRateLimiter.isRateLimited(key)) {
    return res.status(429).json({ 
      error: "Too many requests, please try again later.",
      retryAfter: "15 minutes"
    });
  }
  next();
};

app.use("/api", apiRateLimitMiddleware, router);

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
  
  const origin = req.headers.origin;
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  }
  
  res.status(status).json({
    error: isProd ? "Internal Server Error" : message,
    debug: isProd ? undefined : err.stack,
  });
});

export default app;
