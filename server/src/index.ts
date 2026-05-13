import "dotenv/config";

import app from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";

const port = Number(env.PORT) || 3000;

/**
 * ======================================================
 * PROCESS ERROR HANDLERS
 * ======================================================
 */

process.on("unhandledRejection", (reason) => {
  logger.error(
    {
      error: reason,
    },
    "Unhandled Promise Rejection",
  );
});

process.on("uncaughtException", (error) => {
  logger.fatal(
    {
      error,
    },
    "Uncaught Exception",
  );

  process.exit(1);
});

/**
 * ======================================================
 * START SERVER
 * ======================================================
 */

const server = app.listen(port, "0.0.0.0", () => {
  logger.info(
    {
      port,
      env: env.NODE_ENV,
      nodeVersion: process.version,
    },
    "Server running",
  );
});

/**
 * ======================================================
 * GRACEFUL SHUTDOWN
 * ======================================================
 */

const shutdown = (signal: string) => {
  logger.warn(
    {
      signal,
    },
    "Graceful shutdown initiated",
  );

  server.close(() => {
    logger.info("HTTP server closed");

    process.exit(0);
  });

  // FORCE EXIT AFTER TIMEOUT

  setTimeout(() => {
    logger.error(
      "Forced shutdown after timeout",
    );

    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));

process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;