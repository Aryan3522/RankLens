import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, keywordsTable, keywordRankHistoryTable } from "../db/index.js";
import { CreateKeywordBody, ListKeywordsQueryParams, DeleteKeywordParams, GetKeywordHistoryParams } from "../types/generated/api.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/keywords", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const query = ListKeywordsQueryParams.safeParse(req.query);

  let conditions: any[] = [eq(keywordsTable.userId, user.id)];
  if (query.success && query.data.projectId) {
    conditions.push(eq(keywordsTable.projectId, query.data.projectId));
  }

  const keywords = await db
    .select()
    .from(keywordsTable)
    .where(and(...conditions))
    .orderBy(keywordsTable.createdAt);

  res.json(keywords.map(k => ({
    ...k,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  })));
});

router.post("/keywords", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const parsed = CreateKeywordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [keyword] = await db
    .insert(keywordsTable)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  await db.insert(keywordRankHistoryTable).values({
    keywordId: keyword.id,
    rank: keyword.currentRank,
  });

  res.status(201).json({
    ...keyword,
    createdAt: keyword.createdAt.toISOString(),
    updatedAt: keyword.updatedAt.toISOString(),
  });
});

router.delete("/keywords/:id", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteKeywordParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [keyword] = await db
    .delete(keywordsTable)
    .where(and(eq(keywordsTable.id, params.data.id), eq(keywordsTable.userId, user.id)))
    .returning();

  if (!keyword) {
    res.status(404).json({ error: "Keyword not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/keywords/:id/history", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetKeywordHistoryParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify ownership via keywordsTable
  const [keyword] = await db
    .select()
    .from(keywordsTable)
    .where(and(eq(keywordsTable.id, params.data.id), eq(keywordsTable.userId, user.id)));

  if (!keyword) {
    res.status(404).json({ error: "Keyword not found" });
    return;
  }

  const history = await db
    .select()
    .from(keywordRankHistoryTable)
    .where(eq(keywordRankHistoryTable.keywordId, keyword.id))
    .orderBy(keywordRankHistoryTable.recordedAt);

  res.json(history.map(h => ({
    ...h,
    recordedAt: h.recordedAt.toISOString(),
  })));
});

export default router;
