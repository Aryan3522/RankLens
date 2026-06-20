import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, requirePlan } from "../middlewares/auth.js";
import {
  createSite,
  getUserSites,
  getSiteById,
  deleteSite,
  verifySite,
  createSubmission,
  getUserSubmissions,
  getSubmissionStats,
  getDetailedSubmissionStats,
  updateSubmissionStatus,
} from "../db/index.js";
import { submitUrl } from "../lib/indexnow-service.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// All indexing routes require auth + Pro or Enterprise plan
router.use(requireAuth, requirePlan("pro", "enterprise"));

const addSiteSchema = z.object({
  domain: z.string().min(1).max(255),
});

const submitUrlSchema = z.object({
  url: z.string().trim().url(),
  platform: z.string().min(1),
  googleCreds: z.any().optional(),
});

// List user's sites
router.get("/sites", (req, res) => {
  const sites = getUserSites(req.user!.sub);
  res.json(sites);
});

// Add a site
router.post("/sites", (req, res) => {
  const parsed = addSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Domain is required" });
    return;
  }
  try {
    const site = createSite(req.user!.sub, parsed.data.domain);
    res.status(201).json(site);
  } catch {
    res.status(500).json({ error: "Failed to add site" });
  }
});

// Delete a site
router.delete("/sites/:id", (req, res) => {
  const id = req.params.id as string;
  const site = getSiteById(id);
  if (!site) {
    res.status(404).json({ error: "Site not found" });
    return;
  }
  if (site.user_id !== req.user!.sub) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  deleteSite(id);
  res.status(204).end();
});

// Verify a site
router.post("/sites/:id/verify", (req, res) => {
  const id = req.params.id as string;
  const site = getSiteById(id);
  if (!site) {
    res.status(404).json({ error: "Site not found" });
    return;
  }
  if (site.user_id !== req.user!.sub) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  const updated = verifySite(id);
  res.json(updated);
});

// Get submissions
router.get("/submissions", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const submissions = getUserSubmissions(req.user!.sub, limit);
  const stats = getSubmissionStats(req.user!.sub);
  res.json({ submissions, stats });
});

// Detailed submission stats
router.get("/submissions/stats", (req, res) => {
  const stats = getDetailedSubmissionStats(req.user!.sub);
  res.json(stats);
});

// Submit a URL
router.post("/submit", async (req, res) => {
  const parsed = submitUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.error({ body: req.body, errors: parsed.error.issues }, "[/submit] Zod validation failed");
    res.status(400).json({ error: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") });
    return;
  }

  const { url, platform, googleCreds } = parsed.data;

  try {
    const result = await submitUrl(url, platform, googleCreds);

    const subs = result.submissions || [result];

    const created = subs.map((s: any) => {
      const sub = createSubmission(req.user!.sub, url, s.platform, undefined);
      updateSubmissionStatus(sub.id, s.success ? "success" : "failed", s.message);
      return sub;
    });

    res.json({
      id: created[0]?.id,
      platform: result.platform,
      success: result.success,
      message: result.message,
      submissions: subs,
    });
  } catch (err: any) {
    const submission = createSubmission(req.user!.sub, url, platform, undefined);
    updateSubmissionStatus(submission.id, "failed", err.message);
    res.status(500).json({ error: err.message || "Submission failed" });
  }
});

export default router;
