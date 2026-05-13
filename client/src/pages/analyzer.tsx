import { useMemo, useState, useEffect } from "react";
import {
  useCreateAnalysis, useListAnalyses, useListProjects,
  getListAnalysesQueryKey, useDeleteAnalysis
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, Globe, Youtube, Instagram, Clock, CheckCircle,
  XCircle, RefreshCw, ArrowRight, Trash2, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { GlowCard } from "@/components/ui/glow-card";

type AnalysisType = "website" | "youtube" | "instagram";
type SortOption = "newest" | "oldest" | "az" | "za" | "highestScore" | "lowestScore";

const ANALYSIS_TABS: { type: AnalysisType; label: string; icon: any; placeholder: string }[] = [
  { type: "website", label: "Website", icon: Globe, placeholder: "https://example.com" },
  { type: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/watch?v=..." },
  { type: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/p/..." },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />;
  if (status === "failed") return <XCircle className="w-5 h-5 text-red-500 shrink-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />;
  if (status === "running") return <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin shrink-0 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />;
  if (status === "queued") return <Clock className="w-5 h-5 text-amber-400 animate-pulse shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />;
  return <Clock className="w-5 h-5 text-amber-500 shrink-0" />;
}

export default function Analyzer() {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<AnalysisType>("website");
  const [projectId, setProjectId] = useState<string>("none");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [pendingAnalysisId, setPendingAnalysisId] = useState<string | null>(null);

  const { data: analyses, isLoading } = useListAnalyses();
  const { data: projects } = useListProjects();
  const createAnalysis = useCreateAnalysis();
  const deleteAnalysis = useDeleteAnalysis();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const activeTab = ANALYSIS_TABS.find(t => t.type === type) || ANALYSIS_TABS[0];

  // Auto-polling and redirect logic
  useEffect(() => {
    if (!analyses) return;

    // Check if we need to redirect
    if (pendingAnalysisId) {
      const pending = analyses.find(a => a.id === pendingAnalysisId);
      if (pending && pending.status === "completed") {
        toast({ title: "Analysis Complete", description: "Redirecting to results..." });
        navigate(`/analyses/${pending.id}`);
        setPendingAnalysisId(null);
        return;
      }
      if (pending && pending.status === "failed") {
        setPendingAnalysisId(null);
      }
    }

    // Poll if any analysis is running/queued
    const hasRunning = analyses.some(a => a.status === "running" || a.status === "queued");
    if (hasRunning) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [analyses, pendingAnalysisId, navigate, queryClient, toast]);

  const handleSubmit = () => {
    if (!url.trim()) return;

    createAnalysis.mutate(
      { data: { url: url.trim(), type, projectId: projectId && projectId !== "none" ? projectId : null } },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
          setUrl("");
          
          if (data?.id) {
            setPendingAnalysisId(data.id);
            toast({ title: "Analysis started", description: "Sit tight while we analyze the URL." });
          }
        },
        onError: (err: any) => {
          toast({
            title: "Error",
            description: err?.data?.error || "Failed to start analysis",
            variant: "destructive"
          });
        },
      }
    );
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(prev => prev === id ? null : prev), 3000);
      return;
    }

    setDeleting(id);
    deleteAnalysis.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
        toast({ title: "Deleted", description: "Analysis removed." });
        setDeleting(null);
        setConfirmDelete(null);
      },
      onError: () => {
        toast({ title: "Error", description: "Could not delete analysis.", variant: "destructive" });
        setDeleting(null);
        setConfirmDelete(null);
      }
    });
  };

  const sorted = useMemo(() => {
    if (!Array.isArray(analyses)) return [];
    const copied = [...analyses];
    switch (sortBy) {
      case "newest": return copied.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "oldest": return copied.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "az": return copied.sort((a, b) => a.url.localeCompare(b.url));
      case "za": return copied.sort((a, b) => b.url.localeCompare(a.url));
      case "highestScore": return copied.sort((a, b) => (b.seoScore || 0) - (a.seoScore || 0));
      case "lowestScore": return copied.sort((a, b) => (a.seoScore || 0) - (b.seoScore || 0));
      default: return copied;
    }
  }, [analyses, sortBy]);

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-3xl font-black text-foreground tracking-tight neon-text-cyan">URL Analyzer</h1>
        <p className="text-muted-foreground text-sm font-medium">Submit a URL for deep SEO and AI visibility analysis</p>
      </div>

      {/* Type selector + form */}
      <GlowCard className="p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          {ANALYSIS_TABS.map(({ type: t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 glow-border-effect ${type === t
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "bg-white/5 text-muted-foreground border border-white/10 hover:text-white hover:bg-white/10"
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url-input" className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">URL to analyze</Label>
            <div className="flex gap-2">
              <Input
                id="url-input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={activeTab.placeholder}
                className="flex-1 bg-black/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500"
              />
              <Button
                onClick={handleSubmit}
                disabled={createAnalysis.isPending || !!pendingAnalysisId || !url.trim()}
                className="gap-2 shrink-0 min-w-[120px]"
              >
                {createAnalysis.isPending || !!pendingAnalysisId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-select" className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Assign to project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project-select" className="w-full md:w-72 bg-black/40 border-white/10">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 backdrop-blur-xl">
                <SelectItem value="none">No project</SelectItem>
                {Array.isArray(projects) && projects.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Loading overlay for active analysis */}
        {pendingAnalysisId && (
          <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl border border-cyan-500/30 glow-border-effect">
            <div className="flex flex-col items-center gap-4 p-6 bg-card border border-white/10 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="font-bold text-lg neon-text-cyan">Analysis in Progress</p>
                <p className="text-sm text-muted-foreground">Crawling site and gathering AI visibility metrics...</p>
              </div>
            </div>
          </div>
        )}
      </GlowCard>

      {/* Recent analyses */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-foreground text-lg tracking-tight">Recent Analyses</h2>
            {sorted.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full glow-border-effect">
                {sorted.length} Total
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sort By</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[180px] bg-black/40 border-white/10 h-8 text-xs glow-border-effect">
                <SelectValue placeholder="Sort analyses" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 backdrop-blur-xl">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="az">URL A → Z</SelectItem>
                <SelectItem value="za">URL Z → A</SelectItem>
                <SelectItem value="highestScore">Highest Score</SelectItem>
                <SelectItem value="lowestScore">Lowest Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : sorted.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((an) => (
              <div key={an.id} className="group relative h-full min-w-0">
                <Link href={`/analyses/${an.id}`} className="block h-full min-w-0">
                  <GlowCard className="flex flex-col gap-4 p-5 cursor-pointer h-full hover:border-cyan-500/30 transition-all duration-300" glowColor={an.status === "completed" ? "rgba(6, 182, 212, 0.15)" : "rgba(251, 191, 36, 0.15)"}>
                    
                    <div className="flex items-start justify-between gap-4 w-full min-w-0">
                      <div className="flex items-center gap-3 min-w-0 pr-24 flex-1">
                         <div className="shrink-0 bg-black/30 p-2.5 rounded-xl border border-white/5 shadow-[inset_0_0_15px_rgba(255,255,255,0.02)]">
                            <StatusIcon status={an.status} />
                         </div>
                         <div className="min-w-0 flex-1">
                           <p className="text-sm font-bold text-foreground truncate break-all group-hover:text-cyan-400 transition-colors" title={an.url}>{an.url.replace(/^https?:\/\//, '')}</p>
                           <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mt-0.5">{new Date(an.createdAt).toLocaleDateString()}</p>
                         </div>
                      </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                        <div className="flex flex-wrap items-center gap-2">
                           <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2 py-0.5 bg-black/40 rounded border border-white/5 flex items-center gap-1.5">
                             {an.type === 'website' ? <Globe className="w-3 h-3 text-cyan-400"/> : an.type === 'youtube' ? <Youtube className="w-3 h-3 text-red-400"/> : <Instagram className="w-3 h-3 text-pink-400"/>}
                             {an.type}
                           </span>
                           {an.status === "queued" && <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold animate-pulse">Queued</span>}
                           {an.status === "running" && <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold animate-pulse">Analyzing</span>}
                        </div>
                        
                        {an.seoScore != null ? (
                          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-md border border-white/5">
                             <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Score</span>
                             <span className={`text-lg font-black tracking-tighter leading-none ${an.seoScore >= 80 ? "text-emerald-400 neon-text-cyan" : an.seoScore >= 60 ? "text-amber-400" : "text-red-500"}`}>
                                {an.seoScore}
                             </span>
                          </div>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-cyan-400 transition-colors group-hover:translate-x-1" />
                        )}
                    </div>
                  </GlowCard>
                </Link>

                <div className="absolute top-4 right-4 z-10">
                  {confirmDelete === an.id ? (
                    <button
                      onClick={(e) => handleDelete(an.id, e)}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white bg-red-500/80 hover:bg-red-500 px-3 py-1.5 rounded-md transition-colors shadow-[0_0_10px_rgba(239,68,68,0.4)] backdrop-blur-sm"
                      title="Click to confirm deletion"
                    >
                      {deleting === an.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDelete(an.id, e)}
                      disabled={deleting === an.id}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-md bg-black/50 border border-transparent hover:border-red-500/30 text-muted-foreground hover:text-red-400 transition-all backdrop-blur-sm"
                      title="Delete this analysis"
                    >
                      {deleting === an.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <GlowCard className="flex flex-col items-center justify-center py-20 text-center border-dashed">
            <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-bold text-foreground text-lg mb-2 tracking-tight">No analyses yet</h3>
            <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
              Enter a URL above and click Analyze to generate your first deep SEO and AI visibility report.
            </p>
          </GlowCard>
        )}
      </div>
    </div>
  );
}
