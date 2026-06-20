import "dotenv/config";

import app from "./app.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { chromePool } from "./lib/browser-pool.js";

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
 *
 * Pre-warm the Chrome pool before accepting traffic.
 * This avoids cold-start latency on the first request.
 * ======================================================
 */

async function start() {
  try {
    // Initialize Chrome pool (pre-warms Chrome instances)
    logger.info("Pre-warming Chrome pool...");
    await chromePool.initialize();

    const server = app.listen(port, "0.0.0.0", () => {
      logger.info(
        {
          port,
          env: env.NODE_ENV,
          nodeVersion: process.version,
          chromePool: chromePool.getStats(),
        },
        "Server running",
      );
    });

    /**
     * ======================================================
     * GRACEFUL SHUTDOWN
     *
     * 1. Stop accepting new connections
     * 2. Destroy all pooled Chrome instances
     * 3. Exit
     * ======================================================
     */

    const shutdown = async (signal: string) => {
      logger.warn(
        {
          signal,
        },
        "Graceful shutdown initiated",
      );

      server.close(async () => {
        logger.info("HTTP server closed");

        // Destroy Chrome pool (kills all Chrome processes)
        try {
          await chromePool.destroyAll();
        } catch (err) {
          logger.error({ error: err }, "Error destroying Chrome pool");
        }

        process.exit(0);
      });

      // FORCE EXIT AFTER TIMEOUT
      setTimeout(() => {
        logger.error(
          "Forced shutdown after timeout",
        );

        process.exit(1);
      }, 15000).unref(); // 15s (up from 10s to allow Chrome cleanup)
    };

    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    logger.fatal({ error: err }, "Failed to start server");
    process.exit(1);
  }
}

start();

export default app;