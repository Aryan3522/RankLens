import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

import { logger } from "./logger.js";

export interface LighthouseAuditDetail {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
}

export interface LighthouseAuditResult {
  seoScore: number;
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;

  lcp: string;
  cls: string;
  fcp: string;
  tti: string;
  speedIndex: string;

  failedAudits: LighthouseAuditDetail[];
}

/**
 * Run Lighthouse audit
 */
export async function runLighthouseAudit(
  url: string,
): Promise<LighthouseAuditResult> {
  logger.info(
    { url },
    "Starting Lighthouse audit",
  );

  let chrome:
    | Awaited<
        ReturnType<typeof chromeLauncher.launch>
      >
    | undefined;

  try {
    // ======================================================
    // LAUNCH CHROME
    // ======================================================

    chrome = await chromeLauncher.launch({
      chromeFlags: [
        "--headless=new",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--mute-audio",
      ],
    });

    // ======================================================
    // LIGHTHOUSE OPTIONS
    // ======================================================

    const options = {
      logLevel: "error" as const,

      output: "json" as const,

      onlyCategories: [
        "seo",
        "performance",
        "accessibility",
        "best-practices",
      ],

      port: chrome.port,
    };

    // ======================================================
    // RUN LIGHTHOUSE
    // ======================================================

    const runnerResult = await lighthouse(
      url,
      options,
    );

    if (!runnerResult) {
      throw new Error(
        "Lighthouse audit failed to produce a result",
      );
    }

    const { categories, audits } =
      runnerResult.lhr;

    // ======================================================
    // FAILED AUDITS
    // ======================================================

    const failedAudits: LighthouseAuditDetail[] =
      Object.values(audits)
        .filter((audit: any) => {
          return (
            audit.score !== null &&
            audit.score < 0.9 &&
            audit.id !== "service-worker"
          );
        })
        .map((audit: any) => ({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue,
        }));

    // ======================================================
    // FINAL RESULT
    // ======================================================

    const result: LighthouseAuditResult = {
      seoScore: Math.round(
        (categories.seo?.score || 0) * 100,
      ),

      performanceScore: Math.round(
        (categories.performance?.score ||
          0) * 100,
      ),

      accessibilityScore: Math.round(
        (categories.accessibility?.score ||
          0) * 100,
      ),

      bestPracticesScore: Math.round(
        (categories["best-practices"]
          ?.score || 0) * 100,
      ),

      lcp:
        audits[
          "largest-contentful-paint"
        ]?.displayValue || "N/A",

      cls:
        audits[
          "cumulative-layout-shift"
        ]?.displayValue || "N/A",

      fcp:
        audits[
          "first-contentful-paint"
        ]?.displayValue || "N/A",

      tti:
        audits["interactive"]
          ?.displayValue || "N/A",

      speedIndex:
        audits["speed-index"]
          ?.displayValue || "N/A",

      failedAudits,
    };

    logger.info(
      {
        url,
        seo: result.seoScore,
        performance:
          result.performanceScore,
        accessibility:
          result.accessibilityScore,
        bestPractices:
          result.bestPracticesScore,
        failedAuditCount:
          failedAudits.length,
      },
      "Lighthouse audit completed",
    );

    return result;
  } catch (error) {
    logger.error(
      {
        url,
        error: String(error),
      },
      "Lighthouse audit failed",
    );

    throw error;
  } finally {
    // ======================================================
    // CLEANUP CHROME
    // ======================================================

    if (chrome) {
      try {
        await chrome.kill();

        logger.info(
          { url },
          "Chrome instance closed",
        );
      } catch (killError) {
        logger.warn(
          {
            killError,
          },
          "Failed to kill Chrome instance",
        );
      }
    }
  }
}