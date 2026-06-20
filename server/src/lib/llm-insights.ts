import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { env } from "./env.js";
import { logger } from "./logger.js";

// ======================================================
// HYBRID CLAUDE INSIGHTS LAYER
//
// Optional enhancement on top of the deterministic SEO +
// AI-visibility scoring. Given a COMPACT digest of the page
// (never the full HTML), Claude returns an executive summary,
// entity gaps, and evidence-backed recommendations.
//
// Degrades gracefully: with no ANTHROPIC_API_KEY, or on any
// error / timeout, enhanceWithLlm() returns null and the
// analysis proceeds with deterministic insights only. It must
// never throw into the analysis pipeline.
// ======================================================

export interface AnalysisDigest {
  url: string;
  title: string | null;
  metaDescription: string | null;
  headingOutline: string[];
  excerpt: string;
  wordCount: number;
  seoScore: number;
  aiVisibilityScore: number;
  categoryScores: { label: string; score: number; status: string }[];
  topWeaknesses: string[];
}

export interface LlmRecommendation {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface LlmEnhancement {
  executiveSummary: string;
  entityGaps: string[];
  recommendations: LlmRecommendation[];
}

const LlmEnhancementSchema = z.object({
  executiveSummary: z.string(),
  entityGaps: z.array(z.string()).default([]),
  recommendations: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        priority: z.enum(["high", "medium", "low"]).default("medium"),
      }),
    )
    .default([]),
});

const HARD_BUDGET_MS = 8_000;

export function isLlmEnabled(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!cachedClient) {
    cachedClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      maxRetries: 1,
      timeout: HARD_BUDGET_MS,
    });
  }
  return cachedClient;
}

// Forced tool-use guarantees structured JSON output that we can validate.
const INSIGHTS_TOOL = {
  name: "provide_ai_visibility_insights",
  description:
    "Return an evidence-backed AI-visibility assessment for the analyzed web page.",
  input_schema: {
    type: "object" as const,
    properties: {
      executiveSummary: {
        type: "string",
        description:
          "2-3 sentence plain-language summary of how well this page is positioned to be surfaced and cited by AI answer engines, grounded only in the provided digest.",
      },
      entityGaps: {
        type: "array",
        items: { type: "string" },
        description:
          "Up to 5 important entities, topics, or facts the page should cover or make more explicit so AI systems map it correctly. Empty if none.",
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short actionable recommendation title." },
            detail: {
              type: "string",
              description: "One or two sentences explaining the concrete change and why it improves AI visibility.",
            },
            priority: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["title", "detail", "priority"],
        },
        description: "3-6 specific, actionable recommendations. No generic advice; tie each to evidence in the digest.",
      },
    },
    required: ["executiveSummary", "entityGaps", "recommendations"],
  },
};

const SYSTEM_PROMPT = `You are an AI-visibility consultant for RankLens. You assess how well web pages are positioned to be discovered, understood, and cited by AI answer engines (ChatGPT, Gemini, Claude, Perplexity, Copilot).

Rules:
- Base every statement strictly on the supplied digest. Never invent facts about the page.
- Recommendations must be concrete and actionable (what to change, where), never generic ("improve SEO").
- Be concise. Lead with the most impactful guidance.
- Always respond by calling the provide_ai_visibility_insights tool.`;

function buildUserContent(digest: AnalysisDigest): string {
  const categories = digest.categoryScores
    .map((c) => `- ${c.label}: ${c.score}/100 (${c.status})`)
    .join("\n");
  const weaknesses = digest.topWeaknesses.length
    ? digest.topWeaknesses.map((w) => `- ${w}`).join("\n")
    : "- (none detected)";
  const outline = digest.headingOutline.length
    ? digest.headingOutline.slice(0, 30).map((h) => `- ${h}`).join("\n")
    : "- (no headings found)";

  return `Analyze this page for AI visibility.

URL: ${digest.url}
Title: ${digest.title ?? "(missing)"}
Meta description: ${digest.metaDescription ?? "(missing)"}
Word count: ${digest.wordCount}
SEO score: ${digest.seoScore}/100
AI visibility score: ${digest.aiVisibilityScore}/100

Per-category AI scores:
${categories}

Detected weaknesses:
${weaknesses}

Heading outline:
${outline}

Content excerpt (truncated):
"""
${digest.excerpt}
"""`;
}

export async function enhanceWithLlm(
  digest: AnalysisDigest,
): Promise<LlmEnhancement | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create(
      {
        model: env.LLM_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [INSIGHTS_TOOL],
        tool_choice: { type: "tool", name: INSIGHTS_TOOL.name },
        messages: [{ role: "user", content: buildUserContent(digest) }],
      },
      { timeout: HARD_BUDGET_MS },
    );

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;

    const parsed = LlmEnhancementSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, "LLM insights failed schema validation");
      return null;
    }

    return parsed.data;
  } catch (err) {
    logger.warn({ error: String(err) }, "LLM insights enhancement skipped");
    return null;
  }
}
