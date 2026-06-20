import { useState } from "react";
import { useGetAnalysis, getGetAnalysisQueryKey, useRerunAnalysis, getListAnalysesQueryKey, useDeleteAnalysis } from "@/api";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Info,
  Globe, Youtube, Instagram, ExternalLink, ChevronDown, ChevronUp, Code, Wrench, BookOpen, Trash2,
  Activity, Zap, ShieldCheck, Accessibility as AccessibilityIcon,
  Brain, Sparkles, Eye, Lightbulb, Download, ListChecks, BadgeCheck, Quote, Tags, Cpu, Rocket,
  Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GlowCard } from "@/components/ui/glow-card";
import { AnalysisProgress } from "@/components/analysis-progress";
import { downloadAnalysisReport, copyAnalysisReport } from "@/lib/export-analysis";
import { Lazy3D } from "@/components/three/Lazy3D";
import { UniverseFallback } from "@/components/three/fallbacks/UniverseFallback";
import { SignalRadar } from "@/components/charts/SignalRadar";
import type { AiCategory, AiEngineReadiness, ActionItem } from "@/lib/storage";

const universeLoader = () => import("@/components/three/scenes/AIVisibilityUniverse");

// ======================================================
// SMALL HELPERS
// ======================================================

function ScoreCard({ label, score, icon: Icon }: { label: string; score: number | null; icon: any }) {
  const scoreColor = score === null ? "#94a3b8" : score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <GlowCard className="p-4 flex flex-col items-center justify-center text-center">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-black tracking-tighter" style={{ color: scoreColor, textShadow: `0 0 10px ${scoreColor}40` }}>{score ?? "—"}</div>
      <div className="w-full h-1.5 bg-muted/40 rounded-full mt-3 overflow-hidden border border-white/5">
        <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_currentColor]" style={{ width: `${score ?? 0}%`, backgroundColor: scoreColor, color: scoreColor }} />
      </div>
    </GlowCard>
  );
}

