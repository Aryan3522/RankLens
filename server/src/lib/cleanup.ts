import { db, analysesTable, projectsTable } from "../db";
import { lt } from "drizzle-orm";
import { logger } from "./logger";

export function startCleanupTask() {
  // Run every hour
  setInterval(async () => {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      logger.info("Running database cleanup task...");

      // Delete old analyses
      const deletedAnalyses = await db
        .delete(analysesTable)
        .where(lt(analysesTable.createdAt, threeDaysAgo))
        .returning();

      if (deletedAnalyses.length > 0) {
        logger.info(`Deleted ${deletedAnalyses.length} old analyses.`);
      }

      // If the user meant EVERYTHING including projects:
      const deletedProjects = await db
        .delete(projectsTable)
        .where(lt(projectsTable.createdAt, threeDaysAgo))
        .returning();

      if (deletedProjects.length > 0) {
        logger.info(`Deleted ${deletedProjects.length} old projects.`);
      }

    } catch (err) {
      logger.error({ err }, "Error during database cleanup");
    }
  }, 60 * 60 * 1000); // 1 hour
}
