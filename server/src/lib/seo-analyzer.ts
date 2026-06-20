import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

import { logger } from "./logger.js";

import { validatePublicUrl, UnsafeUrlError } from "./url-guard.js";
import { chromePool } from "./browser-pool.js";

import {
  runLighthouseAudit,
  type LighthouseAuditResult,
} from "./lighthouse-service.js";

import {
  analyzeAiVisibility,
  type AiVisibilityResult,
  type AiCategory,
  type AiEngineReadiness,
} from "./ai-visibility-analyzer.js";

import {
  enhanceWithLlm,
  isLlmEnabled,
  type LlmEnhancement,
  type AnalysisDigest,
} from "./llm-insights.js";

interface IssueDetail {
  category: string;

  severity:
    | "critical"
    | "warning"
    | "info";

  title: string;

  description: string;

  whyItMatters: string | null;

  affectedUrl: string | null;

  element: string | null;

  lineNumber: number | null;

  fixExample: string | null;

  helpUrl: string | null;
}

interface ActionItem {
  priority: "critical" | "important" | "nice-to-have";
  title: string;
  steps: string[];
  estimatedImpact: number;
  category: string;
}

interface AnalysisSummary {
  headline: string;
  criticalCount: number;
  topActions: string[];
}

interface RecommendationDetail {
  priority:
    | "high"
    | "medium"
    | "low";

  category: string;

  title: string;

  description: string;

  estimatedImpact: number;

  dismissed: boolean;
}

export interface SeoAnalysisResult {
  seoScore: number;

  performanceScore: number;

  accessibilityScore: number;

  bestPracticesScore: number;

  metaTitle: string | null;

  metaDescription: string | null;

  h1Count: number;

  h2Count: number;

  wordCount: number;

  internalLinks: number;

  externalLinks: number;

  imagesMissingAlt: number;

  pageLoadScore: number;

  mobileScore: number;

  pageCount: number;

  lcp: string;

  cls: string;

  fcp: string;

  tti: string;

  speedIndex: string;

  issues: IssueDetail[];

  recommendations: RecommendationDetail[];

  aiVisibilityScore?: number;

  aiVisibilityInsights?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };

  aiVisibilityCategories?: AiCategory[];

  aiEngineReadiness?: AiEngineReadiness[];

  summary?: AnalysisSummary;

  actionPlan?: ActionItem[];

  llmSummary?: LlmEnhancement | null;

  /** True for content types not yet analyzable (YouTube / Instagram). */
  unsupported?: boolean;

  type?: string;

  message?: string;
}

async function fetchPage(
  url: string,
  timeout = 15000,
): Promise<{
  html: string;
  finalUrl: string;
  status: number;
} | null> {
  // Manually follow redirects so every hop is re-validated
  // against the SSRF guard — `redirect: "follow"` would let a
  // public URL bounce us to an internal address.
  const MAX_REDIRECTS = 5;
  const deadline = Date.now() + timeout;
  let currentUrl = url;

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await validatePublicUrl(currentUrl);

      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("Fetch timed out");

      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RankLensBot/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(remaining),
      });

      // 3xx with a Location header → validate the next hop and continue.
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          // Redirect with no target — malformed; treat as a fetch failure
          // rather than analyzing an empty/redirect body as a real page.
          throw new Error(`Redirect (${response.status}) with no Location header`);
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      const html = await response.text();
      return { html, finalUrl: currentUrl, status: response.status };
    }

    throw new Error("Too many redirects");
  } catch (error) {
    logger.warn(
      {
        url: currentUrl,
        error: String(error),
        ssrf: error instanceof UnsafeUrlError,
      },
      "Failed to fetch page",
    );

    return null;
  }
}

// Rough visible-word count from an HTML string, used to detect
// client-rendered (SPA) shells whose raw HTML has almost no content.
function visibleWordCount(html: string): number {
  const text = cheerio.load(html)("body").text().replace(/\s+/g, " ").trim();
  return text.split(" ").filter((w) => w.length > 1).length;
}

