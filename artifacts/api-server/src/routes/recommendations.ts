import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, recommendationsTable } from "@workspace/db";
import { ListRecommendationsQueryParams, DismissRecommendationParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/recommendations", async (req, res): Promise<void> => {
  const query = ListRecommendationsQueryParams.safeParse(req.query);

  let conditions = [];
  if (query.success) {
    if (query.data.analysisId) {
      conditions.push(eq(recommendationsTable.analysisId, query.data.analysisId));
    }
    if (query.data.priority) {
      conditions.push(eq(recommendationsTable.priority, query.data.priority));
    }
  }

  const recs = conditions.length > 0
    ? await db.select().from(recommendationsTable).where(and(...conditions)).orderBy(recommendationsTable.createdAt)
    : await db.select().from(recommendationsTable).orderBy(recommendationsTable.createdAt);

  res.json(recs.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.patch("/recommendations/:id/dismiss", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DismissRecommendationParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [rec] = await db
    .update(recommendationsTable)
    .set({ dismissed: true })
    .where(eq(recommendationsTable.id, params.data.id))
    .returning();

  if (!rec) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  res.json({ ...rec, createdAt: rec.createdAt.toISOString() });
});

export default router;
