import "dotenv/config";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startCleanupTask } from "./lib/cleanup.js";

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);

// --- Process Handlers ---
process.on("unhandledRejection", (reason, promise) => {
  logger.error({ promise, reason }, "Unhandled Rejection at Promise");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception thrown");
  process.exit(1);
});

// Start auto-deletion cleanup task (3 days TTL)
if (process.env.NODE_ENV !== "test") {
  startCleanupTask();
}

if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  if (!process.env["PORT"]) {
    logger.warn("PORT environment variable not provided, defaulting to 8080");
  }

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, "0.0.0.0", (err?: Error | null) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ 
      port, 
      env: process.env.NODE_ENV || "development",
      nodeVersion: process.version 
    }, "Server listening on 0.0.0.0");
  });
}

export default app;
