import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { analysesTable } from "@/db/schema/analyses.js";

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull().references(() => analysesTable.id, { onDelete: "cascade" }),
  priority: text("priority").notNull().default("medium"),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  estimatedImpact: integer("estimated_impact").notNull().default(0),
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  analysisIdIdx: index("recommendations_analysis_id_idx").on(table.analysisId),
}));

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({ id: true, createdAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
