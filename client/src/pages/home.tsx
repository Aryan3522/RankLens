import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Search, ArrowRight, Sparkles, Brain, Activity, Zap, ShieldCheck,
  Globe, FileText, Tags, GitBranch, Gauge, BadgeCheck, Quote,
  Command, ChevronRight, Users, Mail, CalendarClock, ExternalLink, Check, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GlowCard } from "@/components/ui/glow-card";
import { useCreateAnalysis } from "@/api";
import { normalizeUrl } from "@/lib/utils";
import { toast } from "sonner";

const AI_ENGINES = ["ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot", "Grok"];

const HOW_IT_WORKS = [
  { n: "01", title: "Fetch", desc: "We crawl your page and render it like a real browser." },
  { n: "02", title: "Analyze SEO", desc: "Lighthouse audits, metadata, headings, links, and Core Web Vitals." },
  { n: "03", title: "Analyze AI visibility", desc: "Structure, entities, E-E-A-T, and citation readiness across AI engines." },
  { n: "04", title: "Find opportunities", desc: "Keyword gaps, missing entities, and quick wins surfaced automatically." },
  { n: "05", title: "Recommend", desc: "A prioritized action plan with the impact of each fix." },
];

const FEATURES = [
  { icon: Brain, title: "AI Visibility Score", desc: "See exactly how discoverable you are to ChatGPT, Gemini, Claude & Perplexity — with a per-category breakdown that explains every point." },
  { icon: Activity, title: "Deep SEO Audit", desc: "Real Lighthouse audits for performance, accessibility, best practices, and SEO — not a guessed score." },
  { icon: BadgeCheck, title: "E-E-A-T Signals", desc: "Authorship, freshness, and authoritative citations — the trust signals AI engines weigh before quoting you." },
  { icon: Quote, title: "Citation Readiness", desc: "We detect the quotable facts, stats, and definitions AI assistants love to cite — and what you're missing." },
  { icon: Tags, title: "Entity Coverage", desc: "Find the brands, products, and topics you should make explicit so AI maps your page correctly." },
  { icon: Gauge, title: "Core Web Vitals", desc: "LCP, CLS, FCP and Speed Index measured live, with concrete optimization steps." },
];

const FAQS = [
  { q: "What is AI visibility?", a: "Traditional SEO gets you ranked on Google. AI visibility measures how well your content can be discovered, understood, and cited by AI answer engines like ChatGPT, Gemini, Claude, and Perplexity — increasingly where your audience starts." },
  { q: "Is RankLens really free?", a: "Yes. Every analysis, every report, every recommendation is free. No paywalls, no locked features, no premium reports. Your analysis history stays private in your own browser." },
  { q: "What can I analyze?", a: "Any public website, landing page, blog post, or product page. Paste a URL and get a full SEO + AI-visibility report in seconds. (YouTube and Instagram analysis are coming soon.)" },
  { q: "Do you store my data?", a: "No. Pages are analyzed on demand and never stored on our servers. Your projects and analysis history live entirely in your browser via IndexedDB." },
  { q: "How is the AI visibility score calculated?", a: "We evaluate 12 evidence-based signals — structured data, semantic HTML, readability, crawlability, metadata, FAQs, internal linking, performance, content structure, entities, E-E-A-T, and citation readiness — and explain why each one matters and how to improve it." },
];

// Freshness + authorship signals (kept in one place so the visible
// byline/dates and the JSON-LD stay in sync).
const PUBLISHED_ISO = "2026-05-08";
const UPDATED_ISO = "2026-06-19";
const PUBLISHED_LABEL = "May 8, 2026";
const UPDATED_LABEL = "June 19, 2026";

