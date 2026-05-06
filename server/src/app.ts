import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import passport from "./lib/auth/passport";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "./db";

const PostgresStore = pgSession(session);

const app: Express = express();

// --- Middleware Setup ---
app.use(cors({ origin: true, credentials: true })); // Enable credentials for sessions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Session & Auth Setup ---
app.use(
  session({
    store: new PostgresStore({ pool, tableName: "session" }),
    secret: process.env.SESSION_SECRET || "development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- Rate Limiting (Load Balancer Logic) ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP or User to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false }, // Correct validation key
  message: { error: "Too many requests, please try again later." },
  // Future-proof: If auth is added, we use the user ID, otherwise fallback to IP
  keyGenerator: (req) => {
    return (req as any).user?.id?.toString() || req.ip || "anonymous";
  },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to all /api routes
app.use("/api", apiLimiter, router);

export default app;
