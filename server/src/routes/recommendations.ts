import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, recommendationsTable, analysesTable } from "../db/index.js";
import { ListRecommendationsQueryParams, DismissRecommendationParams } from "../types/generated/api.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/recommendations", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const query = ListRecommendationsQueryParams.safeParse(req.query);

  let conditions: any[] = [eq(analysesTable.userId, user.id)];
  if (query.success) {
    if (query.data.analysisId) {
      conditions.push(eq(recommendationsTable.analysisId, query.data.analysisId));
    }
    if (query.data.priority) {
      conditions.push(eq(recommendationsTable.priority, query.data.priority));
    }
  }

  const recs = await db
    .select({
      id: recommendationsTable.id,
      analysisId: recommendationsTable.analysisId,
      priority: recommendationsTable.priority,
      category: recommendationsTable.category,
      title: recommendationsTable.title,
      description: recommendationsTable.description,
      impact: recommendationsTable.estimatedImpact,
      dismissed: recommendationsTable.dismissed,
      createdAt: recommendationsTable.createdAt,
    })
    .from(recommendationsTable)
    .innerJoin(analysesTable, eq(recommendationsTable.analysisId, analysesTable.id))
    .where(and(...conditions))
    .orderBy(recommendationsTable.createdAt);

  res.json(recs.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.patch("/recommendations/:id/dismiss", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DismissRecommendationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify ownership
  const [existing] = await db
    .select()
    .from(recommendationsTable)
    .innerJoin(analysesTable, eq(recommendationsTable.analysisId, analysesTable.id))
    .where(and(eq(recommendationsTable.id, params.data.id), eq(analysesTable.userId, user.id)));

  if (!existing) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  const [rec] = await db
    .update(recommendationsTable)
    .set({ dismissed: true })
    .where(eq(recommendationsTable.id, params.data.id))
    .returning();

  res.json({ ...rec, createdAt: rec.createdAt.toISOString() });
});

export default router;