// Authoritative outbound references — these back up our methodology and
// are the kind of well-sourced links AI answer engines reward.
const SOURCES = [
  { label: "Schema.org — the structured-data vocabulary AI engines parse", href: "https://schema.org/" },
  { label: "Search engine optimization (Wikipedia)", href: "https://en.wikipedia.org/wiki/Search_engine_optimization" },
  { label: "W3C web standards", href: "https://www.w3.org/standards/" },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const createAnalysis = useCreateAnalysis();
  const [, navigate] = useLocation();

  // Inject FAQPage structured data derived from the visible FAQ above, so AI
  // answer engines can extract our Q&A directly. Built from the FAQS array to
  // avoid the schema drifting from the rendered content.
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-faq-schema", "true");
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  const handleAnalyze = () => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      toast.error("Enter a URL", { description: "Paste a website, landing page, or blog URL to analyze." });
      return;
    }
    createAnalysis.mutate(
      { data: { url: normalized, type: "website", projectId: null } },
      {
        onSuccess: (data: any) => {
          toast.info("Analysis started", { description: "Crawling your page and scoring AI visibility…" });
          if (data?.id) navigate(`/analyses/${data.id}`);
        },
        onError: () => toast.error("Couldn't start analysis", { description: "Please try again in a moment." }),
      },
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Command className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-lg font-black tracking-tighter">RankLens</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/analyzer">
              <Button variant="ghost" size="sm" className="text-sm font-semibold">Analyzer</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="gap-2 font-bold">
                Launch App <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="aurora-bg relative px-4 pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-cyan-300 mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" /> SEO + AI Visibility Intelligence
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] mb-6"
            >
              Rank inside <span className="text-gradient">AI</span>,<br className="hidden sm:block" /> not just Google.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }}
              className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed mb-10"
            >
              <strong className="text-foreground font-semibold">RankLens</strong> shows you why you're not being discovered, ranked, or cited — by search engines
              <em className="text-foreground not-italic font-semibold"> and</em> by <strong className="text-foreground font-semibold">AI assistants like ChatGPT, Gemini, Claude, and Perplexity</strong>. Free, instant, and private.
            </motion.p>

            {/* Byline + freshness — E-E-A-T signals for AI answer engines */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 }}
              className="byline flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground/80 mb-8"
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400/70" />
                By the <strong className="text-foreground/90 font-semibold">RankLens research team</strong>
              </span>
              <span className="hidden sm:inline text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-cyan-400/70" />
                Published <time dateTime={PUBLISHED_ISO}>{PUBLISHED_LABEL}</time>
                <span className="text-muted-foreground/40">·</span>
                Updated <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>
              </span>
            </motion.div>

            {/* Hero input */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
              className="max-w-2xl mx-auto"
            >
              <div className="glass-panel glow-border-effect rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-3 px-4">
                  <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="Paste a website, landing page, or blog URL"
                    className="w-full bg-transparent py-3.5 text-base outline-none placeholder:text-muted-foreground/60"
                    aria-label="URL to analyze"
                  />
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={createAnalysis.isPending}
                  size="lg"
                  className="h-auto py-3.5 px-7 text-base font-bold gap-2 shrink-0"
                >
                  {createAnalysis.isPending ? "Starting…" : <>Analyze <Zap className="w-4 h-4" /></>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-3">No login required · Results in seconds · 100% free</p>
            </motion.div>
          </div>
        </section>

        {/* AI engine marquee */}
        <section className="border-y border-white/5 py-8 overflow-hidden">
          <p className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold mb-6">
            Optimized for the engines your audience actually asks
          </p>
          <div className="relative">
            <div className="marquee-track gap-12 px-6">
              {[...AI_ENGINES, ...AI_ENGINES].map((name, i) => (
                <span key={i} className="text-2xl font-black tracking-tight text-muted-foreground/40 whitespace-nowrap flex items-center gap-2.5">
                  <Brain className="w-5 h-5 text-cyan-500/40" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Dual value props */}
        <section className="px-4 py-20 md:py-28">
          <div className="container mx-auto max-w-6xl grid md:grid-cols-2 gap-6">
            <GlowCard className="p-8" glowColor="rgba(16,185,129,0.12)">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">SEO Visibility</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-3">Why you're not ranking on Google</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Real Lighthouse audits, metadata and heading analysis, internal linking, and Core Web Vitals — every score explained, every fix spelled out.
              </p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">92</span>
                <span className="text-sm text-muted-foreground pb-2">/ 100 SEO health</span>
              </div>
            </GlowCard>

            <GlowCard className="p-8" glowColor="rgba(168,85,247,0.14)">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-purple-400">AI Visibility</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-3">Why AI engines aren't citing you</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The differentiator. We score how well AI systems can crawl, understand, trust, and quote your content — across 12 evidence-based signals.
              </p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">68</span>
                <span className="text-sm text-muted-foreground pb-2">/ 100 AI-ready</span>
              </div>
            </GlowCard>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-16 border-y border-white/5 bg-white/[0.015]">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-center mb-3">How it works</h2>
            <p className="text-center text-muted-foreground mb-12">Five steps, start to finish — usually under ten seconds.</p>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 list-none p-0 m-0">
              {HOW_IT_WORKS.map((step, i) => (
                <motion.li
                  key={step.n}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-white/5 bg-black/30 p-5"
                >
                  <div className="text-xs font-mono font-bold text-cyan-400/70 mb-3">{step.n}</div>
                  <h4 className="font-bold tracking-tight mb-1.5">{step.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-20 md:py-28">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-center mb-3">Everything a modern audit needs</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">An SEO consultant, AI-visibility strategist, and technical auditor — combined into one free tool.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: (i % 3) * 0.08 }}
                >
                  <GlowCard className="p-6 h-full">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                      <f.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className="font-bold tracking-tight mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </GlowCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About / E-E-A-T */}
        <section id="about" className="px-4 py-16 border-t border-white/5 bg-white/[0.015]">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">About RankLens</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">Who's behind RankLens</h2>
            <p className="byline text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground font-semibold">RankLens</strong> is built by an independent team of
              <strong className="text-foreground font-semibold"> SEO and AI-search researchers</strong>. We study how
              answer engines like ChatGPT, Gemini, Claude, and Perplexity select and cite sources, then turn those
              findings into a transparent, evidence-based score — every point is explained, nothing is guessed.
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/80 mb-6">
              <CalendarClock className="w-3.5 h-3.5 text-cyan-400/70" />
              Published <time dateTime={PUBLISHED_ISO}>{PUBLISHED_LABEL}</time>
              <span className="text-muted-foreground/40">·</span>
              Last updated <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>
            </p>

            <h3 className="font-bold tracking-tight mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> What every analysis measures
            </h3>
            <ul className="space-y-2 mb-8 text-sm text-muted-foreground">
              {[
                "Structured data & semantic HTML — so AI can identify and parse your page",
                "Crawlability, metadata, and Core Web Vitals — the technical foundations",
                "Content structure, entities, and FAQ formatting — how extractable your answers are",
                "E-E-A-T and citation readiness — the trust signals engines weigh before quoting you",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <ChevronRight className="w-4 h-4 text-cyan-400/70 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 className="font-bold tracking-tight mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" /> Sources &amp; standards we build on
            </h3>
            <ul className="space-y-2 text-sm">
              {SOURCES.map((s) => (
                <li key={s.href} className="flex items-start gap-2.5">
                  <ExternalLink className="w-4 h-4 text-cyan-400/70 mt-0.5 shrink-0" />
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-white/20 hover:decoration-cyan-400/60 transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-16 border-t border-white/5">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-center mb-10">Questions, answered</h2>
            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border border-white/10 rounded-xl px-5 bg-black/20">
                  <AccordionTrigger className="text-left font-bold tracking-tight hover:no-underline">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20 md:py-28">
          <div className="container mx-auto max-w-4xl aurora-bg relative rounded-3xl border border-white/10 bg-black/40 p-10 md:p-16 text-center overflow-hidden">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">See how AI sees your site</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Run your first analysis now — no account, no cost.</p>
            <Link href="/analyzer">
              <Button size="lg" className="h-14 px-8 text-lg font-bold gap-2">
                Start analyzing <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-500" />
            <p className="text-xs">© 2026 RankLens · SEO &amp; AI Visibility Intelligence · 100% free, 100% private</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <a href="#about" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> About</a>
            <a href="mailto:contact@ranklens.app" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Contact</a>
            <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Dashboard</Link>
            <Link href="/analyzer" className="hover:text-foreground transition-colors flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Analyzer</Link>
            <Link href="/keywords" className="hover:text-foreground transition-colors flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Keywords</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
