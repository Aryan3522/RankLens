import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "./lib/auth/passport.js";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { pool } from "./db/index.js";

const app: Express = express();
const PostgresStore = connectPgSimple(session);
const JWT_SECRET = process.env.SESSION_SECRET || "development-secret";

// --- Security & Performance ---
app.use(helmet()); // Sets various security headers
app.use(compression()); // Compresses response bodies
app.set("trust proxy", 1); // Required for Vercel/Render behind a proxy

// --- Middleware Setup ---
const clientUrls = (process.env.CLIENT_URL || "http://localhost:8081")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""));

logger.info({ allowedOrigins: clientUrls }, "CORS configuration");

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
    origin: clientUrls.length === 1 && clientUrls[0] === "true" ? true : clientUrls,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- JWT Middleware ---
app.use((req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      logger.debug({ err }, "Invalid JWT token");
    }
  }
  next();
});

// --- Session & Auth Setup ---
// Keeping sessions for legacy/fallback support if needed, but primary will be JWT
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  logger.error("SESSION_SECRET is required in production!");
}

app.use(
  session({
    store: new PostgresStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "development-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
