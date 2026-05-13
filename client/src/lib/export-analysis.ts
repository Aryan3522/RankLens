/**
 * Export Analysis Report
 * 
 * Builds a comprehensive, structured JSON report from analysis data.
 * Designed to be:
 * 1. Human-readable with clear section headers and descriptions
 * 2. AI-parseable so any LLM can immediately understand and give actionable advice
 * 3. Self-contained — includes all scores, issues, recommendations, and metadata
 */

interface ExportableAnalysis {
  id: string | number;
  url: string;
  type: string;
  status: string;
  seoScore?: number | null;
  performanceScore?: number | null;
  accessibilityScore?: number | null;
  bestPracticesScore?: number | null;
  mobileScore?: number | null;
  aiVisibilityScore?: number | null;
  aiVisibilityInsights?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  h1Count?: number | null;
  h2Count?: number | null;
  wordCount?: number | null;
  internalLinks?: number | null;
  externalLinks?: number | null;
  imagesMissingAlt?: number | null;
  pageLoadScore?: number | null;
  pageCount?: number | null;
  lcp?: string | null;
  cls?: string | null;
  fcp?: string | null;
  tti?: string | null;
  speedIndex?: string | null;
  issueCount?: number | null;
  issues?: any[];
  recommendations?: any[];
  createdAt: string;
  completedAt?: string | null;
}

function getScoreRating(score: number | null | undefined): string {
  if (score == null) return "N/A";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Needs Improvement";
  if (score >= 40) return "Poor";
  return "Critical";
}

