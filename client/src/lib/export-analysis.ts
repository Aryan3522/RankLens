/**
 * Export Analysis as an AI-ready FIX BRIEF.
 *
 * Produces a single self-contained markdown document that:
 *  1. Opens with an instruction prompt telling an AI assistant exactly what to
 *     do — fix every listed issue in the user's codebase, step by step.
 *  2. Includes ALL fixable data: the prioritized action plan, every issue with
 *     its fix example, AI-visibility gaps with recommendations, missing
 *     entities, and all recommendations.
 *
 * The user can paste the whole thing into any AI assistant with no extra
 * explanation. Used by both the Download (.md file) and Copy (clipboard)
 * buttons.
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
  aiVisibilityCategories?: any[] | null;
  aiEngineReadiness?: any[] | null;
  actionPlan?: any[] | null;
  summary?: { headline: string; criticalCount: number; topActions: string[] } | null;
  llmSummary?: { executiveSummary: string; entityGaps: string[]; recommendations: any[] } | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  h1Count?: number | null;
  h2Count?: number | null;
  wordCount?: number | null;
  internalLinks?: number | null;
  externalLinks?: number | null;
  imagesMissingAlt?: number | null;
  lcp?: string | null;
  cls?: string | null;
  fcp?: string | null;
  speedIndex?: string | null;
  issues?: any[];
  recommendations?: any[];
  createdAt: string;
  completedAt?: string | null;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };
const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 0, important: 1, medium: 1, low: 2, "nice-to-have": 2,
};

export type FixScope = "all" | "seo" | "ai";

const AI_CATEGORY = "AI Visibility";

/**
 * Builds an AI-ready fix brief as a markdown string.
 *
 * - scope "all": the complete audit (SEO + AI visibility).
 * - scope "seo": technical SEO, performance, content & metadata issues only.
 * - scope "ai": AI-visibility gaps, entities, engine readiness & E-E-A-T only.
 */
