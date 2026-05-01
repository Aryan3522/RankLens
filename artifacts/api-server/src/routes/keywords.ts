import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, keywordsTable, keywordRankHistoryTable } from "@workspace/db";
import { CreateKeywordBody, ListKeywordsQueryParams, DeleteKeywordParams, GetKeywordHistoryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/keywords", async (req, res): Promise<void> => {
  const query = ListKeywordsQueryParams.safeParse(req.query);
  let keywords;

  if (query.success && query.data.projectId) {
    keywords = await db.select().from(keywordsTable).where(eq(keywordsTable.projectId, query.data.projectId)).orderBy(keywordsTable.createdAt);
  } else {
    keywords = await db.select().from(keywordsTable).orderBy(keywordsTable.createdAt);
  }

  res.json(keywords.map(k => ({
    ...k,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  })));
});

router.post("/keywords", async (req, res): Promise<void> => {
  const parsed = CreateKeywordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [keyword] = await db.insert(keywordsTable).values(parsed.data).returning();

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

router.delete("/keywords/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteKeywordParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [keyword] = await db.delete(keywordsTable).where(eq(keywordsTable.id, params.data.id)).returning();
  if (!keyword) {
    res.status(404).json({ error: "Keyword not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/keywords/:id/history", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetKeywordHistoryParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const history = await db
    .select()
    .from(keywordRankHistoryTable)
    .where(eq(keywordRankHistoryTable.keywordId, params.data.id))
    .orderBy(keywordRankHistoryTable.recordedAt);

  res.json(history.map(h => ({
    ...h,
    recordedAt: h.recordedAt.toISOString(),
  })));
});

export default router;
