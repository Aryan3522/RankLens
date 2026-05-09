import "dotenv/config";
import { env } from "./lib/env.js";
import app from "./app.js";
import { logger } from "./lib/logger.js";

const port = env.PORT;

// --- Process Handlers ---
process.on("unhandledRejection", (reason, promise) => {
  logger.error({ promise, reason }, "Unhandled Rejection at Promise");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception thrown");
  process.exit(1);
});

if (env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${port}"`);
  }

  app.listen(port, "0.0.0.0", (err?: Error | null) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ 
      port, 
      env: env.NODE_ENV || "development",
      nodeVersion: process.version 
    }, "Server listening on 0.0.0.0");
  });
}

export default app;