function ScoreRing({ value, color, label, sublabel }: { value: number; color: string; label: string; sublabel: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-7 w-full">
      <div className="relative w-32 h-32 sm:w-44 sm:h-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="75%" outerRadius="100%" data={[{ value, fill: color }]} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "rgba(255,255,255,0.05)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl sm:text-5xl font-black tracking-tighter drop-shadow-[0_0_15px_currentColor]" style={{ color }}>{value}</span>
        </div>
      </div>
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
        <span className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-md border w-fit mb-2 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: `${color}15`, color, borderColor: `${color}40` }}>{label}</span>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">{sublabel}</p>
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <XCircle className="w-4 h-4 text-red-500 shrink-0 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />;
  if (severity === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />;
  return <Info className="w-4 h-4 text-cyan-500 shrink-0 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = {
    high: "bg-red-500/20 text-red-400 border-red-500/50",
    critical: "bg-red-500/20 text-red-400 border-red-500/50",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    important: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    low: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
    "nice-to-have": "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  }[priority] ?? "bg-white/10 text-muted-foreground border-white/20";
  return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-widest border ${cls}`}>{priority}</span>;
}

function TypeIcon({ type }: { type: string }) {
  if (type === "youtube") return <Youtube className="w-4 h-4" />;
  if (type === "instagram") return <Instagram className="w-4 h-4" />;
  return <Globe className="w-4 h-4" />;
}

type SeoIssue = {
  id: string; analysisId: string; category: string; severity: string; title: string; description: string;
  whyItMatters?: string | null; affectedUrl?: string | null; element?: string | null; lineNumber?: number | null;
  fixExample?: string | null; helpUrl?: string | null;
};

function IssueCard({ issue }: { issue: SeoIssue }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(issue.element || issue.fixExample || issue.lineNumber || issue.helpUrl || issue.whyItMatters);
  const borderColor = issue.severity === "critical" ? "border-red-500/30" : issue.severity === "warning" ? "border-amber-500/30" : "border-cyan-500/30";
  const glow = issue.severity === "critical" ? "rgba(239,68,68,0.15)" : issue.severity === "warning" ? "rgba(245,158,11,0.15)" : "rgba(6,182,212,0.15)";

  return (
    <GlowCard className={`p-0 overflow-hidden ${borderColor}`} glowColor={glow}>
      <button className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/5 transition-colors" onClick={() => hasDetails && setExpanded(!expanded)} disabled={!hasDetails}>
        <div className="mt-0.5"><SeverityIcon severity={issue.severity} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="font-bold text-foreground text-sm tracking-tight break-words">{issue.title}</p>
            <Badge variant="outline" className="text-[9px] uppercase tracking-widest py-0 shrink-0">{issue.category}</Badge>
            {issue.lineNumber && <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded shrink-0">Line {issue.lineNumber}</span>}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed break-words">{issue.description}</p>
        </div>
        {hasDetails && <div className="shrink-0 text-muted-foreground mt-0.5 bg-muted/40 p-1 rounded border border-white/5">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>}
      </button>

      {expanded && hasDetails && (
        <div className="border-t border-white/10 bg-muted/40 backdrop-blur-md divide-y divide-white/5">
          {issue.whyItMatters && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1.5"><Info className="w-3.5 h-3.5 text-cyan-400" /><span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Why it matters</span></div>
              <p className="text-sm text-foreground/90 leading-relaxed">{issue.whyItMatters}</p>
            </div>
          )}
          {issue.element && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2"><Code className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current element</span></div>
              <pre className="text-xs bg-muted/60 text-foreground/90 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono border border-white/5">{issue.element}</pre>
            </div>
          )}
          {issue.fixExample && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2"><Wrench className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">How to fix</span></div>
              <pre className="text-xs bg-muted/60 text-emerald-600 dark:text-emerald-300 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono border border-emerald-500/20">{issue.fixExample}</pre>
            </div>
          )}
          {issue.helpUrl && (
            <div className="px-4 py-3 bg-white/[0.02]">
              <a href={issue.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-medium"><BookOpen className="w-3.5 h-3.5" />Read official documentation<ExternalLink className="w-3 h-3 opacity-60" /></a>
            </div>
          )}
        </div>
      )}
    </GlowCard>
  );
}

type Recommendation = { id: string; analysisId: string; priority: string; category: string; title: string; description: string; estimatedImpact: number; dismissed: boolean; createdAt: string };

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const impactColor = rec.estimatedImpact >= 80 ? "text-emerald-400" : rec.estimatedImpact >= 60 ? "text-amber-400" : "text-cyan-400";
  const impactBg = rec.estimatedImpact >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : rec.estimatedImpact >= 60 ? "bg-amber-500/10 border-amber-500/30" : "bg-cyan-500/10 border-cyan-500/30";
  const glowColor = rec.estimatedImpact >= 80 ? "rgba(16,185,129,0.15)" : rec.estimatedImpact >= 60 ? "rgba(245,158,11,0.15)" : "rgba(6,182,212,0.15)";
  return (
    <GlowCard className="p-4" glowColor={glowColor}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={rec.priority} />
          <Badge variant="outline" className="text-[9px] uppercase tracking-widest py-0 border-white/20">{rec.category}</Badge>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-widest border shrink-0 ${impactBg} ${impactColor}`}>+{rec.estimatedImpact} Impact</span>
      </div>
      <p className="font-bold text-foreground text-sm mb-1.5 tracking-tight break-words">{rec.title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed break-words">{rec.description}</p>
    </GlowCard>
  );
}

// ======================================================
// AI VISIBILITY SUB-COMPONENTS
// ======================================================

const STATUS_COLOR: Record<string, string> = { strong: "#10b981", moderate: "#f59e0b", weak: "#ef4444" };

