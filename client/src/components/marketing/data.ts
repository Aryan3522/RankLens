import {
  Activity,
  BadgeCheck,
  Brain,
  Gauge,
  Globe,
  Instagram,
  Quote,
  Search,
  Sparkles,
  Tags,
  Youtube,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for all marketing-page content. The visible copy AND
 * the FAQ JSON-LD are both derived from here so structured data can never drift
 * from what users actually read.
 */

export const AI_ENGINES = ["ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot", "Grok"];

export const HOW_IT_WORKS: {
  step: string;
  title: string;
  desc: string;
}[] = [
  { step: "Analyze", title: "We render your page like a real browser", desc: "Full crawl + Lighthouse audit." },
  { step: "Discover", title: "Find the gaps holding you back", desc: "Keyword, entity & structure gaps." },
  { step: "Optimize", title: "Score AI visibility across 12 signals", desc: "Scored per engine, every point explained." },
  { step: "Rank", title: "Ship a prioritized action plan", desc: "Ranked by impact, ready to fix." },
];

export const FEATURES: {
  icon: LucideIcon;
  title: string;
  desc: string;
  span?: "wide" | "tall";
}[] = [
  { icon: Brain, title: "AI Visibility Score", desc: "Discoverability across ChatGPT, Gemini, Claude & Perplexity.", span: "wide" },
  { icon: Activity, title: "Deep SEO Audit", desc: "Real Lighthouse performance, a11y & SEO." },
  { icon: BadgeCheck, title: "E-E-A-T Signals", desc: "Authorship, freshness & citation trust." },
  { icon: Quote, title: "Citation Readiness", desc: "The quotable facts AI loves to cite.", span: "tall" },
  { icon: Tags, title: "Entity Coverage", desc: "Brands, products & topics AI should map." },
  { icon: Gauge, title: "Core Web Vitals", desc: "LCP, CLS, FCP & Speed Index, live." },
];

export const PLATFORMS: {
  icon: LucideIcon;
  name: string;
  desc: string;
  status: "live" | "soon";
  accent: string;
}[] = [
  { icon: Globe, name: "Websites", desc: "Full SEO + AI-visibility audit.", status: "live", accent: "190 90% 50%" },
  { icon: Search, name: "Google Search", desc: "Ranking signals & Core Web Vitals.", status: "live", accent: "150 90% 50%" },
  { icon: Brain, name: "AI Search", desc: "ChatGPT, Gemini, Claude, Perplexity.", status: "live", accent: "270 90% 60%" },
  { icon: Youtube, name: "YouTube", desc: "Title, tags & transcript.", status: "soon", accent: "0 84% 60%" },
  { icon: Instagram, name: "Instagram", desc: "Caption & hashtag reach.", status: "soon", accent: "330 90% 60%" },
];

export const AI_VISIBILITY_ENGINES: { name: string; readiness: number; accent: string }[] = [
  { name: "ChatGPT", readiness: 82, accent: "150 90% 50%" },
  { name: "Gemini", readiness: 74, accent: "190 90% 50%" },
  { name: "Claude", readiness: 88, accent: "270 90% 60%" },
  { name: "Perplexity", readiness: 69, accent: "45 100% 50%" },
  { name: "Copilot", readiness: 77, accent: "330 90% 60%" },
];

/** Demo 12-signal profile for the AI-visibility radar when no real scan exists. */
export const AI_SIGNALS_DEMO: { label: string; score: number }[] = [
  { label: "Structure", score: 82 },
  { label: "Semantic HTML", score: 74 },
  { label: "Readability", score: 88 },
  { label: "Crawlability", score: 79 },
  { label: "Metadata", score: 91 },
  { label: "FAQ", score: 64 },
  { label: "Internal Links", score: 70 },
  { label: "Performance", score: 85 },
  { label: "Content", score: 77 },
  { label: "Entities", score: 63 },
  { label: "E-E-A-T", score: 72 },
  { label: "Citations", score: 68 },
];

export const COMPARISON_ROWS: {
  metric: string;
  you: number;
  competitor: number;
}[] = [
  { metric: "AI Citation Readiness", you: 68, competitor: 41 },
  { metric: "Structured Data Coverage", you: 92, competitor: 55 },
  { metric: "E-E-A-T Signals", you: 74, competitor: 60 },
  { metric: "Core Web Vitals", you: 88, competitor: 72 },
  { metric: "Entity Coverage", you: 63, competitor: 38 },
];

export const AUDIT_ISSUES: { severity: "critical" | "important" | "minor"; label: string }[] = [
  { severity: "critical", label: "Missing structured data (FAQPage, Article)" },
  { severity: "critical", label: "No author profile / E-E-A-T signals" },
  { severity: "important", label: "Largest Contentful Paint 4.1s (target < 2.5s)" },
  { severity: "important", label: "Thin entity coverage for primary topic" },
  { severity: "minor", label: "2 images missing descriptive alt text" },
];

export const TESTIMONIALS: { quote: string; name: string; role: string }[] = [
  { quote: "We finally understood why ChatGPT kept citing competitors instead of us. Fixed it in a week.", name: "Maya Chen", role: "Head of Growth, Lumen" },
  { quote: "The AI-visibility breakdown is unlike any SEO tool I've used. Every score comes with a reason and a fix.", name: "Dimitri Vasquez", role: "Founder, Stackpine" },
  { quote: "Free, instant, and shockingly thorough. It replaced two paid audits in our stack.", name: "Priya Nair", role: "Content Lead, Northbeam" },
  { quote: "The action plan prioritization meant our small team knew exactly what to ship first.", name: "Tom Whitfield", role: "SEO Manager, Cordova" },
];

export type PricingTier = {
  name: string;
  tagline: string;
  /** Per-month price in INR. `monthly` = billed monthly, `annual` = per-month when billed yearly. */
  monthly: number;
  annual: number;
  /** Highlighted "hero" feature for this tier. */
  highlight: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

/** Currency shown on the pricing cards. */
export const PRICING_CURRENCY = "₹";

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    tagline: "Everything you need to start ranking inside AI.",
    monthly: 0,
    annual: 0,
    highlight: "Data saved on this device",
    features: [
      "Unlimited website analyses",
      "Full SEO + AI-visibility report",
      "12-signal AI scoring with explanations",
      "Prioritized action plan",
      "History stored on this device only",
      "60-second wait between analyses",
    ],
    cta: "Start free",
  },
  {
    name: "Pro",
    tagline: "Cloud-synced analysis for people who optimize everywhere.",
    monthly: 49,
    annual: 39,
    highlight: "Cloud sync across all your devices",
    features: [
      "Everything in Free",
      "Cloud account — your data syncs across every device",
      "Faster 50-second cooldown between analyses",
      "Competitor gap analysis",
      "Scheduled re-audits & score-change alerts",
      "Bulk URL analysis (up to 50 at once)",
      "Exportable PDF / CSV reports",
    ],
    cta: "Get Pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    tagline: "Instant analysis, API access, and team workspaces.",
    monthly: 99,
    annual: 89,
    highlight: "Instant analyses — no cooldown",
    features: [
      "Everything in Pro",
      "Instant analyses — zero-second cooldown",
      "Cloud account synced across unlimited devices",
      "API access & webhooks",
      "Team workspaces, roles & SSO",
      "White-labeled reports",
      "Priority support & SLA",
    ],
    cta: "Get Enterprise",
  },
];

