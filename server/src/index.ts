import "dotenv/config";

import { env } from "./lib/env.js";
import app from "./app.js";
import { logger } from "./lib/logger.js";

const port = Number(env.PORT) || 3000;

// ======================================================
// PROCESS HANDLERS
// ======================================================

process.on("unhandledRejection", (reason, promise) => {
  logger.error(
    {
      promise,
      reason,
    },
    "Unhandled Rejection"
  );
});

process.on("uncaughtException", (err) => {
  logger.error(
    {
      err,
    },
    "Uncaught Exception"
  );

  process.exit(1);
});

// ======================================================
// START SERVER
// ======================================================

if (env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  app.listen(port, "0.0.0.0", (err?: Error | null) => {
    if (err) {
      logger.error(
        {
          err,
        },
        "Error starting server"
      );

      process.exit(1);
    }

    logger.info(
      {
        port,
        env: env.NODE_ENV || "development",
        nodeVersion: process.version,
      },
      "Server running"
    );
  });
}

export default app;