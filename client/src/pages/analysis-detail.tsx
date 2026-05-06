import { useState } from "react";
import { useGetAnalysis, getGetAnalysisQueryKey, useRerunAnalysis, getListAnalysesQueryKey } from "@/api";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Info,
  Globe, Youtube, Instagram, ExternalLink, ChevronDown, ChevronUp, Code, Wrench, BookOpen, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

function SeverityBanner({ severity }: { severity: string }) {
  if (severity === "critical") return <div className="h-1 w-full rounded-t-xl bg-red-500 -mt-4 mb-0 -mx-4" style={{ width: "calc(100% + 2rem)" }} />;
  if (severity === "warning") return <div className="h-1 w-full rounded-t-xl bg-amber-400 -mt-4 mb-0 -mx-4" style={{ width: "calc(100% + 2rem)" }} />;
  return <div className="h-1 w-full rounded-t-xl bg-blue-400 -mt-4 mb-0 -mx-4" style={{ width: "calc(100% + 2rem)" }} />;
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
  const hasDetails = issue.element || issue.fixExample || issue.lineNumber || issue.helpUrl;

  const severityBg = {
    critical: "border-red-200 bg-red-50/30",
    warning: "border-amber-200 bg-amber-50/20",
    info: "border-blue-200 bg-blue-50/20",
  }[issue.severity] ?? "border-border bg-card";

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
            <p className="text-xs text-muted-foreground/60 mt-1 font-mono truncate">{issue.affectedUrl}</p>
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
        const status = (query.state.data as { status?: string } | undefined)?.status;
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
      await fetch(`/api/analyses/${id}`, { method: "DELETE" });
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
            {analysis.status === "running" && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />Analyzing…
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline" size="sm" onClick={handleRerun}
          disabled={rerun.isPending || analysis.status === "running"}
          className="gap-2 shrink-0" data-testid="button-rerun"
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
          data-testid="button-delete"
        >
          {deleting
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />
          }
          {deleting ? "Deleting…" : confirmDelete ? "Confirm delete?" : "Delete"}
        </Button>
      </div>

      {/* Score + Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Score gauge */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-muted-foreground mb-2">SEO Score</p>
          {analysis.seoScore != null ? (
            <>
              <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={scoreData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "hsl(214 32% 91%)" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold" style={{ color: scoreColor }}>{analysis.seoScore}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">out of 100</p>
              <span className="mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: `${scoreColor}20`, color: scoreColor }}>{scoreLabel}</span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
              <p className="text-sm text-muted-foreground">
                {analysis.status === "running" ? "Analyzing page…" : "Pending"}
              </p>
              {analysis.status === "running" && (
                <button onClick={() => refetch()} className="text-xs text-primary hover:underline">
                  Check for results
                </button>
              )}
            </div>
          )}
        </div>

        {/* Issue summary */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-medium text-muted-foreground mb-4">Issue Summary</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-red-600">
                <XCircle className="w-4 h-4" />Critical
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, criticalCount * 25)}%` }} />
                </div>
                <span className="font-bold text-red-600 w-4 text-right">{criticalCount}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-amber-600">
                <AlertTriangle className="w-4 h-4" />Warnings
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, warningCount * 15)}%` }} />
                </div>
                <span className="font-bold text-amber-600 w-4 text-right">{warningCount}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <Info className="w-4 h-4" />Info
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, infoCount * 15)}%` }} />
                </div>
                <span className="font-bold text-blue-600 w-4 text-right">{infoCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page metrics */}
        {analysis.type === "website" && (
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-medium text-muted-foreground mb-3">Page Metrics</p>
            <div className="space-y-2.5">
              {([
                ["Word Count", analysis.wordCount?.toLocaleString()],
                ["Internal Links", analysis.internalLinks],
                ["External Links", analysis.externalLinks],
                ["H1 Tags", analysis.h1Count],
                ["H2 Tags", analysis.h2Count],
                ["Images w/o Alt", analysis.imagesMissingAlt],
                ["Page Speed", analysis.pageLoadScore ? `${analysis.pageLoadScore}/100` : null],
                ["Mobile Score", analysis.mobileScore ? `${analysis.mobileScore}/100` : null],
              ] as [string, string | number | null | undefined][]).map(([label, val]) => (
                <div key={String(label)} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-semibold ${
                    label === "Images w/o Alt" && Number(val) > 0 ? "text-amber-600" : "text-foreground"
                  }`}>{val ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Meta info */}
      {analysis.type === "website" && (analysis.metaTitle || analysis.metaDescription) && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" />
            Meta Information (from live page)
          </h2>
          {analysis.metaTitle && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title Tag</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  analysis.metaTitle.length >= 30 && analysis.metaTitle.length <= 60
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>{analysis.metaTitle.length} chars</span>
              </div>
              <p className="text-sm text-foreground bg-zinc-950 text-zinc-100 rounded-lg px-3 py-2.5 font-mono">&lt;title&gt;{analysis.metaTitle}&lt;/title&gt;</p>
              <div className="mt-1.5 flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.metaTitle.length > 60 ? "bg-red-500" : analysis.metaTitle.length < 30 ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (analysis.metaTitle.length / 60) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">60 char limit</span>
              </div>
            </div>
          )}
          {analysis.metaDescription && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta Description</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  analysis.metaDescription.length >= 120 && analysis.metaDescription.length <= 160
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>{analysis.metaDescription.length} chars</span>
              </div>
              <p className="text-sm text-foreground bg-zinc-950 text-zinc-100 rounded-lg px-3 py-2.5 font-mono">&lt;meta name="description" content="{analysis.metaDescription}"&gt;</p>
              <div className="mt-1.5 flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.metaDescription.length > 160 ? "bg-red-500" : analysis.metaDescription.length < 120 ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (analysis.metaDescription.length / 160) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">160 char limit</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Issues + Recommendations tabs */}
      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">
            Issues
            {issues.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-destructive/20 text-destructive">{issues.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            Recommendations
            {recommendations.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary">{recommendations.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="mt-4 space-y-3">
          {issues.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">No issues found</p>
              <p className="text-sm text-muted-foreground">This page is well-optimized. Keep up the great work!</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Click any issue card to see the <strong>exact element</strong>, <strong>line number</strong>, and <strong>fix examples</strong>.
              </p>
              {/* Sort: critical first, then warning, then info */}
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

        <TabsContent value="recommendations" className="mt-4 space-y-3">
          {recommendations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border text-muted-foreground text-sm">
              No recommendations available.
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Sorted by priority. Each recommendation includes the specific tags and code you should add or change.
              </p>
              {[...recommendations]
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return (order[a.priority as keyof typeof order] ?? 9) - (order[b.priority as keyof typeof order] ?? 9);
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
