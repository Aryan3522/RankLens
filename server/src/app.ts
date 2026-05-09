import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";

import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { env } from "./lib/env.js";
import { generalRateLimiter } from "./lib/concurrency.js";

const app: Express = express();

// ======================================================
// CORS CONFIGURATION
// ======================================================

const clientUrls = (env.CLIENT_URL || "")
  .split(",")
  .map((url: string) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...clientUrls,
    "https://rank-lens-delta.vercel.app",
    "http://localhost:5173",
    "http://localhost:8081",
  ]),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests without origin
    // (mobile apps, curl, postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    logger.warn(
      {
        origin,
        allowedOrigins,
      },
      "CORS blocked request"
    );

    return callback(new Error("Not allowed by CORS"));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],

  credentials: true,

  optionsSuccessStatus: 200,
};

// Apply CORS globally
app.use(cors(corsOptions));

// Handle preflight requests
app.options(/.*/, cors(corsOptions));

// ======================================================
// SECURITY & PERFORMANCE
// ======================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    contentSecurityPolicy: false,
  })
);

app.use(compression());

app.set("trust proxy", 1);

// ======================================================
// BODY PARSERS
// ======================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ======================================================
// LOGGING
// ======================================================

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

// ======================================================
// HEALTH ROUTES
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    env: env.NODE_ENV,
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/ping", (req, res) => {
  res.json({
    pong: true,
    origin: req.headers.origin,
    allowedOrigins,
    env: env.NODE_ENV,
  });
});

// ======================================================
// RATE LIMITER
// ======================================================

const apiRateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip OPTIONS requests
  if (req.method === "OPTIONS") {
    return next();
  }

  const key = req.ip || "anonymous";

  if (generalRateLimiter.isRateLimited(key)) {
    return res.status(429).json({
      error: "Too many requests, please try again later.",
      retryAfter: "15 minutes",
    });
  }

  next();
};

// ======================================================
// API ROUTES
// ======================================================

app.use("/api", apiRateLimitMiddleware, router);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

const isProd = env.NODE_ENV === "production";

app.use(
  (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    const status = err.status || err.statusCode || 500;

    const message = err.message || "Internal Server Error";

    logger.error(
      {
        err,
        status,
        message,
      },
      "Unhandled Application Error"
    );

    const origin = req.headers.origin;

    if (origin) {
      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");

    res.status(status).json({
      error: isProd ? "Internal Server Error" : message,
      debug: isProd ? undefined : err.stack,
    });
  }
);

export default app;