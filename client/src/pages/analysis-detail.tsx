import { useState } from "react";
import { useGetAnalysis, getGetAnalysisQueryKey, useRerunAnalysis, getListAnalysesQueryKey } from "@/api";
import { customFetch } from "@/api/custom-fetch";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Info,
  Globe, Youtube, Instagram, ExternalLink, ChevronDown, ChevronUp, Code, Wrench, BookOpen, Trash2,
  Activity, Zap, ShieldCheck, Accessibility as AccessibilityIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function ScoreCard({ label, score, icon: Icon }: { label: string; score: number | null; icon: any }) {
  const scoreColor = score === null ? "#94a3b8" : score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: scoreColor }}>{score ?? "—"}</div>
      <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score ?? 0}%`, backgroundColor: scoreColor }} />
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  }[priority] ?? "bg-muted text-muted-foreground";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize border ${cls}`}>{priority}</span>;
}

function TypeIcon({ type }: { type: string }) {
  if (type === "youtube") return <Youtube className="w-4 h-4" />;
  if (type === "instagram") return <Instagram className="w-4 h-4" />;
  return <Globe className="w-4 h-4" />;
}

type SeoIssue = {
  id: number;
  analysisId: number;
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

  const severityBg = issue.severity === "critical" ? "border-red-200 bg-red-50/30"
    : issue.severity === "warning" ? "border-amber-200 bg-amber-50/20"
    : "border-blue-200 bg-blue-50/20";

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${severityBg}`}
      data-testid={`card-issue-${issue.id}`}
    >
      {/* Header — always visible */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
      >
        <div className="mt-0.5"><SeverityIcon severity={issue.severity} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-foreground text-sm">{issue.title}</p>
            <Badge variant="outline" className="text-xs shrink-0">{issue.category}</Badge>
            {issue.lineNumber && (
              <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
                Line {issue.lineNumber}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
          {issue.affectedUrl && !issue.affectedUrl.startsWith("<!") && (
            <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded shrink-0">Page</span>
              <p className="text-xs text-primary/70 font-mono truncate hover:text-primary transition-colors">{issue.affectedUrl}</p>
            </div>
          )}
        </div>
        {hasDetails && (
          <div className="shrink-0 text-muted-foreground mt-0.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      {/* Expanded detail panel */}
      {expanded && hasDetails && (
        <div className="border-t border-border/60 bg-card/80 divide-y divide-border/40">
          {/* Current element */}
          {issue.element && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Current Element{issue.lineNumber ? ` (Line ${issue.lineNumber})` : ""}
                </span>
              </div>
              <pre className="text-xs bg-zinc-950 text-zinc-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                {issue.element}
              </pre>
            </div>
          )}

          {/* Fix example */}
          {issue.fixExample && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">How to Fix</span>
              </div>
              <pre className="text-xs bg-zinc-950 text-emerald-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                {issue.fixExample}
              </pre>
            </div>
          )}

          {/* Help link */}
          {issue.helpUrl && (
            <div className="px-4 py-3">
              <a
                href={issue.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Read the official documentation
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
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            <ChevronDown className="w-3 h-3" />
            Show element, fix example & docs
          </button>
        </div>
      )}
    </div>
  );
}

type Recommendation = {
  id: number;
  analysisId: number;
  priority: string;
  category: string;
  title: string;
  description: string;
  estimatedImpact: number;
  dismissed: boolean;
  createdAt: string;
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const impactColor = rec.estimatedImpact >= 80 ? "text-emerald-600" : rec.estimatedImpact >= 60 ? "text-amber-600" : "text-blue-600";
  const impactBg = rec.estimatedImpact >= 80 ? "bg-emerald-50 border-emerald-200" : rec.estimatedImpact >= 60 ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200";

  return (
    <div className="bg-card border border-border rounded-xl p-4" data-testid={`card-rec-${rec.id}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={rec.priority} />
          <Badge variant="outline" className="text-xs">{rec.category}</Badge>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${impactBg} ${impactColor}`}>
          +{rec.estimatedImpact} impact
        </span>
      </div>
      <p className="font-semibold text-foreground text-sm mb-1.5">{rec.title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
    </div>
  );
}

export default function AnalysisDetail({ id }: { id: number }) {
  const { data: analysis, isLoading, refetch } = useGetAnalysis(id, {
    query: {
      enabled: !!id,
      queryKey: getGetAnalysisQueryKey(id),
      refetchInterval: (query) => {
        const status = (query.state.data as any)?.status;
        return status === "running" ? 2000 : false;
      },
    },
  });
  const rerun = useRerunAnalysis();
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
    try {
      await customFetch(`/api/analyses/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
      toast({ title: "Analysis deleted" });
      navigate("/analyzer");
    } catch {
      toast({ title: "Error", description: "Could not delete analysis.", variant: "destructive" });
      setDeleting(false);
      setConfirmDelete(false);
    }
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
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!analysis) {
    return <div className="p-6 text-muted-foreground">Analysis not found.</div>;
  }

  const scoreColor = !analysis.seoScore
    ? "#94a3b8"
    : analysis.seoScore >= 80 ? "#10b981"
    : analysis.seoScore >= 60 ? "#f59e0b"
    : "#ef4444";
  const scoreData = [{ value: analysis.seoScore ?? 0, fill: scoreColor }];
  const scoreLabel = !analysis.seoScore
    ? "—"
    : analysis.seoScore >= 80 ? "Good"
    : analysis.seoScore >= 60 ? "Needs Work"
    : "Poor";

  const issues = (analysis.issues ?? []) as SeoIssue[];
  const recommendations = (analysis.recommendations ?? []) as Recommendation[];
  
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const infoCount = issues.filter(i => i.severity === "info").length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/analyzer">
          <button className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">{analysis.url}</h1>
          <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
            <TypeIcon type={analysis.type} />
            <span className="text-sm capitalize">{analysis.type}</span>
            <span className="opacity-40">·</span>
            <span className="text-sm">{new Date(analysis.createdAt).toLocaleString()}</span>
            {(analysis.status === "running" || analysis.status === "queued") && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {analysis.status === "queued" ? "In Queue..." : "Analyzing..."}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline" size="sm" onClick={handleRerun}
          disabled={rerun.isPending || analysis.status === "running"}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${rerun.isPending ? "animate-spin" : ""}`} />
          Re-run
        </Button>
        <Button
          variant={confirmDelete ? "destructive" : "outline"}
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="gap-2 shrink-0"
        >
          {deleting
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />
          }
          {deleting ? "Deleting…" : confirmDelete ? "Confirm delete?" : "Delete"}
        </Button>
      </div>

      {/* Main Score Gauge */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">SEO Audit Score</span>
          </div>
          
          {analysis.seoScore != null ? (
            <div className="mt-4 flex flex-col items-center">
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="75%" outerRadius="100%" data={scoreData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--muted))" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black tracking-tighter" style={{ color: scoreColor }}>{analysis.seoScore}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Score</span>
                </div>
              </div>
              <div className="mt-4 flex flex-col items-center">
                <span className="text-sm font-bold px-4 py-1 rounded-full border transition-all shadow-sm" style={{ backgroundColor: `${scoreColor}15`, color: scoreColor, borderColor: `${scoreColor}30` }}>
                  {scoreLabel}
                </span>
                <p className="text-xs text-muted-foreground mt-2 text-center max-w-[200px]">
                  Based on content depth, meta tags, and accessibility standards.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                {analysis.status === "queued" ? "Waiting in Queue..." : "Generating Detailed Audit..."}
              </p>
            </div>
          )}
        </div>

        {/* Lighthouse Core Metrics */}
        <div className="grid grid-cols-2 gap-4">
           <ScoreCard label="Performance" score={analysis.performanceScore ?? null} icon={Zap} />
           <ScoreCard label="Accessibility" score={analysis.accessibilityScore ?? null} icon={AccessibilityIcon} />
           <ScoreCard label="Best Practices" score={analysis.bestPracticesScore ?? null} icon={ShieldCheck} />
           <ScoreCard label="Mobile" score={analysis.mobileScore ?? null} icon={Globe} />
        </div>
      </div>

      {/* Web Vitals & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Core Web Vitals</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">LCP (Paint)</span>
              <span className="font-mono font-bold text-primary">{analysis.lcp || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">CLS (Shift)</span>
              <span className="font-mono font-bold text-primary">{analysis.cls || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">FCP (First)</span>
              <span className="font-mono font-bold text-primary">{analysis.fcp || "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Content Depth</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Words</span>
              <span className="font-bold">{analysis.wordCount?.toLocaleString() || "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">H1 Tags</span>
              <span className={`font-bold ${analysis.h1Count !== 1 ? "text-amber-600" : "text-emerald-600"}`}>{analysis.h1Count ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">H2 Tags</span>
              <span className="font-bold">{analysis.h2Count ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Health Status</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-500 font-bold">Critical</span>
              <Badge variant="destructive" className="h-5 px-1.5">{criticalCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-500 font-bold">Warnings</span>
              <Badge variant="outline" className="h-5 px-1.5 border-amber-200 text-amber-600">{warningCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-500 font-bold">Info</span>
              <Badge variant="outline" className="h-5 px-1.5 border-blue-200 text-blue-600">{infoCount}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Meta info */}
      {(analysis.metaTitle || analysis.metaDescription) && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
            <Code className="w-4 h-4 text-primary" />
            Meta Data (Live Page)
          </h2>
          {analysis.metaTitle && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Title Tag</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  analysis.metaTitle.length >= 30 && analysis.metaTitle.length <= 60
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>{analysis.metaTitle.length} chars</span>
              </div>
              <p className="text-sm text-foreground bg-zinc-950 text-zinc-100 rounded-lg px-4 py-3 font-mono border border-zinc-800 shadow-inner overflow-hidden">&lt;title&gt;{analysis.metaTitle}&lt;/title&gt;</p>
            </div>
          )}
          {analysis.metaDescription && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Meta Description</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>{analysis.metaDescription.length} chars</span>
              </div>
              <p className="text-sm text-foreground bg-zinc-950 text-zinc-100 rounded-lg px-4 py-3 font-mono border border-zinc-800 shadow-inner overflow-hidden">&lt;meta name="description" content="{analysis.metaDescription}"&gt;</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="issues" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Analysis Issues
            {issues.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 h-5 min-w-[20px] justify-center">{issues.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Recommendations
            {recommendations.length > 0 && (
              <Badge className="ml-2 px-1.5 h-5 min-w-[20px] justify-center bg-primary/20 text-primary hover:bg-primary/20">{recommendations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="mt-6 space-y-4">
          {issues.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed border-border">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
              <p className="font-bold text-foreground">Perfect Optimization</p>
              <p className="text-sm text-muted-foreground">No critical issues or warnings detected on this page.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4">
                <Info className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-blue-700 font-medium">
                  Click cards to view <strong>source code</strong>, <strong>line numbers</strong>, and <strong>fix tutorials</strong>.
                </p>
              </div>
              {[...issues]
                .sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2 };
                  return (order[a.severity as keyof typeof order] ?? 9) - (order[b.severity as keyof typeof order] ?? 9);
                })
                .map((issue) => <IssueCard key={issue.id} issue={issue} />)
              }
            </>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6 space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border">
              <p className="text-sm text-muted-foreground">No specific recommendations at this time.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-4">
                <Zap className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-emerald-700 font-medium">
                  Recommendations are sorted by <strong>Estimated SEO Impact</strong>.
                </p>
              </div>
              {[...recommendations]
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  const priorityDiff = (order[a.priority as keyof typeof order] ?? 9) - (order[b.priority as keyof typeof order] ?? 9);
                  return priorityDiff || (b.estimatedImpact - a.estimatedImpact);
                })
                .map((rec) => <RecommendationCard key={rec.id} rec={rec} />)
              }
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
