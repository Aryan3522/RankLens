import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, analysesTable, seoIssuesTable, recommendationsTable } from "../db/index.js";
import {
  CreateAnalysisBody,
  GetAnalysisParams,
  ListAnalysesQueryParams,
  RerunAnalysisParams,
} from "../types/generated/api.js";
import { generateSeoAnalysis } from "../lib/seo-analyzer.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/analyses", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const query = ListAnalysesQueryParams.safeParse(req.query);

  let conditions: any[] = [eq(analysesTable.userId, user.id)];
  if (query.success) {
    if (query.data.projectId) {
      conditions.push(eq(analysesTable.projectId, query.data.projectId));
    }
    if (query.data.type) {
      conditions.push(eq(analysesTable.type, query.data.type));
    }
  }

  const analyses = await db
    .select()
    .from(analysesTable)
    .where(and(...conditions))
    .orderBy(analysesTable.createdAt);

  res.json(analyses.map(a => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
  })));
});

router.post("/analyses", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [analysis] = await db.insert(analysesTable).values({
    userId: user.id,
    url: parsed.data.url,
    type: parsed.data.type,
    projectId: parsed.data.projectId ?? null,
    status: "running",
  }).returning();

  runAnalysisAsync(analysis.id, parsed.data.url, parsed.data.type);

  res.status(201).json({
    ...analysis,
    createdAt: analysis.createdAt.toISOString(),
    completedAt: null,
  });
});

router.get("/analyses/:id", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAnalysisParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(and(eq(analysesTable.id, params.data.id), eq(analysesTable.userId, user.id)));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  const issues = await db.select().from(seoIssuesTable).where(eq(seoIssuesTable.analysisId, analysis.id));
  const recommendations = await db.select().from(recommendationsTable).where(eq(recommendationsTable.analysisId, analysis.id));

  res.json({
    ...analysis,
    issues: issues.map(({ createdAt: _c, ...rest }) => rest),
    recommendations: recommendations.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    createdAt: analysis.createdAt.toISOString(),
    completedAt: analysis.completedAt?.toISOString() ?? null,
  });
});

router.delete("/analyses/:id", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(analysesTable)
    .where(and(eq(analysesTable.id, id), eq(analysesTable.userId, user.id)));

  if (!existing) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  await db.delete(seoIssuesTable).where(eq(seoIssuesTable.analysisId, id));
  await db.delete(recommendationsTable).where(eq(recommendationsTable.analysisId, id));
  await db.delete(analysesTable).where(eq(analysesTable.id, id));

  res.status(204).end();
});

router.post("/analyses/:id/rerun", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RerunAnalysisParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(analysesTable)
    .where(and(eq(analysesTable.id, params.data.id), eq(analysesTable.userId, user.id)));

  if (!existing) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  await db.delete(seoIssuesTable).where(eq(seoIssuesTable.analysisId, existing.id));
  await db.delete(recommendationsTable).where(eq(recommendationsTable.analysisId, existing.id));

  const [updated] = await db
    .update(analysesTable)
    .set({ status: "running", completedAt: null, seoScore: null, issueCount: null })
    .where(eq(analysesTable.id, existing.id))
    .returning();

  runAnalysisAsync(updated.id, updated.url, updated.type);

  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    completedAt: null,
  });
});

async function runAnalysisAsync(analysisId: number, url: string, type: string) {
  try {
    const result = await generateSeoAnalysis(url, type);

    await db.update(analysesTable).set({
      status: "completed",
      seoScore: result.seoScore,
      issueCount: result.issues.length,
      metaTitle: result.metaTitle,
      metaDescription: result.metaDescription,
      h1Count: result.h1Count,
      h2Count: result.h2Count,
      wordCount: result.wordCount,
      internalLinks: result.internalLinks,
      externalLinks: result.externalLinks,
      imagesMissingAlt: result.imagesMissingAlt,
      pageLoadScore: result.pageLoadScore,
      mobileScore: result.mobileScore,
      completedAt: new Date(),
    }).where(eq(analysesTable.id, analysisId));

    if (result.issues.length > 0) {
      await db.insert(seoIssuesTable).values(result.issues.map(i => ({ ...i, analysisId })));
    }

    if (result.recommendations.length > 0) {
      await db.insert(recommendationsTable).values(result.recommendations.map(r => ({ ...r, analysisId })));
    }
  } catch {
    await db.update(analysesTable).set({ status: "failed" }).where(eq(analysesTable.id, analysisId));
  }
}

export default router;
