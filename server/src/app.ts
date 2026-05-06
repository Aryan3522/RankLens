import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import session from "express-session";
import passport from "./lib/auth/passport.js";
import { rateLimit } from "express-rate-limit";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// --- Trust Proxy for Vercel/Render ---
app.set("trust proxy", 1);

// --- Middleware Setup ---
const clientUrl = (process.env.CLIENT_URL || "http://localhost:8081").replace(/\/$/, "");

logger.info({ allowedOrigin: clientUrl }, "CORS configuration");

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
app.use(cors({ 
  origin: clientUrl === "true" ? true : clientUrl, 
  credentials: true 
})); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Session & Auth Setup ---
app.use(
  session({
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

export default app;
