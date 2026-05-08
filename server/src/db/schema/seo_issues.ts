import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { analysesTable } from "./analyses.js";

export const seoIssuesTable = pgTable("seo_issues", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull().references(() => analysesTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  severity: text("severity").notNull().default("warning"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedUrl: text("affected_url"),
  element: text("element"),
  lineNumber: integer("line_number"),
  fixExample: text("fix_example"),
  helpUrl: text("help_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  analysisIdIdx: index("seo_issues_analysis_id_idx").on(table.analysisId),
}));

export const insertSeoIssueSchema = createInsertSchema(seoIssuesTable).omit({ id: true, createdAt: true });
export type InsertSeoIssue = z.infer<typeof insertSeoIssueSchema>;
export type SeoIssue = typeof seoIssuesTable.$inferSelect;