export const FAQS = [
  { q: "What is AI visibility?", a: "Traditional SEO gets you ranked on Google. AI visibility measures how well your content can be discovered, understood, and cited by AI answer engines like ChatGPT, Gemini, Claude, and Perplexity — increasingly where your audience starts." },
  { q: "How is AI visibility different from traditional SEO?", a: "SEO optimizes for a ranked list of blue links. AI visibility optimizes for being the answer an engine generates and cites. That means clean structure, extractable facts, strong entities, and trust signals — not just keywords and backlinks. RankLens measures both so you don't have to trade one for the other." },
  { q: "Is RankLens really free?", a: "Yes. Every website analysis, every report, every recommendation is free. No paywalls on core analysis, no locked features. Your analysis history stays private in your own browser. (Optional Pro and Enterprise plans add team and API features on top — they never lock the core audit.)" },
  { q: "Do I need an account to use RankLens?", a: "No. You can run a full analysis with no sign-up and no login. An account is only needed if you want optional Pro features like cloud sync across devices, scheduled re-audits, or team workspaces." },
  { q: "What can I analyze?", a: "Any public website, landing page, blog post, or product page. Paste a URL and get a full SEO + AI-visibility report in seconds. (YouTube and Instagram analysis are coming soon.)" },
  { q: "Which AI engines does RankLens cover?", a: "We assess readiness for the major answer engines — ChatGPT, Gemini, Claude, Perplexity, Copilot, and Grok — scoring each on how easily it can find, understand, and cite your content." },
  { q: "Do you store my data?", a: "No. Pages are analyzed on demand and never stored on our servers. Your projects and analysis history live entirely in your browser via IndexedDB, so your research stays private to you." },
  { q: "How is the AI visibility score calculated?", a: "We evaluate 12 evidence-based signals — structured data, semantic HTML, readability, crawlability, metadata, FAQs, internal linking, performance, content structure, entities, E-E-A-T, and citation readiness — and explain why each one matters and how to improve it." },
  { q: "How accurate are the scores?", a: "Every score is rule-based and transparent — derived from a real browser render plus a Lighthouse audit, not a black box. Each point is traced back to a concrete, observable signal on your page, so you can verify exactly why a score is what it is." },
  { q: "How long does an analysis take?", a: "Usually a few seconds. We render your page like a real browser, run the audit, and score all 12 signals on demand — there's no queue and no waiting for a crawl to finish." },
  { q: "What makes content more likely to be cited by AI?", a: "Clear, well-structured answers near the top of the page; valid structured data; strong entity coverage; quotable, factual statements; and visible trust signals (authorship, freshness, sources). RankLens flags exactly which of these you're missing and how to add them." },
  { q: "How often should I re-analyze my site?", a: "Whenever you ship meaningful content or technical changes, and otherwise every few weeks to catch drift. Pro plans can schedule automatic re-audits and alert you when a score changes." },
];

