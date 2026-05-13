import lighthouse from "lighthouse";
import { launch, type LaunchedChrome } from "chrome-launcher";
import chromium from "@sparticuz/chromium";

import { logger } from "./logger.js";
import { env } from "./env.js";

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

export async function runLighthouseAudit(
  url: string,
): Promise<LighthouseAuditResult> {
  logger.info({ url }, "Starting Lighthouse audit");

  let chrome: LaunchedChrome | null = null;

  try {
    /**
     * ======================================================
     * CHROME EXECUTABLE
     * ======================================================
     */

    const isProduction = env.NODE_ENV === "production";

    let chromePath: string | undefined;

    if (isProduction) {
      chromePath =
        process.env.CHROME_PATH ||
        (await chromium.executablePath());
    }

    /**
     * ======================================================
     * LAUNCH CHROME
     * ======================================================
     */

    chrome = await launch({
      chromePath,

      chromeFlags: [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
      ],
    });

    /**
     * ======================================================
     * RUN LIGHTHOUSE
     * ======================================================
     */

    const runnerResult = await lighthouse(url, {
      port: chrome.port,

      output: "json",

      logLevel: "error",

      maxWaitForLoad: 45000,

      disableStorageReset: true,

      formFactor: "desktop",

      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },

      onlyCategories: [
        "seo",
        "performance",
        "accessibility",
        "best-practices",
      ],
    });

    if (!runnerResult) {
      throw new Error("Lighthouse returned no result");
    }

    const { categories, audits } = runnerResult.lhr;

    /**
     * ======================================================
     * FAILED AUDITS
     * ======================================================
     */

    const failedAudits = Object.values(audits)
      .filter((audit: any) => {
        return (
          audit.score !== null &&
          ["binary", "numeric"].includes(
            audit.scoreDisplayMode,
          ) &&
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

    /**
     * ======================================================
     * FINAL RESULT
     * ======================================================
     */

    const result: LighthouseAuditResult = {
      seoScore: Math.round(
        (categories.seo?.score || 0) * 100,
      ),

      performanceScore: Math.round(
        (categories.performance?.score || 0) * 100,
      ),

      accessibilityScore: Math.round(
        (categories.accessibility?.score || 0) * 100,
      ),

      bestPracticesScore: Math.round(
        (categories["best-practices"]?.score || 0) * 100,
      ),

      lcp:
        audits["largest-contentful-paint"]
          ?.displayValue || "N/A",

      cls:
        audits["cumulative-layout-shift"]
          ?.displayValue || "N/A",

      fcp:
        audits["first-contentful-paint"]
          ?.displayValue || "N/A",

      tti:
        audits["interactive"]?.displayValue ||
        "N/A",

      speedIndex:
        audits["speed-index"]?.displayValue ||
        "N/A",

      failedAudits,
    };

    logger.info(
      {
        url,
        performance: result.performanceScore,
      },
      "Lighthouse completed",
    );

    return result;
  } catch (error) {
    console.error("LIGHTHOUSE ERROR:", error);

    logger.error(
      {
        url,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      "Lighthouse failed",
    );

    throw error;
  } finally {
    /**
     * ======================================================
     * CLEANUP
     * ======================================================
     */

    if (chrome) {
      try {
        await chrome.kill();
      } catch {
        logger.warn(
          "Failed to kill Chrome process",
        );
      }
    }
  }
}