function buildExportReport(analysis: ExportableAnalysis) {
  const issues = (analysis.issues ?? []) as any[];
  const recommendations = (analysis.recommendations ?? []) as any[];

  const criticalIssues = issues.filter(i => i.severity === "critical");
  const warningIssues = issues.filter(i => i.severity === "warning");
  const infoIssues = issues.filter(i => i.severity === "info");

  const report = {
    _metadata: {
      reportTitle: "RankLens SEO & AI Visibility Analysis Report",
      generatedAt: new Date().toISOString(),
      generatedBy: "RankLens SEO Platform",
      purpose: "This report contains a complete SEO and AI visibility audit of the analyzed URL. It is structured for both human reading and AI/LLM consumption. Feed this file to any AI assistant to get actionable improvement suggestions.",
      version: "1.0",
    },

    summary: {
      analyzedUrl: analysis.url,
      analysisType: analysis.type,
      analysisDate: analysis.createdAt,
      completedAt: analysis.completedAt ?? null,
      overallSeoScore: analysis.seoScore ?? null,
      overallSeoRating: getScoreRating(analysis.seoScore),
      aiVisibilityScore: analysis.aiVisibilityScore ?? null,
      aiVisibilityRating: getScoreRating(analysis.aiVisibilityScore),
      totalIssuesFound: issues.length,
      criticalIssues: criticalIssues.length,
      warnings: warningIssues.length,
      informational: infoIssues.length,
      totalRecommendations: recommendations.length,
    },

    scores: {
      _description: "All scores are on a 0-100 scale. Higher is better.",
      seoScore: {
        value: analysis.seoScore ?? null,
        rating: getScoreRating(analysis.seoScore),
        description: "Overall SEO health score combining technical SEO, content optimization, and crawlability factors.",
      },
      performanceScore: {
        value: analysis.performanceScore ?? null,
        rating: getScoreRating(analysis.performanceScore),
        description: "Page load performance score based on Lighthouse metrics including LCP, FCP, CLS, and Speed Index.",
      },
      accessibilityScore: {
        value: analysis.accessibilityScore ?? null,
        rating: getScoreRating(analysis.accessibilityScore),
        description: "Web accessibility compliance score based on WCAG guidelines.",
      },
      bestPracticesScore: {
        value: analysis.bestPracticesScore ?? null,
        rating: getScoreRating(analysis.bestPracticesScore),
        description: "Score for adherence to modern web development best practices.",
      },
      mobileScore: {
        value: analysis.mobileScore ?? null,
        rating: getScoreRating(analysis.mobileScore),
        description: "Mobile-friendliness and responsive design score.",
      },
      aiVisibilityScore: {
        value: analysis.aiVisibilityScore ?? null,
        rating: getScoreRating(analysis.aiVisibilityScore),
        description: "How well this page is optimized for AI search engines, LLM crawlers, and generative search experiences.",
      },
    },

    coreWebVitals: {
      _description: "Core Web Vitals are Google's key metrics for measuring real-world user experience.",
      largestContentfulPaint: {
        value: analysis.lcp ?? null,
        metric: "LCP",
        target: "≤ 2.5 seconds",
        description: "Measures loading performance. The time it takes for the largest content element to become visible.",
      },
      cumulativeLayoutShift: {
        value: analysis.cls ?? null,
        metric: "CLS",
        target: "≤ 0.1",
        description: "Measures visual stability. How much the page layout shifts during loading.",
      },
      firstContentfulPaint: {
        value: analysis.fcp ?? null,
        metric: "FCP",
        target: "≤ 1.8 seconds",
        description: "Measures perceived load speed. The time from navigation to when the browser renders the first piece of content.",
      },
      speedIndex: {
        value: analysis.speedIndex ?? null,
        metric: "SI",
        target: "≤ 3.4 seconds",
        description: "How quickly the contents of a page are visibly populated.",
      },
      timeToInteractive: {
        value: analysis.tti ?? null,
        metric: "TTI",
        target: "≤ 3.8 seconds",
        description: "Time until the page becomes fully interactive.",
      },
    },

    contentAnalysis: {
      _description: "Content structure and on-page SEO elements.",
      metaTitle: {
        value: analysis.metaTitle ?? null,
        characterCount: analysis.metaTitle?.length ?? 0,
        idealRange: "30-60 characters",
        isOptimal: analysis.metaTitle ? analysis.metaTitle.length >= 30 && analysis.metaTitle.length <= 60 : false,
      },
      metaDescription: {
        value: analysis.metaDescription ?? null,
        characterCount: analysis.metaDescription?.length ?? 0,
        idealRange: "120-160 characters",
        isOptimal: analysis.metaDescription ? analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160 : false,
      },
      headingStructure: {
        h1Tags: analysis.h1Count ?? null,
        h2Tags: analysis.h2Count ?? null,
        h1Recommendation: "Exactly 1 H1 tag per page",
        isH1Optimal: analysis.h1Count === 1,
      },
      wordCount: analysis.wordCount ?? null,
      linkProfile: {
        internalLinks: analysis.internalLinks ?? null,
        externalLinks: analysis.externalLinks ?? null,
      },
      imagesMissingAlt: analysis.imagesMissingAlt ?? null,
    },

    ...(analysis.aiVisibilityScore != null && analysis.aiVisibilityInsights ? {
      aiVisibilityAnalysis: {
        _description: "Analysis of how well the page is structured for AI search engines and LLM crawlers like ChatGPT, Google AI Overviews, and Perplexity.",
        score: analysis.aiVisibilityScore,
        strengths: analysis.aiVisibilityInsights.strengths ?? [],
        weaknesses: analysis.aiVisibilityInsights.weaknesses ?? [],
        actionItems: analysis.aiVisibilityInsights.recommendations ?? [],
      },
    } : {}),

    issues: {
      _description: "All detected SEO issues sorted by severity (critical first). Each issue includes the problem, affected element, and how to fix it.",
      total: issues.length,
      bySeverity: {
        critical: criticalIssues.length,
        warning: warningIssues.length,
        info: infoIssues.length,
      },
      items: [...issues]
        .sort((a, b) => {
          const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
          return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
        })
        .map(issue => ({
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          affectedUrl: issue.affectedUrl ?? null,
          element: issue.element ?? null,
          lineNumber: issue.lineNumber ?? null,
          fixExample: issue.fixExample ?? null,
          helpUrl: issue.helpUrl ?? null,
        })),
    },

    recommendations: {
      _description: "Actionable recommendations to improve SEO, sorted by priority and estimated impact.",
      total: recommendations.length,
      items: [...recommendations]
        .sort((a, b) => {
          const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
          const pDiff = (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
          return pDiff || (b.estimatedImpact - a.estimatedImpact);
        })
        .map(rec => ({
          priority: rec.priority,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          estimatedImpact: rec.estimatedImpact,
        })),
    },

    _aiPromptHint: "You are an SEO expert reviewing this report. Based on the scores, issues, and recommendations above, provide a prioritized action plan to improve this website's SEO score, AI visibility, and overall web performance. Focus on critical issues first, then high-impact recommendations.",
  };

  return report;
}

function sanitizeFilename(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

export function downloadAnalysisReport(analysis: ExportableAnalysis) {
  const report = buildExportReport(analysis);
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const filename = `ranklens-report_${sanitizeFilename(analysis.url)}_${new Date().toISOString().slice(0, 10)}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
