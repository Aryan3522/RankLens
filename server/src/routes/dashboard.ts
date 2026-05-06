import { Router, type IRouter } from "express";
import { eq, count, avg, and, desc } from "drizzle-orm";
import { db, projectsTable, analysesTable, keywordsTable, recommendationsTable, seoIssuesTable } from "../db";
import { GetScoreTrendQueryParams } from "../types/generated/api";
import { isAuthenticated } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const [projectCount] = await db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.userId, user.id));
  const [analysisCount] = await db.select({ count: count() }).from(analysesTable).where(eq(analysesTable.userId, user.id));
  const [keywordCount] = await db.select({ count: count() }).from(keywordsTable).where(eq(keywordsTable.userId, user.id));

  const [avgScore] = await db
    .select({ avg: avg(analysesTable.seoScore) })
    .from(analysesTable)
    .where(and(eq(analysesTable.status, "completed"), eq(analysesTable.userId, user.id)));

  const [criticalCount] = await db
    .select({ count: count() })
    .from(seoIssuesTable)
    .innerJoin(analysesTable, eq(seoIssuesTable.analysisId, analysesTable.id))
    .where(and(eq(seoIssuesTable.severity, "critical"), eq(analysesTable.userId, user.id)));

  const [pendingCount] = await db
    .select({ count: count() })
    .from(analysesTable)
    .where(and(eq(analysesTable.status, "pending"), eq(analysesTable.userId, user.id)));

  const [pendingRecs] = await db
    .select({ count: count() })
    .from(recommendationsTable)
    .innerJoin(analysesTable, eq(recommendationsTable.analysisId, analysesTable.id))
    .where(and(eq(recommendationsTable.dismissed, false), eq(analysesTable.userId, user.id)));

  const topProjects = await db
    .select({ name: projectsTable.name, score: analysesTable.seoScore })
    .from(projectsTable)
    .leftJoin(analysesTable, eq(analysesTable.projectId, projectsTable.id))
    .where(eq(projectsTable.userId, user.id))
    .orderBy(desc(analysesTable.seoScore))
    .limit(1);

  res.json({
    totalProjects: projectCount?.count ?? 0,
    totalAnalyses: analysisCount?.count ?? 0,
    totalKeywords: keywordCount?.count ?? 0,
    avgSeoScore: avgScore?.avg ? Math.round(Number(avgScore.avg)) : null,
    criticalIssues: criticalCount?.count ?? 0,
    pendingAnalyses: pendingCount?.count ?? 0,
    topPerformingProject: topProjects[0]?.name ?? null,
    recommendationsPending: pendingRecs?.count ?? 0,
  });
});

router.get("/dashboard/score-trend", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const query = GetScoreTrendQueryParams.safeParse(req.query);

  let conditions = [eq(analysesTable.status, "completed"), eq(analysesTable.userId, user.id)];
  if (query.success && query.data.projectId) {
    conditions.push(eq(analysesTable.projectId, query.data.projectId));
  }

  const rows = await db
    .select({
      seoScore: analysesTable.seoScore,
      completedAt: analysesTable.completedAt,
      projectName: projectsTable.name,
    })
    .from(analysesTable)
    .leftJoin(projectsTable, eq(analysesTable.projectId, projectsTable.id))
    .where(and(...conditions))
    .orderBy(analysesTable.completedAt)
    .limit(60);

  res.json(rows.map(r => ({
    date: r.completedAt?.toISOString().split("T")[0] ?? new Date().toISOString().split("T")[0],
    score: r.seoScore ?? 0,
    projectName: r.projectName ?? "Unknown",
  })));
});

router.get("/dashboard/recent-activity", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const analyses = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.userId, user.id))
    .orderBy(desc(analysesTable.createdAt))
    .limit(5);

  const keywords = await db
    .select()
    .from(keywordsTable)
    .where(eq(keywordsTable.userId, user.id))
    .orderBy(desc(keywordsTable.createdAt))
    .limit(3);

  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id))
    .orderBy(desc(projectsTable.createdAt))
    .limit(3);

  const items = [
    ...analyses.map(a => ({
      id: a.id * 10,
      type: "analysis" as const,
      description: `Analysis ${a.status}: ${a.url}`,
      url: a.url,
      createdAt: a.createdAt.toISOString(),
    })),
    ...keywords.map(k => ({
      id: k.id * 10 + 1,
      type: "keyword" as const,
      description: `Keyword tracked: "${k.keyword}"`,
      url: null,
      createdAt: k.createdAt.toISOString(),
    })),
    ...projects.map(p => ({
      id: p.id * 10 + 2,
      type: "project" as const,
      description: `Project created: ${p.name}`,
      url: null,
      createdAt: p.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  res.json(items);
});

router.get("/dashboard/issue-breakdown", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const issues = await db
    .select({
      category: seoIssuesTable.category,
      severity: seoIssuesTable.severity,
    })
    .from(seoIssuesTable)
    .innerJoin(analysesTable, eq(seoIssuesTable.analysisId, analysesTable.id))
    .where(eq(analysesTable.userId, user.id));

  const breakdown: Record<string, { count: number; severity: string }> = {};
  for (const issue of issues) {
    const key = issue.category;
    if (!breakdown[key]) {
      breakdown[key] = { count: 0, severity: issue.severity };
    }
    breakdown[key].count++;
  }

  res.json(
    Object.entries(breakdown).map(([category, data]) => ({
      category,
      count: data.count,
      severity: data.severity,
    }))
  );
});

export default router;
