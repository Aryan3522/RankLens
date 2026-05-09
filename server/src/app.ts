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
const allowedOrigins = [
  "https://rank-lens-delta.vercel.app",
  "http://localhost:5173",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) - optional, but standard for public APIs
    // For maximum security per your request "no one else should be able to send request",
    // we block even no-origin requests if we want to be 100% strict, but usually browsers always send origin.
    if (!origin) return callback(null, false); 
    
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      logger.warn({ origin, allowed: allowedOrigins }, "CORS blocked unauthorized origin");
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: false,
  allowedHeaders: ["Content-Type", "Accept", "X-Requested-With"],
  methods: ["GET", "POST", "OPTIONS"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));
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
