import { Router, type IRouter } from "express";
import { CreateAnalysisBody } from "../types/generated/api.js";
import { generateSeoAnalysis } from "../lib/seo-analyzer.js";
import {
  analysisQueue,
  analysisRateLimiter,
} from "../lib/concurrency.js";

const router: IRouter = Router();

// ======================================================
// HANDLE PREFLIGHT REQUESTS
// ======================================================

router.options("/analyses", (req, res) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://rank-lens-delta.vercel.app"
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  res.header(
    "Access-Control-Allow-Credentials",
    "true"
  );

  return res.sendStatus(200);
});

// ======================================================
// CREATE ANALYSIS
// ======================================================

router.post("/analyses", async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.message,
    });

    return;
  }

  // ======================================================
  // RATE LIMITING
  // ======================================================

  const ip = req.ip || "anonymous";

  if (analysisRateLimiter.isRateLimited(`ip_${ip}`)) {
    res.status(429).json({
      error: "Analysis limit reached. Please wait.",
    });

    return;
  }

  try {
    const result = await analysisQueue.add(() =>
      generateSeoAnalysis(
        parsed.data.url,
        parsed.data.type
      )
    );

    res.status(200).json(result);
  } catch (err: any) {
    console.error("Analysis failed:", err);

    res.status(500).json({
      error: err.message || "Analysis failed",
    });
  }
});

export default router;