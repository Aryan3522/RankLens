import { useState } from "react";
import { useGetAnalysis, getGetAnalysisQueryKey, useRerunAnalysis, getListAnalysesQueryKey, useDeleteAnalysis } from "@/api";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Info,
  Globe, Youtube, Instagram, ExternalLink, ChevronDown, ChevronUp, Code, Wrench, BookOpen, Trash2,
  Activity, Zap, ShieldCheck, Accessibility as AccessibilityIcon,
  Brain, Sparkles, Eye, Lightbulb, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { GlowCard } from "@/components/ui/glow-card";
import { downloadAnalysisReport } from "@/lib/export-analysis";

function ScoreCard({ label, score, icon: Icon }: { label: string; score: number | null; icon: any }) {
  const scoreColor = score === null ? "#94a3b8" : score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <GlowCard className="p-4 flex flex-col items-center justify-center text-center">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-black tracking-tighter" style={{ color: scoreColor, textShadow: `0 0 10px ${scoreColor}40` }}>{score ?? "—"}</div>
      <div className="w-full h-1.5 bg-black/40 rounded-full mt-3 overflow-hidden border border-white/5">
        <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_currentColor]" style={{ width: `${score ?? 0}%`, backgroundColor: scoreColor, color: scoreColor }} />
      </div>
    </GlowCard>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <XCircle className="w-4 h-4 text-red-500 shrink-0 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />;
  if (severity === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />;
  return <Info className="w-4 h-4 text-cyan-500 shrink-0 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = {
    high: "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
    low: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]",
  }[priority] ?? "bg-white/10 text-muted-foreground border-white/20";
  return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-widest border ${cls}`}>{priority}</span>;
}

function TypeIcon({ type }: { type: string }) {
  if (type === "youtube") return <Youtube className="w-4 h-4" />;
  if (type === "instagram") return <Instagram className="w-4 h-4" />;
  return <Globe className="w-4 h-4" />;
}

type SeoIssue = {
  id: string;
  analysisId: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  affectedUrl?: string | null;
  element?: string | null;
  lineNumber?: number | null;
  fixExample?: string | null;
  helpUrl?: string | null;
};

function IssueCard({ issue }: { issue: SeoIssue }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(issue.element || issue.fixExample || issue.lineNumber || issue.helpUrl);

  const severityColor = issue.severity === "critical" ? "rgba(239, 68, 68, 0.15)"
    : issue.severity === "warning" ? "rgba(245, 158, 11, 0.15)"
    : "rgba(6, 182, 212, 0.15)";
    
  const borderColor = issue.severity === "critical" ? "border-red-500/30"
    : issue.severity === "warning" ? "border-amber-500/30"
    : "border-cyan-500/30";

  return (
    <GlowCard 
      className={`p-0 overflow-hidden ${borderColor}`} 
      glowColor={severityColor}
      data-testid={`card-issue-${issue.id}`}
    >
      {/* Header */}
      <button
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/5 transition-colors"
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
      >
        <div className="mt-0.5"><SeverityIcon severity={issue.severity} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="font-bold text-foreground text-sm tracking-tight break-words">{issue.title}</p>
            <Badge variant="outline" className="text-[9px] uppercase tracking-widest py-0 shrink-0">{issue.category}</Badge>
            {issue.lineNumber && (
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(6,182,212,0.1)] shrink-0">
                Line {issue.lineNumber}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed break-words">{issue.description}</p>
          {issue.affectedUrl && !issue.affectedUrl.startsWith("<!") && (
            <div className="mt-2.5 flex items-center gap-2 overflow-hidden w-full">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-md shrink-0">Target</span>
              <p className="text-xs text-primary/70 font-mono truncate break-all hover:text-primary transition-colors min-w-0 flex-1">{issue.affectedUrl}</p>
            </div>
          )}
        </div>
        {hasDetails && (
          <div className="shrink-0 text-muted-foreground mt-0.5 bg-black/40 p-1 rounded border border-white/5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      {/* Expanded detail panel */}
      {expanded && hasDetails && (
        <div className="border-t border-white/10 bg-black/40 backdrop-blur-md divide-y divide-white/5">
          {/* Current element */}
          {issue.element && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Current Element{issue.lineNumber ? ` (Line ${issue.lineNumber})` : ""}
                </span>
              </div>
              <pre className="text-xs bg-black/60 text-zinc-300 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono border border-white/5 shadow-inner">
                {issue.element}
              </pre>
            </div>
          )}

          {/* Fix example */}
          {issue.fixExample && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest neon-text-cyan">How to Fix</span>
              </div>
              <pre className="text-xs bg-black/60 text-emerald-300 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono border border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]">
                {issue.fixExample}
              </pre>
            </div>
          )}

          {/* Help link */}
          {issue.helpUrl && (
            <div className="px-4 py-3 bg-white/[0.02]">
              <a
                href={issue.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Read official documentation
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          )}
        </div>
      )}

      {hasDetails && !expanded && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setExpanded(true)}
            className="text-[10px] uppercase tracking-widest text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
            Show element, fix example & docs
          </button>
        </div>
      )}
    </GlowCard>
  );
}

type Recommendation = {
  id: string;
  analysisId: string;
  priority: string;
  category: string;
  title: string;
  description: string;
  estimatedImpact: number;
  dismissed: boolean;
  createdAt: string;
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const impactColor = rec.estimatedImpact >= 80 ? "text-emerald-400" : rec.estimatedImpact >= 60 ? "text-amber-400" : "text-cyan-400";
  const impactBg = rec.estimatedImpact >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : rec.estimatedImpact >= 60 ? "bg-amber-500/10 border-amber-500/30" : "bg-cyan-500/10 border-cyan-500/30";
  const glowColor = rec.estimatedImpact >= 80 ? "rgba(16, 185, 129, 0.15)" : rec.estimatedImpact >= 60 ? "rgba(245, 158, 11, 0.15)" : "rgba(6, 182, 212, 0.15)";

  return (
    <GlowCard className="p-4" glowColor={glowColor} data-testid={`card-rec-${rec.id}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={rec.priority} />
          <Badge variant="outline" className="text-[9px] uppercase tracking-widest py-0 border-white/20">{rec.category}</Badge>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-widest border shrink-0 ${impactBg} ${impactColor} shadow-[0_0_10px_currentColor]`}>
          +{rec.estimatedImpact} Impact
        </span>
      </div>
      <p className="font-bold text-foreground text-sm mb-1.5 tracking-tight break-words">{rec.title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed break-words">{rec.description}</p>
    </GlowCard>
  );
}

export default function AnalysisDetail({ id }: { id: string }) {
  const { data: analysis, isLoading } = useGetAnalysis(id, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id),
      refetchInterval: (query: any) => {
        const status = (query.state.data as any)?.status;
        return status === "running" ? 2000 : false;
      },
    },
  });
  const rerun = useRerunAnalysis();
  const deleteAnalysis = useDeleteAnalysis();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    deleteAnalysis.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
        toast({ title: "Analysis deleted" });
        navigate("/analyzer");
      },
      onError: () => {
        toast({ title: "Error", description: "Could not delete analysis.", variant: "destructive" });
        setDeleting(false);
        setConfirmDelete(false);
      }
    });
  };

  const handleRerun = () => {
    rerun.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAnalysisQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
        toast({ title: "Analysis re-queued", description: "The page will update automatically." });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto space-y-6">
        <Skeleton className="h-12 w-full max-w-sm rounded-xl" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!analysis) {
    return <div className="p-6 text-muted-foreground text-center py-20 font-mono">_analysis_not_found</div>;
  }

  const scoreColor = !analysis.seoScore
    ? "#94a3b8"
    : analysis.seoScore >= 80 ? "#10b981"
    : analysis.seoScore >= 60 ? "#f59e0b"
    : "#ef4444";
  const scoreData = [{ value: analysis.seoScore ?? 0, fill: scoreColor }];
  const scoreLabel = !analysis.seoScore
    ? "—"
    : analysis.seoScore >= 80 ? "Optimized"
    : analysis.seoScore >= 60 ? "Needs Work"
    : "Critical";

  const aiScore = analysis.aiVisibilityScore ?? 0;
  const aiScoreColor = aiScore >= 70 ? "#a855f7" : aiScore >= 40 ? "#fbbf24" : "#ef4444";
  const aiScoreBg = aiScore >= 70 ? "#a855f715" : aiScore >= 40 ? "#f59e0b15" : "#ef444415";
  const aiScoreBorder = aiScore >= 70 ? "#a855f740" : aiScore >= 40 ? "#f59e0b40" : "#ef444440";
  const aiScoreLabel = aiScore >= 70 ? "AI-Ready" : aiScore >= 40 ? "Optimization Needed" : "Low Visibility";

  const issues = (analysis.issues ?? []) as SeoIssue[];
  const recommendations = (analysis.recommendations ?? []) as Recommendation[];
  
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const infoCount = issues.filter(i => i.severity === "info").length;

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-6 pb-20">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/analyzer">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-black/40 border border-white/10 text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/30 transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-black text-foreground truncate break-all tracking-tight">{analysis.url}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2.5 py-0.5 bg-white/5 rounded border border-white/10 shrink-0">
                <TypeIcon type={analysis.type} />
                {analysis.type}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono px-2.5 py-0.5 bg-black/30 rounded border border-white/5 shrink-0">
                {new Date(analysis.createdAt).toLocaleDateString()}
              </span>
              {(analysis.status === "running" || analysis.status === "queued") && (
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-400 font-bold px-2.5 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/30 animate-pulse shrink-0">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {analysis.status === "queued" ? "In Queue" : "Analyzing"}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {analysis.status === "completed" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => downloadAnalysisReport(analysis as any)}
              className="shrink-0 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 w-10 h-10"
              title="Export Report"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline" 
            size="icon"
            onClick={handleRerun}
            disabled={rerun.isPending || analysis.status === "running"}
            className="shrink-0 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 w-10 h-10"
            title="Re-run Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${rerun.isPending ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant={confirmDelete ? "destructive" : "outline"}
            size="icon"
            onClick={handleDelete}
            disabled={deleting}
            className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400 w-10 h-10"
            title={deleting ? "Deleting…" : confirmDelete ? "Confirm Deletion" : "Delete"}
          >
            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Hero Dashboards (SEO & AI) */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* SEO Score */}
        <GlowCard className="p-5 sm:p-8 flex flex-col items-center justify-center relative" glowColor="rgba(16, 185, 129, 0.1)">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SEO Health</span>
          </div>
          
          {analysis.seoScore != null ? (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 w-full">
              <div className="relative w-36 h-36 sm:w-48 sm:h-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="75%" outerRadius="100%" data={scoreData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "rgba(255,255,255,0.05)" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-6xl font-black tracking-tighter drop-shadow-[0_0_15px_currentColor]" style={{ color: scoreColor }}>{analysis.seoScore}</span>
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-md border text-center w-fit mb-2 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: `${scoreColor}15`, color: scoreColor, borderColor: `${scoreColor}40` }}>
                  {scoreLabel}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                  Overall technical SEO, performance, and accessibility standing.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400 animate-pulse">
                {analysis.status === "queued" ? "Waiting in Queue..." : "Generating Audit..."}
              </p>
            </div>
          )}
        </GlowCard>

        {/* AI Score */}
        {analysis.aiVisibilityScore != null && (
          <GlowCard className="p-5 sm:p-8 flex flex-col items-center justify-center relative" glowColor="rgba(168, 85, 247, 0.1)">
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Visibility</span>
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 w-full">
              <div className="relative w-36 h-36 sm:w-48 sm:h-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="75%" outerRadius="100%"
                    data={[{ value: aiScore, fill: aiScoreColor }]}
                    startAngle={90} endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "rgba(255,255,255,0.05)" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-6xl font-black tracking-tighter drop-shadow-[0_0_15px_currentColor]" style={{ color: aiScoreColor }}>
                    {aiScore}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-md border text-center w-fit mb-2 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: aiScoreBg, color: aiScoreColor, borderColor: aiScoreBorder }}>
                  {aiScoreLabel}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                  How well this page is structured for AI search engines and LLM crawlers.
                </p>
              </div>
            </div>
          </GlowCard>
        )}
      </div>

      {/* Core Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <ScoreCard label="Performance" score={analysis.performanceScore ?? null} icon={Zap} />
        <ScoreCard label="Accessibility" score={analysis.accessibilityScore ?? null} icon={AccessibilityIcon} />
        <ScoreCard label="Best Practices" score={analysis.bestPracticesScore ?? null} icon={ShieldCheck} />
        <ScoreCard label="Mobile" score={analysis.mobileScore ?? null} icon={Globe} />
      </div>

      {/* Detailed Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <GlowCard className="p-5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Core Web Vitals</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">LCP (Paint)</span>
              <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">{analysis.lcp || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">CLS (Shift)</span>
              <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">{analysis.cls || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">FCP (First)</span>
              <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">{analysis.fcp || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Speed Index</span>
              <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">{analysis.speedIndex || "—"}</span>
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Content Depth</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Words</span>
              <span className="font-mono font-bold bg-white/5 px-2.5 py-0.5 rounded border border-white/10">{analysis.wordCount?.toLocaleString() || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">H1 Tags</span>
              <span className={`font-mono font-bold px-2.5 py-0.5 rounded border ${analysis.h1Count !== 1 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>{analysis.h1Count ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">H2 Tags</span>
              <span className="font-mono font-bold bg-white/5 px-2.5 py-0.5 rounded border border-white/10">{analysis.h2Count ?? "—"}</span>
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Health Status</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs bg-black/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-red-400 font-bold uppercase tracking-widest flex items-center gap-2"><XCircle className="w-3.5 h-3.5" />Critical</span>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]">{criticalCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs bg-black/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />Warnings</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]">{warningCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs bg-black/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2"><Info className="w-3.5 h-3.5" />Info</span>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]">{infoCount}</Badge>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* AI Insights & Meta */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Meta Info */}
        {(analysis.metaTitle || analysis.metaDescription) && (
          <GlowCard className="p-5 space-y-5" glowColor="rgba(6, 182, 212, 0.1)">
            <h2 className="text-[10px] font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-widest bg-cyan-500/10 w-fit px-3 py-1.5 rounded-md border border-cyan-500/20">
              <Code className="w-3.5 h-3.5" />
              Meta Data (Live Page)
            </h2>
            {analysis.metaTitle && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Title Tag</p>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                    analysis.metaTitle.length >= 30 && analysis.metaTitle.length <= 60
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                  }`}>{analysis.metaTitle.length} chars</span>
                </div>
                <p className="text-sm text-zinc-300 bg-black/60 rounded-lg p-3 sm:p-4 font-mono border border-white/5 shadow-inner whitespace-pre-wrap break-all">&lt;title&gt;{analysis.metaTitle}&lt;/title&gt;</p>
              </div>
            )}
            {analysis.metaDescription && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Meta Description</p>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                    analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                  }`}>{analysis.metaDescription.length} chars</span>
                </div>
                <p className="text-sm text-zinc-300 bg-black/60 rounded-lg p-3 sm:p-4 font-mono border border-white/5 shadow-inner whitespace-pre-wrap break-all">&lt;meta name="description" content="{analysis.metaDescription}"&gt;</p>
              </div>
            )}
          </GlowCard>
        )}

        {/* AI Insights List */}
        {analysis.aiVisibilityScore != null && (
          <GlowCard className="p-5 flex flex-col gap-4" glowColor="rgba(168, 85, 247, 0.1)">
            {(analysis.aiVisibilityInsights as any)?.strengths?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-md border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AI Strengths</span>
                </div>
                <ul className="space-y-1.5 px-2">
                  {(analysis.aiVisibilityInsights as any).strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="text-emerald-500 mt-1">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(analysis.aiVisibilityInsights as any)?.weaknesses?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 bg-amber-500/10 w-fit px-3 py-1.5 rounded-md border border-amber-500/20">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">AI Weaknesses</span>
                </div>
                <ul className="space-y-1.5 px-2">
                  {(analysis.aiVisibilityInsights as any).weaknesses.map((w: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="text-amber-500 mt-1">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(analysis.aiVisibilityInsights as any)?.recommendations?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 bg-purple-500/10 w-fit px-3 py-1.5 rounded-md border border-purple-500/20">
                  <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Action Items</span>
                </div>
                <ul className="space-y-1.5 px-2">
                  {(analysis.aiVisibilityInsights as any).recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="text-purple-500 mt-1">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GlowCard>
        )}
      </div>

      {/* Tabs for Actionable Data */}
      <Tabs defaultValue="issues" className="w-full pt-4">
        <TabsList className="bg-black/40 p-1 border border-white/5 rounded-xl">
          <TabsTrigger value="issues" className="rounded-lg data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 border border-transparent transition-all">
            Detailed Issues
            {issues.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 h-5 min-w-[20px] justify-center text-[10px]">{issues.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="rounded-lg data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/30 border border-transparent transition-all">
            Recommendations
            {recommendations.length > 0 && (
              <Badge className="ml-2 px-1.5 h-5 min-w-[20px] justify-center bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">{recommendations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="mt-6 space-y-4">
          {issues.length === 0 ? (
            <GlowCard className="flex flex-col items-center justify-center py-20 text-center border-dashed" glowColor="rgba(16, 185, 129, 0.15)">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <p className="font-bold text-foreground text-lg mb-2 tracking-tight">Perfect Optimization</p>
              <p className="text-sm text-muted-foreground">No critical issues or warnings detected on this page.</p>
            </GlowCard>
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl mb-4">
                <Info className="w-5 h-5 text-cyan-400" />
                <p className="text-xs text-cyan-200 font-medium">
                  Click cards to view <strong className="text-cyan-400">source code</strong>, <strong className="text-cyan-400">line numbers</strong>, and <strong className="text-cyan-400">fix tutorials</strong>.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {[...issues]
                  .sort((a, b) => {
                    const order = { critical: 0, warning: 1, info: 2 };
                    return (order[a.severity as keyof typeof order] ?? 9) - (order[b.severity as keyof typeof order] ?? 9);
                  })
                  .map((issue) => <IssueCard key={issue.id} issue={issue} />)
                }
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6 space-y-4">
          {recommendations.length === 0 ? (
            <GlowCard className="text-center py-20 border-dashed">
              <p className="text-sm text-muted-foreground">No specific recommendations at this time.</p>
            </GlowCard>
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl mb-4">
                <Zap className="w-5 h-5 text-purple-400" />
                <p className="text-xs text-purple-200 font-medium">
                  Recommendations are sorted by <strong className="text-purple-400">Estimated SEO Impact</strong>.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {[...recommendations]
                  .sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    const priorityDiff = (order[a.priority as keyof typeof order] ?? 9) - (order[b.priority as keyof typeof order] ?? 9);
                    return priorityDiff || (b.estimatedImpact - a.estimatedImpact);
                  })
                  .map((rec) => <RecommendationCard key={rec.id} rec={rec} />)
                }
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
