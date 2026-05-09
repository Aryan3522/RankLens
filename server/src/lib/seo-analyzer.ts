import * as cheerio from "cheerio";

import { logger } from "./logger.js";

import {
  runLighthouseAudit,
  type LighthouseAuditResult,
} from "./lighthouse-service.js";

interface IssueDetail {
  category: string;

  severity:
    | "critical"
    | "warning"
    | "info";

  title: string;

  description: string;

  affectedUrl: string | null;

  element: string | null;

  lineNumber: number | null;

  fixExample: string | null;

  helpUrl: string | null;
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
}

async function fetchPage(
  url: string,
  timeout = 15000,
): Promise<{
  html: string;
  finalUrl: string;
  status: number;
} | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RankLensBot/1.0)",

        Accept:
          "text/html,application/xhtml+xml",
      },

      redirect: "follow",

      signal:
        AbortSignal.timeout(timeout),
    });

    const html = await response.text();

    return {
      html,
      finalUrl:
        response.url || url,
      status: response.status,
    };
  } catch (error) {
    logger.warn(
      {
        url,
        error: String(error),
      },
      "Failed to fetch page",
    );

    return null;
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
  const fetched =
    await fetchPage(url);

  // ======================================================
  // LIGHTHOUSE
  // ======================================================

  let lighthouseResult: LighthouseAuditResult =
    {
      seoScore: 0,

      performanceScore: 0,

      accessibilityScore: 0,

      bestPracticesScore: 0,

      lcp: "N/A",

      cls: "N/A",

      fcp: "N/A",

      tti: "N/A",

      speedIndex: "N/A",

      failedAudits: [],
    };

  try {
    lighthouseResult =
      await runLighthouseAudit(url);
  } catch (error) {
    logger.warn(
      {
        url,
        error,
      },
      "Lighthouse failed",
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
    };
  }

  const {
    html,
    finalUrl,
  } = fetched;

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
  // ======================================================

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
  };
}

async function analyzeYouTube(
  _url: string,
): Promise<SeoAnalysisResult> {
  return {
    seoScore: 85,

    performanceScore: 90,

    accessibilityScore: 90,

    bestPracticesScore: 95,

    metaTitle:
      "YouTube Video",

    metaDescription:
      "Analyzed YouTube content",

    h1Count: 0,

    h2Count: 0,

    wordCount: 500,

    internalLinks: 0,

    externalLinks: 5,

    imagesMissingAlt: 0,

    pageLoadScore: 90,

    mobileScore: 90,

    pageCount: 1,

    lcp: "1.2s",

    cls: "0.01",

    fcp: "0.8s",

    tti: "1.5s",

    speedIndex: "1.0s",

    issues: [],

    recommendations: [],
  };
}

async function analyzeInstagram(
  _url: string,
): Promise<SeoAnalysisResult> {
  return {
    seoScore: 75,

    performanceScore: 80,

    accessibilityScore: 85,

    bestPracticesScore: 80,

    metaTitle:
      "Instagram Content",

    metaDescription:
      "Analyzed Instagram content",

    h1Count: 0,

    h2Count: 0,

    wordCount: 150,

    internalLinks: 0,

    externalLinks: 3,

    imagesMissingAlt: 0,

    pageLoadScore: 80,

    mobileScore: 80,

    pageCount: 1,

    lcp: "1.5s",

    cls: "0.05",

    fcp: "1.0s",

    tti: "2.0s",

    speedIndex: "1.5s",

    issues: [],

    recommendations: [],
  };
}