// ======================================================
// RENDERED-DOM FETCH (for JS-rendered / SPA pages)
//
// A plain fetch() returns the un-executed HTML, so single-page
// apps (React/Vue/etc.) come back as an empty <div id="root">
// shell — giving 0 words / no headings for the content + AI
// visibility analysis. When we detect that, we render the page
// in the pooled headless Chrome (which DOES run JS, same engine
// Lighthouse uses) and analyze the real, rendered DOM instead.
// ======================================================

async function fetchRenderedHtml(url: string, timeout = 20_000): Promise<string | null> {
  let instance: Awaited<ReturnType<typeof chromePool.acquire>> | null = null;
  let browser: Awaited<ReturnType<typeof puppeteer.connect>> | null = null;
  try {
    // The URL was already SSRF-validated upstream; revalidate cheaply.
    await validatePublicUrl(url);

    instance = await chromePool.acquire(15_000);
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${instance.port}` });

    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout });
      // Give late hydration a brief beat to flush content.
      await new Promise((r) => setTimeout(r, 400));
      return await page.content();
    } finally {
      await page.close().catch(() => {});
    }
  } catch (error) {
    logger.warn({ url, error: String(error) }, "Rendered-DOM fetch failed");
    return null;
  } finally {
    // Disconnect (do NOT close — that would kill the pooled browser).
    if (browser) await browser.disconnect().catch(() => {});
    if (instance) chromePool.release(instance);
  }
}

export async function generateSeoAnalysis(
  url: string,
  type: string,
): Promise<SeoAnalysisResult> {
  logger.info(
    { url, type },
    "Starting SEO analysis",
  );

  if (type === "website") {
    return analyzeWebsite(url);
  }

  if (type === "youtube") {
    return analyzeYouTube(url);
  }

  return analyzeInstagram(url);
}

async function analyzeWebsite(
  rootUrl: string,
): Promise<SeoAnalysisResult> {
  return analyzePage(rootUrl);
}

async function analyzePage(
  url: string,
): Promise<SeoAnalysisResult> {
  // ======================================================
  // RUN FETCH + LIGHTHOUSE IN PARALLEL
  //
  // Previously these ran sequentially, costing an extra
  // 1-5s. Now they overlap: while Lighthouse is booting
  // up and navigating, we're also fetching the HTML for
  // Cheerio analysis.
  // ======================================================

  const [fetchResult, lighthouseSettled] = await Promise.allSettled([
    fetchPage(url),
    runLighthouseAudit(url),
  ]);

  const fetched = fetchResult.status === "fulfilled" ? fetchResult.value : null;

  let lighthouseResult: LighthouseAuditResult = {
    seoScore: 0,
    performanceScore: 0,
    accessibilityScore: 0,
    bestPracticesScore: 0,
    lcp: "N/A",
    cls: "N/A",
    fcp: "N/A",
    tti: "N/A",
    speedIndex: "N/A",
    metrics: {
      lcpMs: null,
      fcpMs: null,
      clsValue: null,
      ttiMs: null,
      speedIndexMs: null,
      tbtMs: null,
    },
    failedAudits: [],
    auditDurationMs: 0,
  };

  if (lighthouseSettled.status === "fulfilled") {
    lighthouseResult = lighthouseSettled.value;
  } else {
    logger.warn(
      {
        url,
        error: lighthouseSettled.reason,
      },
      "Lighthouse failed — using fallback scores",
    );
  }

  // ======================================================
  // FETCH FAILED
  // ======================================================

  if (
    !fetched ||
    !fetched.html
  ) {
    return {
      seoScore: 0,

      performanceScore: 0,

      accessibilityScore: 0,

      bestPracticesScore: 0,

      metaTitle: null,

      metaDescription: null,

      h1Count: 0,

      h2Count: 0,

      wordCount: 0,

      internalLinks: 0,

      externalLinks: 0,

      imagesMissingAlt: 0,

      pageLoadScore: 0,

      mobileScore: 0,

      pageCount: 1,

      lcp: "N/A",

      cls: "N/A",

      fcp: "N/A",

      tti: "N/A",

      speedIndex: "N/A",

      issues: [
        {
          category:
            "Crawlability",

          severity:
            "critical",

          title:
            "Page could not be fetched",

          description:
            "Unable to fetch page.",

          whyItMatters:
            "If the page can't be reached, neither search engines nor AI crawlers can index or cite it.",

          affectedUrl: url,

          element: null,

          lineNumber: null,

          fixExample:
            "Check URL/server.",

          helpUrl: null,
        },
      ],

      recommendations: [
        {
          priority: "high",

          category:
            "Crawlability",

          title:
            "Fix page accessibility",

          description:
            "Ensure the page is publicly accessible.",

          estimatedImpact:
            100,

          dismissed: false,
        },
      ],

      aiVisibilityScore: 0,

      aiVisibilityInsights: {
        strengths: [],
        weaknesses: ["Page could not be fetched for AI visibility analysis"],
        recommendations: ["Ensure the page is publicly accessible for AI crawlers"],
      },
    };
  }

  const {
    finalUrl,
  } = fetched;

  // If the raw HTML looks like an un-rendered SPA shell (almost no visible
  // text), render it in headless Chrome and analyze the real DOM instead.
  let html = fetched.html;
  const rawWords = visibleWordCount(html);
  if (rawWords < 50) {
    const rendered = await fetchRenderedHtml(finalUrl);
    if (rendered && visibleWordCount(rendered) > rawWords) {
      html = rendered;
      logger.info({ url: finalUrl, rawWords }, "Using JS-rendered DOM (SPA detected)");
    }
  }

  const $ = cheerio.load(html);

  const issues: IssueDetail[] =
    [];

  const recommendations: RecommendationDetail[] =
    [];

  // ======================================================
  // LIGHTHOUSE AUDITS
  // ======================================================

  lighthouseResult.failedAudits.forEach(
    (audit) => {
      issues.push({
        category:
          "Performance",

        severity:
          audit.score === 0
            ? "critical"
            : "warning",

        title: audit.title,

        description:
          audit.description,

        whyItMatters:
          "Slow or unstable pages are crawled less often and ranked lower by both search and AI systems.",

        affectedUrl:
          finalUrl,

        element:
          audit.displayValue ||
          null,

        lineNumber: null,

        fixExample: null,

        helpUrl: null,
      });

      recommendations.push({
        priority:
          audit.score === 0
            ? "high"
            : "medium",

        category:
          "Performance",

        title: `Optimize ${audit.title}`,

        description: `Improve ${audit.title} audit.`,

        estimatedImpact:
          Math.round(
            (1 -
              (audit.score ||
                0)) *
              50,
          ),

        dismissed: false,
      });
    },
  );

  // ======================================================
  // BASIC SEO RULES
  // ======================================================

  const title =
    $("title")
      .first()
      .text()
      .trim();

  const metaDescription =
    $(
      'meta[name="description"]',
    ).attr("content") || "";

  const h1Count =
    $("h1").length;

  const h2Count =
    $("h2").length;

  const imagesMissingAlt =
    $(
      "img:not([alt])",
    ).length;

  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const wordCount =
    bodyText
      .split(" ")
      .filter(
        (word) =>
          word.length > 1,
      ).length;

  // ======================================================
  // LINKS
  // ======================================================

  let internalLinks = 0;

  let externalLinks = 0;

  $("a[href]").each(
    (_, element) => {
      const href = $(element)
        .attr("href")
        ?.trim();

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith(
          "javascript:",
        )
      ) {
        return;
      }

      if (
        href.startsWith("http")
      ) {
        externalLinks++;
      } else {
        internalLinks++;
      }
    },
  );

  // ======================================================
  // MANUAL ISSUES
  // ======================================================

  if (!title) {
    issues.push({
      category:
        "Meta Tags",

      severity:
        "critical",

      title:
        "Missing title tag",

      description:
        "Title tag is required for SEO.",

      whyItMatters:
        "The title is the single strongest on-page signal of topic for search engines and the headline AI assistants read first.",

      affectedUrl:
        finalUrl,

      element: null,

      lineNumber: null,

      fixExample:
        "<title>Your Page</title>",

      helpUrl: null,
    });
  }

  if (!metaDescription) {
    issues.push({
      category:
        "Meta Tags",

      severity:
        "warning",

      title:
        "Missing meta description",

      description:
        "Meta description improves CTR.",

      whyItMatters:
        "AI systems and search engines use the meta description to summarize and preview your page; without it they guess from raw text.",

      affectedUrl:
        finalUrl,

      element: null,

      lineNumber: null,

      fixExample:
        '<meta name="description" content="...">',

      helpUrl: null,
    });
  }

  // ======================================================
  // FINAL RESPONSE
  //
  // Note: pageLoadScore and mobileScore both reflect the
  // desktop Lighthouse performance score. A true mobile
  // audit would require a separate Lighthouse run with
  // mobile formFactor + mobile throttling.
  // ======================================================

  // ======================================================
  // AI VISIBILITY + SYNTHESIS
  // ======================================================

  const ai = analyzeAiVisibility(
    $,
    finalUrl,
    lighthouseResult.performanceScore,
    lighthouseResult.performanceScore,
  );

  const actionPlan = buildActionPlan(issues, recommendations, ai);
  const summary = buildSummary(
    lighthouseResult.seoScore,
    ai.aiVisibilityScore,
    issues,
    actionPlan,
  );

  // Optional hybrid Claude layer — runs only when ANTHROPIC_API_KEY is set,
  // and never blocks or fails the analysis (returns null on any error/timeout).
  let llmSummary: LlmEnhancement | null = null;
  if (isLlmEnabled()) {
    const digest: AnalysisDigest = {
      url: finalUrl,
      title: title || null,
      metaDescription: metaDescription || null,
      headingOutline: buildHeadingOutline($),
      excerpt: bodyText.slice(0, 1800),
      wordCount,
      seoScore: lighthouseResult.seoScore,
      aiVisibilityScore: ai.aiVisibilityScore,
      categoryScores: ai.aiVisibilityCategories.map((c) => ({
        label: c.label,
        score: c.score,
        status: c.status,
      })),
      topWeaknesses: ai.aiVisibilityInsights.weaknesses.slice(0, 6),
    };
    llmSummary = await enhanceWithLlm(digest);
  }

  return {
    seoScore:
      lighthouseResult.seoScore,

    performanceScore:
      lighthouseResult.performanceScore,

    accessibilityScore:
      lighthouseResult.accessibilityScore,

    bestPracticesScore:
      lighthouseResult.bestPracticesScore,

    metaTitle:
      title || null,

    metaDescription:
      metaDescription ||
      null,

    h1Count,

    h2Count,

    wordCount,

    internalLinks,

    externalLinks,

    imagesMissingAlt,

    pageLoadScore:
      lighthouseResult.performanceScore,

    mobileScore:
      lighthouseResult.performanceScore,

    pageCount: 1,

    lcp:
      lighthouseResult.lcp,

    cls:
      lighthouseResult.cls,

    fcp:
      lighthouseResult.fcp,

    tti:
      lighthouseResult.tti,

    speedIndex:
      lighthouseResult.speedIndex,

    issues,

    recommendations,

    ...ai,

    summary,

    actionPlan,

    llmSummary,
  };
}

// ======================================================
// SYNTHESIS HELPERS
// ======================================================

function buildHeadingOutline($: cheerio.CheerioAPI): string[] {
  const outline: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const tag = (el as any).tagName?.toUpperCase?.() ?? "H?";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) outline.push(`${tag}: ${text.slice(0, 120)}`);
  });
  return outline.slice(0, 40);
}

function buildActionPlan(
  issues: IssueDetail[],
  recommendations: RecommendationDetail[],
  ai: AiVisibilityResult,
): ActionItem[] {
  const plan: ActionItem[] = [];

  // Critical issues → critical actions.
  for (const issue of issues.filter((i) => i.severity === "critical")) {
    plan.push({
      priority: "critical",
      title: `Fix: ${issue.title}`,
      steps: [issue.description, issue.fixExample ?? ""].filter(Boolean),
      estimatedImpact: 90,
      category: issue.category,
    });
  }

  // High-impact recommendations → important actions.
  for (const rec of recommendations
    .filter((r) => r.priority === "high")
    .slice(0, 5)) {
    plan.push({
      priority: "important",
      title: rec.title,
      steps: [rec.description],
      estimatedImpact: Math.max(40, rec.estimatedImpact),
      category: rec.category,
    });
  }

  // Weak AI-visibility categories → important/nice-to-have actions.
  const weakCategories = ai.aiVisibilityCategories
    .filter((c) => c.status !== "strong" && c.recommendations.length > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
  for (const cat of weakCategories) {
    plan.push({
      priority: cat.status === "weak" ? "important" : "nice-to-have",
      title: `Improve ${cat.label} (${cat.score}/100)`,
      steps: cat.recommendations.slice(0, 3),
      estimatedImpact: cat.status === "weak" ? 60 : 35,
      category: "AI Visibility",
    });
  }

  const order = { critical: 0, important: 1, "nice-to-have": 2 };
  return plan
    .sort(
      (a, b) =>
        order[a.priority] - order[b.priority] ||
        b.estimatedImpact - a.estimatedImpact,
    )
    .slice(0, 12);
}

function buildSummary(
  seoScore: number,
  aiScore: number,
  issues: IssueDetail[],
  actionPlan: ActionItem[],
): AnalysisSummary {
  const criticalCount = issues.filter((i) => i.severity === "critical").length;

  const seoBand = seoScore >= 80 ? "strong" : seoScore >= 60 ? "moderate" : "weak";
  const aiBand = aiScore >= 70 ? "strong" : aiScore >= 40 ? "developing" : "weak";

  const headline =
    `This page has ${seoBand} technical SEO (${seoScore}/100) and ${aiBand} AI visibility (${aiScore}/100).` +
    (criticalCount > 0
      ? ` ${criticalCount} critical issue${criticalCount === 1 ? "" : "s"} need attention first.`
      : " No critical issues detected — focus on the opportunities below.");

  return {
    headline,
    criticalCount,
    topActions: actionPlan.slice(0, 3).map((a) => a.title),
  };
}

// ======================================================
// YOUTUBE / INSTAGRAM
//
// These platforms are not yet analyzable. Rather than return
// fabricated scores (a core RankLens "never do" rule), we
// return a clearly-flagged "unsupported" result the client
// renders as a "coming soon" state.
// ======================================================

async function analyzeYouTube(url: string): Promise<SeoAnalysisResult> {
  return unsupportedResult(
    "youtube",
    "YouTube analysis is coming soon. For now, RankLens analyzes websites, landing pages, and blogs in full.",
    url,
  );
}

async function analyzeInstagram(url: string): Promise<SeoAnalysisResult> {
  return unsupportedResult(
    "instagram",
    "Instagram analysis is coming soon. For now, RankLens analyzes websites, landing pages, and blogs in full.",
    url,
  );
}

function unsupportedResult(
  type: string,
  message: string,
  _url: string,
): SeoAnalysisResult {
  return {
    seoScore: 0,
    performanceScore: 0,
    accessibilityScore: 0,
    bestPracticesScore: 0,
    metaTitle: null,
    metaDescription: null,
    h1Count: 0,
    h2Count: 0,
    wordCount: 0,
    internalLinks: 0,
    externalLinks: 0,
    imagesMissingAlt: 0,
    pageLoadScore: 0,
    mobileScore: 0,
    pageCount: 0,
    lcp: "N/A",
    cls: "N/A",
    fcp: "N/A",
    tti: "N/A",
    speedIndex: "N/A",
    issues: [],
    recommendations: [],
    unsupported: true,
    type,
    message,
  };
}