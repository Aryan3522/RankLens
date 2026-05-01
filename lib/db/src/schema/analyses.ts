import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  type: text("type").notNull().default("website"),
  status: text("status").notNull().default("pending"),
  seoScore: integer("seo_score"),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