export function buildAiFixText(analysis: ExportableAnalysis, scope: FixScope = "all"): string {
  const includeSeo = scope !== "ai";
  const includeAi = scope !== "seo";

  const allIssues = (analysis.issues ?? []) as any[];
  const allRecs = (analysis.recommendations ?? []) as any[];
  const categories = (analysis.aiVisibilityCategories ?? []) as any[];
  const engines = (analysis.aiEngineReadiness ?? []) as any[];
  const allActions = (analysis.actionPlan ?? []) as any[];
  const llm = includeAi ? analysis.llmSummary : null;

  // Scope the data: SEO owns everything not tagged "AI Visibility"; AI owns the rest.
  const issues = includeSeo ? allIssues : [];
  const actionPlan =
    scope === "all" ? allActions
    : scope === "seo" ? allActions.filter((a) => a.category !== AI_CATEGORY)
    : allActions.filter((a) => a.category === AI_CATEGORY);
  const recommendations =
    scope === "all" ? allRecs
    : scope === "seo" ? allRecs.filter((r) => r.category !== AI_CATEGORY)
    : allRecs.filter((r) => r.category === AI_CATEGORY);

  const out: string[] = [];
  const push = (s = "") => out.push(s);

  // ---- 1. Instruction prompt -------------------------------------------
  const title = scope === "seo" ? "SEO Fix Brief" : scope === "ai" ? "AI Visibility Fix Brief" : "Fix Brief";
  push(`# ${title} — ${analysis.url}`);
  push();
  push("## YOUR TASK (read first)");
  push();
  if (scope === "seo") {
    push(
      "You are a senior technical-SEO engineer. Below is the SEO, performance, content and metadata audit of my web page. " +
      "Fix **every** issue in my codebase, working through them in priority order (Critical → Important → Nice-to-have).",
    );
  } else if (scope === "ai") {
    push(
      "You are an AI-visibility engineer. Your goal is to make my web page easy for AI answer engines " +
      "(ChatGPT, Gemini, Claude, Perplexity, Copilot) to crawl, understand, trust, and cite. " +
      "Apply **every** improvement below in my codebase, working through them in priority order (Critical → Important → Nice-to-have).",
    );
  } else {
    push(
      "You are a senior SEO and AI-visibility engineer. Below is a complete audit of my web page. " +
      "Fix **every** issue in my codebase, working through them in priority order (Critical → Important → Nice-to-have).",
    );
  }
  push();
  push("For each item:");
  push("1. Locate the relevant file, template, or component in my project.");
  push("2. Apply the fix — use the provided **Fix** snippet as a guide and adapt it to my framework/stack.");
  push("3. After each change, state in one line what you changed and which file.");
  push();
  push(
    "Work autonomously: make reasonable assumptions and keep going rather than stopping to ask. " +
    "When you finish, give me (a) a short summary of everything you changed, and (b) any steps only I can do " +
    "(e.g. writing content, configuring DNS/hosting, adding real author bios). " +
    "Prioritize the Action Plan order; it already weighs impact.",
  );
  push();
  push("---");
  push();

  // ---- 2. Page snapshot -------------------------------------------------
  push("## Page snapshot");
  push();
  push(`- **URL:** ${analysis.url}`);
  push(`- **Analyzed:** ${new Date(analysis.createdAt).toISOString().slice(0, 10)}`);
  push(`- **SEO score:** ${fmtScore(analysis.seoScore)} / 100`);
  push(`- **AI visibility score:** ${fmtScore(analysis.aiVisibilityScore)} / 100`);
  push(`- **Performance:** ${fmtScore(analysis.performanceScore)} · **Accessibility:** ${fmtScore(analysis.accessibilityScore)} · **Best practices:** ${fmtScore(analysis.bestPracticesScore)}`);
  push(`- **Core Web Vitals:** LCP ${analysis.lcp ?? "—"} · CLS ${analysis.cls ?? "—"} · FCP ${analysis.fcp ?? "—"} · Speed Index ${analysis.speedIndex ?? "—"}`);
  push(`- **Content:** ${analysis.wordCount ?? 0} words · H1×${analysis.h1Count ?? 0} · H2×${analysis.h2Count ?? 0} · ${analysis.internalLinks ?? 0} internal / ${analysis.externalLinks ?? 0} external links · ${analysis.imagesMissingAlt ?? 0} images missing alt`);
  push(`- **Title tag:** ${analysis.metaTitle ? `\`${analysis.metaTitle}\` (${analysis.metaTitle.length} chars)` : "MISSING"}`);
  push(`- **Meta description:** ${analysis.metaDescription ? `\`${analysis.metaDescription}\` (${analysis.metaDescription.length} chars)` : "MISSING"}`);
  push();

  // The global headline references the overall critical-issue count, which can
  // include items outside a scoped brief — only show it in the full brief.
  if (scope === "all" && analysis.summary?.headline) {
    push(`> ${analysis.summary.headline}`);
    push();
  }
  if (llm?.executiveSummary) {
    push("**AI consultant summary:** " + llm.executiveSummary);
    push();
  }
  push("---");
  push();

  // ---- 3. Action plan ---------------------------------------------------
  if (actionPlan.length > 0) {
    push("## Action plan (do these in order)");
    push();
    actionPlan.forEach((a: any, i: number) => {
      push(`### ${i + 1}. [${(a.priority ?? "").toUpperCase()}] ${a.title}  _(impact ${a.estimatedImpact ?? "?"}/100, ${a.category ?? "general"})_`);
      (a.steps ?? []).forEach((s: string) => push(`- ${s}`));
      push();
    });
    push("---");
    push();
  }

  // ---- 4. Issues with fixes --------------------------------------------
  if (issues.length > 0) {
    const sorted = [...issues].sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
    );
    push(`## Issues to fix (${issues.length})`);
    push();
    sorted.forEach((issue: any) => {
      push(`### [${(issue.severity ?? "").toUpperCase()}] ${issue.title}  _(${issue.category})_`);
      if (issue.description) push(issue.description);
      if (issue.whyItMatters) push(`- **Why it matters:** ${issue.whyItMatters}`);
      if (issue.element) {
        push(`- **Current${issue.lineNumber ? ` (line ${issue.lineNumber})` : ""}:**`);
        push("```html");
        push(String(issue.element));
        push("```");
      }
      if (issue.fixExample) {
        push("- **Fix:**");
        push("```");
        push(String(issue.fixExample));
        push("```");
      }
      if (issue.helpUrl) push(`- **Docs:** ${issue.helpUrl}`);
      push();
    });
    push("---");
    push();
  }

  // ---- 5. AI visibility gaps -------------------------------------------
  const weakCats = includeAi ? categories.filter((c: any) => c.status !== "strong") : [];
  if (weakCats.length > 0) {
    push("## AI visibility gaps (improve these so AI engines can find & cite you)");
    push();
    weakCats
      .sort((a: any, b: any) => (a.score ?? 0) - (b.score ?? 0))
      .forEach((c: any) => {
        push(`### ${c.label} — ${c.score}/100 (${c.status})`);
        if (c.whatItMeans) push(`_${c.whatItMeans}_`);
        (c.weaknesses ?? []).forEach((w: string) => push(`- Gap: ${w}`));
        (c.recommendations ?? []).forEach((r: string) => push(`- Fix: ${r}`));
        push();
      });
    push("---");
    push();
  }

  // ---- 6. Missing entities ---------------------------------------------
  const entityGaps = llm?.entityGaps ?? [];
  if (entityGaps.length > 0) {
    push("## Missing entities & topics to cover");
    push();
    entityGaps.forEach((g: string) => push(`- ${g}`));
    push();
    push("---");
    push();
  }

  // ---- 7. Engine readiness (context) -----------------------------------
  if (includeAi && engines.length > 0) {
    push("## AI engine readiness (for context)");
    push();
    engines.forEach((e: any) => push(`- **${e.engine}:** ${e.score}/100 — ${e.note}`));
    push();
    push("---");
    push();
  }

  // ---- 8. All recommendations ------------------------------------------
  if (recommendations.length > 0) {
    push("## Additional recommendations");
    push();
    [...recommendations]
      .sort((a, b) => {
        const p = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        return p || (b.estimatedImpact ?? 0) - (a.estimatedImpact ?? 0);
      })
      .forEach((r: any) => {
        push(`- **[${(r.priority ?? "").toUpperCase()}] ${r.title}** (impact ${r.estimatedImpact ?? "?"}/100, ${r.category}) — ${r.description}`);
      });
    push();
  }

  if (llm?.recommendations?.length) {
    push("## AI consultant recommendations");
    push();
    llm.recommendations.forEach((r: any) => {
      push(`- **[${(r.priority ?? "").toUpperCase()}] ${r.title}** — ${r.detail}`);
    });
    push();
  }

  // Collapse any trailing blank/divider lines so the footer has exactly one rule.
  while (out.length && (out[out.length - 1] === "" || out[out.length - 1] === "---")) out.pop();
  push("");
  push("---");
  push("_Generated by RankLens — SEO & AI Visibility Intelligence._");

  return out.join("\n");
}

function fmtScore(v: number | null | undefined): string {
  return v == null ? "—" : String(v);
}

function sanitizeFilename(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

/** Downloads the AI fix brief as a markdown (.md) file. */
export function downloadAnalysisReport(analysis: ExportableAnalysis, scope: FixScope = "all") {
  const text = buildAiFixText(analysis, scope);
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const scopeTag = scope === "all" ? "" : `${scope}-`;
  const filename = `ranklens-${scopeTag}fix-brief_${sanitizeFilename(analysis.url)}_${new Date().toISOString().slice(0, 10)}.md`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Copies the AI fix brief to the clipboard. Returns true on success. */
export async function copyAnalysisReport(analysis: ExportableAnalysis, scope: FixScope = "all"): Promise<boolean> {
  const text = buildAiFixText(analysis, scope);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older browsers.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
