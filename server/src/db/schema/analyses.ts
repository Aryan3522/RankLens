import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects.js";
import { usersTable } from "./users.js";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: text("type").notNull().default("website"),
  status: text("status", { enum: ["pending", "queued", "running", "completed", "failed"] }).notNull().default("pending"),
  seoScore: integer("seo_score"),
  performanceScore: integer("performance_score"),
  accessibilityScore: integer("accessibility_score"),
  bestPracticesScore: integer("best_practices_score"),
  issueCount: integer("issue_count"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  h1Count: integer("h1_count"),
  h2Count: integer("h2_count"),
  wordCount: integer("word_count"),
  internalLinks: integer("internal_links"),
  externalLinks: integer("external_links"),
  imagesMissingAlt: integer("images_missing_alt"),
  pageLoadScore: integer("page_load_score"),
  mobileScore: integer("mobile_score"),
  pageCount: integer("page_count").default(1),
  lcp: text("lcp"),
  cls: text("cls"),
  fcp: text("fcp"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("analyses_user_id_idx").on(table.userId),
  projectIdIdx: index("analyses_project_id_idx").on(table.projectId),
}));

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
