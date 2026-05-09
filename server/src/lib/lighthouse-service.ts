import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { logger } from './logger.js';

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
  failedAudits: LighthouseAuditDetail[];
}

/**
 * Runs a Lighthouse audit on a given URL.
 */
export async function runLighthouseAudit(url: string): Promise<LighthouseAuditResult> {
  logger.info({ url }, "Starting Lighthouse audit");
  
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    const options = {
      logLevel: 'info' as const,
      output: 'json' as const,
      onlyCategories: ['seo', 'performance', 'accessibility', 'best-practices'],
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options);

    if (!runnerResult) {
      throw new Error("Lighthouse audit failed to produce a result");
    }

    const { categories, audits } = runnerResult.lhr;

    // Extract failed audits (score < 0.9)
    const failedAudits: LighthouseAuditDetail[] = Object.values(audits)
      .filter(audit => audit.score !== null && audit.score < 0.9 && audit.id !== 'service-worker') // Filter out passing/irrelevant ones
      .map(audit => ({
        id: audit.id,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue,
      }));

    const result: LighthouseAuditResult = {
      seoScore: Math.round((categories.seo?.score || 0) * 100),
      performanceScore: Math.round((categories.performance?.score || 0) * 100),
      accessibilityScore: Math.round((categories.accessibility?.score || 0) * 100),
      bestPracticesScore: Math.round((categories['best-practices']?.score || 0) * 100),
      lcp: audits['largest-contentful-paint']?.displayValue || "N/A",
      cls: audits['cumulative-layout-shift']?.displayValue || "N/A",
      fcp: audits['first-contentful-paint']?.displayValue || "N/A",
      failedAudits,
    };

    // USER REQUEST: Print the performance score AND the count of failed audits to confirm it's working
    console.log(`[DEBUG] Lighthouse Results for ${url}:`);
    console.log(`- Performance: ${result.performanceScore}`);
    console.log(`- SEO: ${result.seoScore}`);
    console.log(`- Accessibility: ${result.accessibilityScore}`);
    console.log(`- Best Practices: ${result.bestPracticesScore}`);
    console.log(`- Failed Audits Count: ${failedAudits.length}`);

    if (result.performanceScore === 100 && failedAudits.length === 0) {
      logger.warn({ url }, "Lighthouse returned a perfect score with zero failures. This might indicate the page is blank or blocked.");
    }

    return result;
  } catch (error) {
    logger.error({ url, error: String(error) }, "Lighthouse audit failed");
    throw error;
  } finally {
    if (chrome) {
      try {
        await chrome.kill();
      } catch (killError) {
        logger.warn({ killError }, "Failed to kill Chrome instance");
      }
    }
  }
}
