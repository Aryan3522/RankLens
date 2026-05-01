import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { analysesTable } from "./analyses";

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
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({ id: true, createdAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
