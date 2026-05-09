import { Router, type IRouter } from "express";
import { CreateAnalysisBody } from "../types/generated/api.js";
import { generateSeoAnalysis } from "../lib/seo-analyzer.js";
import { analysisQueue, analysisRateLimiter } from "../lib/concurrency.js";

const router: IRouter = Router();

router.post("/analyses", async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Rate Limiting by IP
  const ip = req.ip || "anonymous";
  if (analysisRateLimiter.isRateLimited(`ip_${ip}`)) {
    res.status(429).json({ error: "Analysis limit reached. Please wait." });
    return;
  }

  try {
    const result = await analysisQueue.add(() => 
      generateSeoAnalysis(parsed.data.url, parsed.data.type)
    );
    res.status(200).json(result);
  } catch (err: any) {
    console.error("Analysis failed:", err);
    res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

export default router;
