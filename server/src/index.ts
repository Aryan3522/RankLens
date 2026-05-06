import app from "./app";
import { logger } from "./lib/logger";
import { startCleanupTask } from "./lib/cleanup";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Start auto-deletion cleanup task (3 days TTL)
if (process.env.NODE_ENV !== "test") {
  startCleanupTask();
}

if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

export default app;