function CategoryCard({ cat }: { cat: AiCategory }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLOR[cat.status] ?? "#94a3b8";
  const hasDetail = cat.strengths.length + cat.weaknesses.length + cat.recommendations.length > 0;
  return (
    <GlowCard className="p-0 overflow-hidden" glowColor={`${color}22`}>
      <button className="w-full text-left p-4 hover:bg-white/5 transition-colors" onClick={() => hasDetail && setOpen(!open)} disabled={!hasDetail}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="font-bold text-sm tracking-tight">{cat.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tabular-nums" style={{ color }}>{cat.score}</span>
            {hasDetail && (open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
          </div>
        </div>
        <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden border border-white/5">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
        </div>
      </button>
      {open && hasDetail && (
        <div className="border-t border-white/10 bg-muted/40 p-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{cat.whatItMeans}</p>
          {cat.strengths.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5"><Sparkles className="w-3 h-3 text-emerald-400" /><span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Strengths</span></div>
              <ul className="space-y-1">{cat.strengths.map((s, i) => <li key={i} className="text-xs text-foreground/90 flex gap-2"><span className="text-emerald-500">•</span>{s}</li>)}</ul>
            </div>
          )}
          {cat.weaknesses.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5"><Eye className="w-3 h-3 text-amber-400" /><span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Gaps</span></div>
              <ul className="space-y-1">{cat.weaknesses.map((w, i) => <li key={i} className="text-xs text-foreground/90 flex gap-2"><span className="text-amber-500">•</span>{w}</li>)}</ul>
            </div>
          )}
          {cat.recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5"><Lightbulb className="w-3 h-3 text-purple-400" /><span className="text-[9px] font-bold uppercase tracking-widest text-purple-400">How to fix</span></div>
              <ul className="space-y-1">{cat.recommendations.map((r, i) => <li key={i} className="text-xs text-foreground/90 flex gap-2"><span className="text-purple-500">•</span>{r}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </GlowCard>
  );
}

function EngineBar({ engine }: { engine: AiEngineReadiness }) {
  const color = STATUS_COLOR[engine.status] ?? "#94a3b8";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold tracking-tight flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-muted-foreground" />{engine.engine}</span>
        <span className="text-sm font-black tabular-nums" style={{ color }}>{engine.score}</span>
      </div>
      <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden border border-white/5">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${engine.score}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{engine.note}</p>
    </div>
  );
}

function ActionPlanCard({ item, index }: { item: ActionItem; index: number }) {
  const accent = item.priority === "critical" ? "#ef4444" : item.priority === "important" ? "#f59e0b" : "#06b6d4";
  return (
    <GlowCard className="p-5" glowColor={`${accent}22`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border" style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}15` }}>{index + 1}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <PriorityBadge priority={item.priority} />
            <Badge variant="outline" className="text-[9px] uppercase tracking-widest py-0 border-white/20">{item.category}</Badge>
            <span className="text-[10px] font-bold text-emerald-400 ml-auto">+{item.estimatedImpact} impact</span>
          </div>
          <p className="font-bold text-foreground text-sm tracking-tight mb-2">{item.title}</p>
          {item.steps.length > 0 && (
            <ul className="space-y-1.5">{item.steps.map((s, i) => <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2"><span className="text-cyan-500 mt-0.5">→</span>{s}</li>)}</ul>
          )}
        </div>
      </div>
    </GlowCard>
  );
}

function SectionEmpty({ icon: Icon, title, desc, glow }: { icon: any; title: string; desc: string; glow?: string }) {
  return (
    <GlowCard className="flex flex-col items-center justify-center py-16 text-center border-dashed" glowColor={glow}>
      <Icon className="w-12 h-12 text-emerald-500 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
      <p className="font-bold text-foreground text-lg mb-1.5 tracking-tight">{title}</p>
      <p className="text-sm text-muted-foreground max-w-sm">{desc}</p>
    </GlowCard>
  );
}

// ======================================================
// MAIN
// ======================================================

export default function AnalysisDetail({ id }: { id: string }) {
  const { data: analysis, isLoading } = useGetAnalysis(id, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id),
      refetchInterval: (query: any) => {
        const status = (query.state.data as any)?.status;
        return status === "running" || status === "queued" ? 2000 : false;
      },
    },
  });
  const rerun = useRerunAnalysis();
  const deleteAnalysis = useDeleteAnalysis();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedScope, setCopiedScope] = useState<"all" | "seo" | "ai" | null>(null);

  const handleCopy = async (scope: "all" | "seo" | "ai" = "all") => {
    const labels = { all: "Full fix brief", seo: "SEO fix brief", ai: "AI visibility fix brief" };
    const ok = await copyAnalysisReport(analysis as any, scope);
    if (ok) {
      setCopiedScope(scope);
      toast.success(`${labels[scope]} copied`, { description: "Paste it into any AI assistant — it has everything needed." });
      setTimeout(() => setCopiedScope((c) => (c === scope ? null : c)), 2500);
    } else {
      toast.error("Couldn't copy", { description: "Use the download button instead." });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
    setDeleting(true);
    deleteAnalysis.mutate({ id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() }); toast.success("Analysis deleted"); navigate("/analyzer"); },
      onError: () => { toast.error("Couldn't delete analysis"); setDeleting(false); setConfirmDelete(false); },
    });
  };

  const handleRerun = () => {
    rerun.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAnalysisQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
        toast.info("Re-running analysis", { description: "This page will update automatically." });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto space-y-6">
        <Skeleton className="h-12 w-full max-w-sm rounded-xl" />
        <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
      </div>
    );
  }
  if (!analysis) return <div className="p-6 text-muted-foreground text-center py-20 font-mono">_analysis_not_found</div>;

  // Unsupported (YouTube / Instagram) — honest "coming soon", never fake data.
  if (analysis.status === "unsupported") {
    return (
      <div className="w-full max-w-[900px] mx-auto pt-10">
        <Link href="/analyzer"><Button variant="ghost" className="mb-6 gap-2"><ArrowLeft className="w-4 h-4" /> Back to analyzer</Button></Link>
        <GlowCard className="p-10 text-center" glowColor="rgba(245,158,11,0.12)">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5"><TypeIcon type={analysis.type} /></div>
          <h1 className="text-2xl font-black tracking-tight mb-2">Coming soon</h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">{analysis.message || "This content type isn't analyzable yet."}</p>
          <Link href="/analyzer"><Button className="gap-2">Analyze a website instead <Globe className="w-4 h-4" /></Button></Link>
        </GlowCard>
      </div>
    );
  }

  const running = analysis.status === "running" || analysis.status === "queued";

  const seoScore = analysis.seoScore ?? 0;
  const seoColor = !analysis.seoScore ? "#94a3b8" : seoScore >= 80 ? "#10b981" : seoScore >= 60 ? "#f59e0b" : "#ef4444";
  const seoLabel = !analysis.seoScore ? "—" : seoScore >= 80 ? "Optimized" : seoScore >= 60 ? "Needs Work" : "Critical";

  const aiScore = analysis.aiVisibilityScore ?? 0;
  const aiColor = aiScore >= 70 ? "#a855f7" : aiScore >= 40 ? "#fbbf24" : "#ef4444";
  const aiLabel = aiScore >= 70 ? "AI-Ready" : aiScore >= 40 ? "Developing" : "Low Visibility";

  const issues = (analysis.issues ?? []) as SeoIssue[];
  const recommendations = (analysis.recommendations ?? []) as Recommendation[];
  const categories = (analysis.aiVisibilityCategories ?? []) as AiCategory[];
  const engines = (analysis.aiEngineReadiness ?? []) as AiEngineReadiness[];
  const actionPlan = (analysis.actionPlan ?? []) as ActionItem[];
  const llm = analysis.llmSummary;

  const TECHNICAL_CATEGORIES = ["Performance", "Crawlability", "Technical SEO"];
  const criticalIssues = issues.filter(i => i.severity === "critical");
  const warnings = issues.filter(i => i.severity === "warning");
  const technicalIssues = issues.filter(i => TECHNICAL_CATEGORIES.includes(i.category));
  // SEO tab shows content/meta warnings only — technical warnings live in the Technical tab.
  const seoWarnings = warnings.filter(i => !TECHNICAL_CATEGORIES.includes(i.category));

  const eeat = categories.find(c => c.id === "eeat");
  const citation = categories.find(c => c.id === "citation-readiness");
  const entity = categories.find(c => c.id === "entity-signals");

  // Keyword & entity opportunities, synthesized.
  const entityGaps = llm?.entityGaps ?? [];
  const opportunityRecs = [
    ...(entity?.recommendations ?? []),
    ...(citation?.recommendations ?? []),
  ];

  const sectionCount = (n: number) => (n > 0 ? <Badge className="ml-2 px-1.5 h-5 min-w-[20px] justify-center text-[10px] bg-white/10 border border-white/15">{n}</Badge> : null);

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/analyzer"><button className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/40 border border-white/10 text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/30 transition-all shrink-0"><ArrowLeft className="w-5 h-5" /></button></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-black text-foreground truncate break-all tracking-tight">{analysis.url}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2.5 py-0.5 bg-white/5 rounded border border-white/10"><TypeIcon type={analysis.type} />{analysis.type}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono px-2.5 py-0.5 bg-muted/30 rounded border border-white/5">{new Date(analysis.createdAt).toLocaleDateString()}</span>
              {running && <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-400 font-bold px-2.5 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/30 animate-pulse"><RefreshCw className="w-3 h-3 animate-spin" />{analysis.status === "queued" ? "In Queue" : "Analyzing"}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {analysis.status === "completed" && (
            <>
              <Button variant="outline" onClick={() => handleCopy("all")} className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-10 gap-2 px-3" title="Copy the full AI-ready fix brief (SEO + AI visibility) to paste into any AI assistant">
                {copiedScope === "all" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">{copiedScope === "all" ? "Copied" : "Copy for AI"}</span>
              </Button>
              <Button variant="outline" size="icon" onClick={() => downloadAnalysisReport(analysis as any)} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 w-10 h-10" title="Download the AI fix brief (.md)"><Download className="w-4 h-4" /></Button>
            </>
          )}
          <Button variant="outline" size="icon" onClick={handleRerun} disabled={rerun.isPending || running} className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 w-10 h-10" title="Re-run"><RefreshCw className={`w-4 h-4 ${rerun.isPending ? "animate-spin" : ""}`} /></Button>
          <Button variant={confirmDelete ? "destructive" : "outline"} size="icon" onClick={handleDelete} disabled={deleting} className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400 w-10 h-10" title={confirmDelete ? "Confirm delete" : "Delete"}>{deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</Button>
        </div>
      </div>

      {/* Running → staged progress */}
      {running ? (
        <GlowCard className="py-12 px-6" glowColor="rgba(6,182,212,0.12)">
          <div className="text-center mb-6"><p className="font-black text-lg neon-text-cyan tracking-tight">Generating your report</p></div>
          <AnalysisProgress status={analysis.status} />
        </GlowCard>
      ) : (
        <>
          {/* Executive summary */}
          {analysis.summary?.headline && (
            <GlowCard className="p-5 sm:p-6" glowColor="rgba(6,182,212,0.1)">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0"><Rocket className="w-4 h-4 text-cyan-400" /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-1">Summary</p>
                  <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">{analysis.summary.headline}</p>
                </div>
              </div>
            </GlowCard>
          )}

          {/* Hero score rings */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
            <GlowCard className="p-5 sm:p-7 relative" glowColor="rgba(16,185,129,0.1)">
              <div className="absolute top-4 left-4 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" /><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SEO Health</span></div>
              <button onClick={() => handleCopy("seo")} title="Copy a prompt + all SEO/performance fixes for an AI assistant" className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                {copiedScope === "seo" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedScope === "seo" ? "Copied" : "Copy SEO fixes"}
              </button>
              <div className="mt-6"><ScoreRing value={seoScore} color={seoColor} label={seoLabel} sublabel="Technical SEO, performance, and accessibility standing." /></div>
            </GlowCard>
            {analysis.aiVisibilityScore != null && (
              <GlowCard className="p-5 sm:p-7 relative" glowColor="rgba(168,85,247,0.12)">
                <div className="absolute top-4 left-4 flex items-center gap-2"><Brain className="w-4 h-4 text-purple-400" /><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Visibility</span></div>
                <button onClick={() => handleCopy("ai")} title="Copy a prompt + all AI-visibility fixes for an AI assistant" className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-colors">
                  {copiedScope === "ai" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScope === "ai" ? "Copied" : "Copy AI fixes"}
                </button>
                <div className="mt-6"><ScoreRing value={aiScore} color={aiColor} label={aiLabel} sublabel="How well this page is structured for AI search engines & LLM crawlers." /></div>
              </GlowCard>
            )}
          </div>

          {/* Section tabs — mirrors the product Output Structure */}
          <Tabs defaultValue="ai" className="w-full pt-2">
            <TabsList className="bg-muted/40 p-1 border border-white/5 rounded-xl flex-wrap h-auto gap-1">
              <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 border border-transparent data-[state=active]:border-purple-500/30"><Brain className="w-3.5 h-3.5 mr-1.5" />AI Visibility</TabsTrigger>
              <TabsTrigger value="seo" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 border border-transparent data-[state=active]:border-emerald-500/30"><Activity className="w-3.5 h-3.5 mr-1.5" />SEO</TabsTrigger>
              <TabsTrigger value="critical" className="rounded-lg data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400 border border-transparent data-[state=active]:border-red-500/30"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Critical{sectionCount(criticalIssues.length)}</TabsTrigger>
              <TabsTrigger value="opps" className="rounded-lg data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 border border-transparent data-[state=active]:border-cyan-500/30"><Tags className="w-3.5 h-3.5 mr-1.5" />Opportunities</TabsTrigger>
              <TabsTrigger value="technical" className="rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 border border-transparent data-[state=active]:border-amber-500/30"><Code className="w-3.5 h-3.5 mr-1.5" />Technical{sectionCount(technicalIssues.length)}</TabsTrigger>
              <TabsTrigger value="plan" className="rounded-lg data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 border border-transparent data-[state=active]:border-cyan-500/30"><ListChecks className="w-3.5 h-3.5 mr-1.5" />Action Plan{sectionCount(actionPlan.length)}</TabsTrigger>
            </TabsList>

            {/* ===== AI VISIBILITY ===== */}
            <TabsContent value="ai" className="mt-6 space-y-5">
              {/* AI consultant card */}
              {llm?.executiveSummary && (
                <GlowCard className="p-5" glowColor="rgba(168,85,247,0.14)">
                  <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold uppercase tracking-widest text-purple-400">AI Consultant</span><Badge className="text-[8px] bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase tracking-widest">AI-enhanced</Badge></div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{llm.executiveSummary}</p>
                </GlowCard>
              )}

              {engines.length > 0 && (
                <GlowCard className="p-0 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 pt-5"><Brain className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Visibility Universe</span></div>
                  <div className="relative h-[300px]">
                    <Lazy3D
                      className="absolute inset-0"
                      loader={universeLoader}
                      fallback={<UniverseFallback engines={engines.map((e) => ({ name: e.engine, readiness: e.score }))} />}
                      sceneProps={{ engines: engines.map((e) => ({ name: e.engine, readiness: e.score })) }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 px-5 pb-4 -mt-2 italic text-center">Planet size & proximity reflect each engine's readiness for this page.</p>
                </GlowCard>
              )}

              {engines.length > 0 && (
                <GlowCard className="p-5">
                  <div className="flex items-center gap-2 mb-4"><Cpu className="w-4 h-4 text-cyan-400" /><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Engine Readiness</span></div>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">{engines.map((e) => <EngineBar key={e.engine} engine={e} />)}</div>
                  <p className="text-[10px] text-muted-foreground/60 mt-4 italic">Heuristic estimate derived from the category scores below.</p>
                </GlowCard>
              )}

              {/* E-E-A-T + Citation + Entity signal panels */}
              {(eeat || citation || entity) && (
                <div className="grid sm:grid-cols-3 gap-4">
                  {eeat && <SignalPanel icon={BadgeCheck} label="E-E-A-T" cat={eeat} />}
                  {citation && <SignalPanel icon={Quote} label="Citation Readiness" cat={citation} />}
                  {entity && <SignalPanel icon={Tags} label="Entity Coverage" cat={entity} />}
                </div>
              )}

              {/* Full category breakdown */}
              {categories.length > 0 ? (
                <>
                  {/* 12-signal radar — the whole profile at a glance */}
                  <GlowCard className="p-5">
                    <div className="flex items-center gap-2 mb-2"><Brain className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Signal Profile</span></div>
                    <SignalRadar data={categories.map((c) => ({ label: c.label, score: c.score }))} height={340} />
                    <p className="text-[11px] text-muted-foreground/70 text-center italic">Click any signal below for what it means, your strengths &amp; gaps, and how to improve.</p>
                  </GlowCard>
                  <div className="grid md:grid-cols-2 gap-3 sm:gap-4">{categories.map((c) => <CategoryCard key={c.id} cat={c} />)}</div>
                </>
              ) : (
                <SectionEmpty icon={Brain} title="No AI visibility data" desc="Re-run the analysis to generate the AI visibility breakdown." />
              )}
            </TabsContent>

            {/* ===== SEO ===== */}
            <TabsContent value="seo" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <ScoreCard label="Performance" score={analysis.performanceScore ?? null} icon={Zap} />
                <ScoreCard label="Accessibility" score={analysis.accessibilityScore ?? null} icon={AccessibilityIcon} />
                <ScoreCard label="Best Practices" score={analysis.bestPracticesScore ?? null} icon={ShieldCheck} />
                <ScoreCard label="Mobile" score={analysis.mobileScore ?? null} icon={Globe} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <GlowCard className="p-5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Core Web Vitals</p>
                  <div className="space-y-3">
                    {[["LCP (Paint)", analysis.lcp], ["CLS (Shift)", analysis.cls], ["FCP (First)", analysis.fcp], ["Speed Index", analysis.speedIndex]].map(([k, v]) => (
                      <div key={k as string} className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">{k}</span><span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">{(v as string) || "—"}</span></div>
                    ))}
                  </div>
                </GlowCard>
                <GlowCard className="p-5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Content Depth</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Words</span><span className="font-mono font-bold bg-white/5 px-2.5 py-0.5 rounded border border-white/10">{analysis.wordCount?.toLocaleString() || "—"}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">H1 Tags</span><span className={`font-mono font-bold px-2.5 py-0.5 rounded border ${analysis.h1Count !== 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>{analysis.h1Count ?? "—"}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">H2 Tags</span><span className="font-mono font-bold bg-white/5 px-2.5 py-0.5 rounded border border-white/10">{analysis.h2Count ?? "—"}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-medium">Links (int / ext)</span><span className="font-mono font-bold bg-white/5 px-2.5 py-0.5 rounded border border-white/10">{analysis.internalLinks ?? 0} / {analysis.externalLinks ?? 0}</span></div>
                  </div>
                </GlowCard>
                {(analysis.metaTitle || analysis.metaDescription) ? (
                  <GlowCard className="p-5 space-y-4" glowColor="rgba(6,182,212,0.1)">
                    <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Meta Data</p>
                    {analysis.metaTitle && <div><div className="flex items-center justify-between mb-1.5"><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Title</p><span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${analysis.metaTitle.length >= 30 && analysis.metaTitle.length <= 60 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>{analysis.metaTitle.length} chars</span></div><p className="text-xs text-foreground/90 bg-muted/60 rounded-lg p-2.5 font-mono border border-white/5 break-all">{analysis.metaTitle}</p></div>}
                    {analysis.metaDescription && <div><div className="flex items-center justify-between mb-1.5"><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Description</p><span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>{analysis.metaDescription.length} chars</span></div><p className="text-xs text-foreground/90 bg-muted/60 rounded-lg p-2.5 font-mono border border-white/5 break-all">{analysis.metaDescription}</p></div>}
                  </GlowCard>
                ) : <GlowCard className="p-5 flex items-center justify-center text-center"><p className="text-sm text-muted-foreground">No meta tags detected.</p></GlowCard>}
              </div>
              {seoWarnings.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">{seoWarnings.map((i) => <IssueCard key={i.id} issue={i} />)}</div>}
            </TabsContent>

            {/* ===== CRITICAL ===== */}
            <TabsContent value="critical" className="mt-6 space-y-4">
              {criticalIssues.length === 0 ? (
                <SectionEmpty icon={CheckCircle} title="No critical issues" desc="Nothing is actively blocking your visibility. Focus on the opportunities and action plan." glow="rgba(16,185,129,0.15)" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">{criticalIssues.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
              )}
            </TabsContent>

            {/* ===== OPPORTUNITIES ===== */}
            <TabsContent value="opps" className="mt-6 space-y-5">
              {entityGaps.length > 0 && (
                <GlowCard className="p-5" glowColor="rgba(168,85,247,0.12)">
                  <div className="flex items-center gap-2 mb-3"><Tags className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold uppercase tracking-widest text-purple-400">Missing Entities & Topics</span></div>
                  <div className="flex flex-wrap gap-2">{entityGaps.map((g: string, i: number) => <span key={i} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-200 border border-purple-500/20">{g}</span>)}</div>
                </GlowCard>
              )}
              {opportunityRecs.length > 0 ? (
                <div className="space-y-2.5">{opportunityRecs.map((r, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]"><Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /><p className="text-sm text-foreground/90 leading-relaxed">{r}</p></div>
                ))}</div>
              ) : entityGaps.length === 0 ? (
                <SectionEmpty icon={Tags} title="No opportunities flagged" desc="Your entity and citation coverage looks solid for this page." glow="rgba(16,185,129,0.15)" />
              ) : null}
            </TabsContent>

            {/* ===== TECHNICAL ===== */}
            <TabsContent value="technical" className="mt-6 space-y-4">
              {technicalIssues.length === 0 ? (
                <SectionEmpty icon={CheckCircle} title="No technical issues" desc="No performance or crawlability problems detected." glow="rgba(16,185,129,0.15)" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">{technicalIssues.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
              )}
            </TabsContent>

            {/* ===== ACTION PLAN ===== */}
            <TabsContent value="plan" className="mt-6 space-y-4">
              {actionPlan.length > 0 ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                    <ListChecks className="w-5 h-5 text-cyan-400 shrink-0" />
                    <p className="text-xs text-cyan-200">Prioritized from most to least impactful. Start at the top.</p>
                  </div>
                  <div className="space-y-3">{actionPlan.map((item, i) => <ActionPlanCard key={i} item={item} index={i} />)}</div>
                </>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">{[...recommendations].sort((a, b) => b.estimatedImpact - a.estimatedImpact).map((r) => <RecommendationCard key={r.id} rec={r} />)}</div>
              ) : (
                <SectionEmpty icon={CheckCircle} title="Nothing urgent to fix" desc="No prioritized actions right now — your page is in good shape." glow="rgba(16,185,129,0.15)" />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function SignalPanel({ icon: Icon, label, cat }: { icon: any; label: string; cat: AiCategory }) {
  const color = STATUS_COLOR[cat.status] ?? "#94a3b8";
  return (
    <GlowCard className="p-4" glowColor={`${color}1f`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" style={{ color }} /><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span></div>
        <span className="text-lg font-black" style={{ color }}>{cat.score}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{cat.weaknesses[0] ?? cat.strengths[0] ?? cat.whatItMeans}</p>
    </GlowCard>
  );
}
