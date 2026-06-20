import { Router, type IRouter } from "express";
import { CreateAnalysisBody } from "../types/generated/api.js";
import { generateSeoAnalysis } from "../lib/seo-analyzer.js";
import {
  analysisQueue,
  analysisRateLimiter,
  QueueFullError,
} from "../lib/concurrency.js";
import { validatePublicUrl, UnsafeUrlError } from "../lib/url-guard.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  createAnalysisRecord,
  listAnalyses,
  getAnalysisById,
  deleteAnalysisRecord,
  getProjectById,
} from "../db/index.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const TIMEOUTS: Record<string, number> = {
  free: 60_000,
  pro: 30_000,
  enterprise: 120_000,
};

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then((val) => { clearTimeout(timer); resolve(val); }).catch((err) => { clearTimeout(timer); reject(err); });
  });
}

// ======================================================
// LIST ANALYSES
// ======================================================

router.get("/analyses", requireAuth, (req, res) => {
  const analyses = listAnalyses(req.user!.sub).map((a: any) => ({
    id: a.id,
    projectId: a.project_id || null,
    url: a.url,
    type: a.type,
    status: a.status,
    seoScore: a.seo_score,
    issueCount: a.issue_count,
    createdAt: a.created_at,
    completedAt: a.completed_at,
  }));
  res.json(analyses);
});

// ======================================================
// GET ANALYSIS DETAIL
// ======================================================

router.get("/analyses/:id", requireAuth, (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid analysis ID" }); return; }
  const record = getAnalysisById(id, req.user!.sub);
  if (!record) { res.status(404).json({ error: "Analysis not found" }); return; }
  const result = record.result ? JSON.parse(record.result) : {};
  res.json({
    id: record.id,
    projectId: record.project_id || null,
    url: record.url,
    type: record.type,
    status: record.status,
    seoScore: result.seoScore ?? record.seo_score,
    performanceScore: result.performanceScore ?? null,
    accessibilityScore: result.accessibilityScore ?? null,
    bestPracticesScore: result.bestPracticesScore ?? null,
    issueCount: record.issue_count,
    metaTitle: result.metaTitle ?? null,
    metaDescription: result.metaDescription ?? null,
    h1Count: result.h1Count ?? null,
    h2Count: result.h2Count ?? null,
    wordCount: result.wordCount ?? null,
    internalLinks: result.internalLinks ?? null,
    externalLinks: result.externalLinks ?? null,
    imagesMissingAlt: result.imagesMissingAlt ?? null,
    pageLoadScore: result.pageLoadScore ?? null,
    mobileScore: result.mobileScore ?? null,
    pageCount: result.pageCount ?? null,
    lcp: result.lcp ?? null,
    cls: result.cls ?? null,
    fcp: result.fcp ?? null,
    tti: result.tti ?? null,
    speedIndex: result.speedIndex ?? null,
    issues: result.issues ?? [],
    recommendations: result.recommendations ?? [],
    aiVisibility: result.aiVisibility ?? null,
    aiEngineReadiness: result.aiEngineReadiness ?? null,
    actionPlan: result.actionPlan ?? [],
    summary: result.summary ?? null,
    createdAt: record.created_at,
    completedAt: record.completed_at,
  });
});

// ======================================================
// DELETE ANALYSIS
// ======================================================

router.delete("/analyses/:id", requireAuth, (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid analysis ID" }); return; }
  deleteAnalysisRecord(id, req.user!.sub);
  res.status(204).end();
});

// ======================================================
// CREATE ANALYSIS
// ======================================================

router.post("/analyses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i: any) => i.message).join("; ") });
    return;
  }

  // Validate projectId belongs to user
  if (parsed.data.projectId != null) {
    const project = getProjectById(parsed.data.projectId, req.user!.sub);
    if (!project) {
      res.status(400).json({ error: "Project not found" });
      return;
    }
  }

  const ip = String(req.ip || "anonymous");

  if (parsed.data.type === "website") {
    try {
      await validatePublicUrl(parsed.data.url);
    } catch (err) {
      if (err instanceof UnsafeUrlError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(400).json({ error: "The URL could not be validated." });
      return;
    }
  }

  if (analysisRateLimiter.isRateLimited(`ip_${ip}`)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Please wait 60 seconds before starting another analysis.", retryAfter: 60 });
    return;
  }

  const plan = req.user!.plan || "free";
  const timeoutMs = TIMEOUTS[plan] || 60_000;

  // Enterprise users bypass the queue entirely
  const analysisPromise = plan === "enterprise"
    ? generateSeoAnalysis(parsed.data.url, parsed.data.type)
    : analysisQueue.add(() => generateSeoAnalysis(parsed.data.url, parsed.data.type));

  const start = Date.now();

  try {
    const stats = analysisQueue.getStats();
    res.setHeader("X-Queue-Depth", String(stats.pending));

    const result = await withTimeout(
      analysisPromise,
      timeoutMs,
      "Analysis request timed out. The target URL may be too slow to audit.",
    );

    const durationMs = Date.now() - start;
    res.setHeader("X-Analysis-Duration-Ms", String(durationMs));

    logger.info({ url: parsed.data.url, durationMs, performance: result.performanceScore }, "Analysis completed");

    // Save to DB
    const record = createAnalysisRecord(req.user!.sub, parsed.data.url, parsed.data.type, result, parsed.data.projectId ?? undefined);

    // Return the analysis record + full result for the client
    res.status(200).json({
      id: record.id,
      projectId: record.project_id || null,
      url: record.url,
      type: record.type,
      status: record.status,
      issueCount: record.issue_count,
      createdAt: record.created_at,
      completedAt: record.completed_at,
      ...result,
    });
  } catch (err: any) {
    const durationMs = Date.now() - start;

    if (err instanceof QueueFullError) {
      logger.warn({ url: parsed.data.url, queueStats: analysisQueue.getStats() }, "Queue full — rejecting request");
      res.setHeader("Retry-After", "30");
      res.status(503).json({ error: err.message, retryAfter: 30 });
      return;
    }

    if (err.message?.includes("timed out")) {
      logger.error({ url: parsed.data.url, durationMs }, "Analysis timed out");
      res.status(504).json({ error: err.message });
      return;
    }

    logger.error({ url: parsed.data.url, durationMs, error: err.message }, "Analysis failed");
    res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

export default router;