export const WHAT_WE_MEASURE = [
  "Structured data & semantic HTML — so AI can identify and parse your page",
  "Crawlability & metadata — whether engines can reach and label every page",
  "Core Web Vitals — LCP, CLS, FCP and Speed Index from a real Lighthouse run",
  "Content structure, entities, and FAQ formatting — how extractable your answers are",
  "Internal linking & site architecture — how discoverable your deeper pages are",
  "Readability & answer formatting — whether AI can lift a clean answer from your copy",
  "Topical authority & entity coverage — the depth that makes you the obvious source",
  "E-E-A-T and citation readiness — the trust signals engines weigh before quoting you",
];

export const SOURCES = [
  { label: "Schema.org — the structured-data vocabulary AI engines parse", href: "https://schema.org/" },
  { label: "Google Search Central — SEO documentation & best practices", href: "https://developers.google.com/search/docs" },
  { label: "Google Search Essentials (Webmaster Guidelines)", href: "https://developers.google.com/search/docs/essentials" },
  { label: "web.dev — Core Web Vitals", href: "https://web.dev/articles/vitals" },
  { label: "W3C Web Content Accessibility Guidelines (WCAG)", href: "https://www.w3.org/WAI/standards-guidelines/wcag/" },
  { label: "Search engine optimization (Wikipedia)", href: "https://en.wikipedia.org/wiki/Search_engine_optimization" },
  { label: "W3C web standards", href: "https://www.w3.org/standards/" },
];

// Freshness + authorship signals — kept here so the visible byline/dates and
// the JSON-LD always stay in sync.
export const PUBLISHED_ISO = "2026-05-08";
export const UPDATED_ISO = "2026-06-19";
export const PUBLISHED_LABEL = "May 8, 2026";
export const UPDATED_LABEL = "June 19, 2026";

export const TRUST_INDICATORS = [
  "No login required",
  "Results in seconds",
  "100% free core analysis",
  "Private — stored in your browser",
];
