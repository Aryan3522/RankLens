import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

import { logger } from "./logger.js";
import { chromePool, type PooledChrome } from "./browser-pool.js";

// ======================================================
// TYPES
// ======================================================

export interface LighthouseAuditDetail {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
}

export interface LighthouseMetricValues {
  lcpMs: number | null;
  fcpMs: number | null;
  clsValue: number | null;
  ttiMs: number | null;
  speedIndexMs: number | null;
  tbtMs: number | null;
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

  metrics: LighthouseMetricValues;

  failedAudits: LighthouseAuditDetail[];

  auditDurationMs: number;
}

// ======================================================
// RUN LIGHTHOUSE AUDIT
//
// Uses a pooled Chrome instance and the official
// Lighthouse desktop config preset to match Chrome
// DevTools Lighthouse as closely as possible.
//
// Key alignment with Chrome DevTools:
//   - formFactor: "desktop"
//   - throttling: desktopDense4G (simulated)
//   - screenEmulation: 1350×940 @1x
//   - emulatedUserAgent: Chrome desktop UA
//   - disableStorageReset: false (clears cache)
// ======================================================

const AUDIT_TIMEOUT_MS = 60_000; // 60s hard limit

export async function runLighthouseAudit(
  url: string,
): Promise<LighthouseAuditResult> {
  const start = Date.now();
  logger.info({ url }, "Starting Lighthouse audit");

  let instance: PooledChrome | null = null;

  try {
    // Acquire a Chrome instance from the pool
    instance = await chromePool.acquire(15_000);

    // Run Lighthouse with a timeout wrapper
    const runnerResult = await Promise.race([
      lighthouse(url, {
        port: instance.port,
        output: "json",
        logLevel: "error",

        // Use the official desktop config preset which includes:
        //   - formFactor: "desktop"
        //   - throttling: desktopDense4G (rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1)
        //   - screenEmulation: 1350×940 @1x
        //   - emulatedUserAgent: Chrome desktop UA
        ...desktopConfig,

        // Override settings within the preset
        settings: {
          ...(desktopConfig as any).settings,

          // Match Chrome DevTools defaults
          maxWaitForLoad: 25_000,       // Lighthouse CLI default (was 45s)
          disableStorageReset: false,    // Clear cache between runs like DevTools

          onlyCategories: [
            "seo",
            "performance",
            "accessibility",
            "best-practices",
          ],
        },
      } as any),
      rejectAfter(AUDIT_TIMEOUT_MS, "Lighthouse audit timed out"),
    ]);

    if (!runnerResult || typeof runnerResult === "string") {
      throw new Error("Lighthouse returned no result");
    }

    const { categories, audits } = (runnerResult as any).lhr;
    const auditDurationMs = Date.now() - start;

    // --------------------------------------------------
    // FAILED AUDITS
    // --------------------------------------------------

    const failedAudits = Object.values(audits)
      .filter((audit: any) => {
        return (
          audit.score !== null &&
          ["binary", "numeric"].includes(audit.scoreDisplayMode) &&
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

    // --------------------------------------------------
    // EXTRACT RAW METRIC VALUES
    // --------------------------------------------------

    const metrics: LighthouseMetricValues = {
      lcpMs: (audits["largest-contentful-paint"] as any)?.numericValue ?? null,
      fcpMs: (audits["first-contentful-paint"] as any)?.numericValue ?? null,
      clsValue: (audits["cumulative-layout-shift"] as any)?.numericValue ?? null,
      ttiMs: (audits["interactive"] as any)?.numericValue ?? null,
      speedIndexMs: (audits["speed-index"] as any)?.numericValue ?? null,
      tbtMs: (audits["total-blocking-time"] as any)?.numericValue ?? null,
    };

    // --------------------------------------------------
    // FINAL RESULT
    // --------------------------------------------------

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
        (audits["largest-contentful-paint"] as any)
          ?.displayValue || "N/A",

      cls:
        (audits["cumulative-layout-shift"] as any)
          ?.displayValue || "N/A",

      fcp:
        (audits["first-contentful-paint"] as any)
          ?.displayValue || "N/A",

      tti:
        (audits["interactive"] as any)?.displayValue ||
        "N/A",

      speedIndex:
        (audits["speed-index"] as any)?.displayValue ||
        "N/A",

      metrics,

      failedAudits,

      auditDurationMs,
    };

    logger.info(
      {
        url,
        performance: result.performanceScore,
        seo: result.seoScore,
        auditDurationMs,
      },
      "Lighthouse completed",
    );

    return result;
  } catch (error) {
    const auditDurationMs = Date.now() - start;

    logger.error(
      {
        url,
        auditDurationMs,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      "Lighthouse failed",
    );

    throw error;
  } finally {
    // Release Chrome instance back to pool (NOT killed)
    if (instance) {
      chromePool.release(instance);
    }
  }
}

// ======================================================
// HELPERS
// ======================================================

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms),
  );
}