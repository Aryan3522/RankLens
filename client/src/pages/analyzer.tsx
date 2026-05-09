import { useState } from "react";
import {
  useCreateAnalysis, useListAnalyses, useListProjects,
  getListAnalysesQueryKey, useDeleteAnalysis
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, Globe, Youtube, Instagram, Clock, CheckCircle,
  XCircle, RefreshCw, ArrowRight, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type AnalysisType = "website" | "youtube" | "instagram";

const ANALYSIS_TABS: { type: AnalysisType; label: string; icon: any; placeholder: string }[] = [
  { type: "website",   label: "Website",   icon: Globe,      placeholder: "https://example.com" },
  { type: "youtube",   label: "YouTube",   icon: Youtube,    placeholder: "https://youtube.com/watch?v=..." },
  { type: "instagram", label: "Instagram", icon: Instagram,  placeholder: "https://instagram.com/p/..." },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === "failed")    return <XCircle    className="w-4 h-4 text-red-500 shrink-0" />;
  if (status === "running")   return <RefreshCw  className="w-4 h-4 text-blue-500 animate-spin shrink-0" />;
  if (status === "queued")    return <Clock      className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />;
  return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
}

export default function Analyzer() {
  const [url, setUrl]           = useState("");
  const [type, setType]         = useState<AnalysisType>("website");
  const [projectId, setProjectId] = useState<string>("none");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: analyses, isLoading } = useListAnalyses();
  const { data: projects } = useListProjects();
  const createAnalysis = useCreateAnalysis();
  const deleteAnalysis = useDeleteAnalysis();
  const queryClient    = useQueryClient();
  const { toast }      = useToast();
  const [, navigate]   = useLocation();

  // Find active tab safely
  const activeTab = ANALYSIS_TABS.find(t => t.type === type) || ANALYSIS_TABS[0];

  const handleSubmit = () => {
    if (!url.trim()) return;
    
    createAnalysis.mutate(
      { data: { url: url.trim(), type, projectId: projectId && projectId !== "none" ? projectId : null } },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
          setUrl("");
          const msg = data?.url ? `Analyzing ${data.url}` : "Analysis started";
          toast({ title: "Analysis started", description: msg });
          
          // Re-fetch after short delay to catch progress
          setTimeout(() => {
             queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
          }, 2000);
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

  const sorted = Array.isArray(analyses) ? [...analyses].reverse() : [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">URL Analyzer</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Submit a URL for deep SEO analysis</p>
      </div>

      {/* Type selector + form */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {ANALYSIS_TABS.map(({ type: t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                type === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url-input">URL to analyze</Label>
            <div className="flex gap-2">
              <Input
                id="url-input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={activeTab.placeholder}
                className="flex-1"
              />
              <Button
                onClick={handleSubmit}
                disabled={createAnalysis.isPending || !url.trim()}
                className="gap-2 shrink-0 min-w-[100px]"
              >
                {createAnalysis.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {createAnalysis.isPending ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-select">Assign to project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project-select" className="w-full md:w-72">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {Array.isArray(projects) && projects.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Recent analyses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Analyses</h2>
          {sorted.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded-full">
              {sorted.length} total
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : sorted.length > 0 ? (
          <div className="space-y-2">
            {sorted.map((an) => (
              <div key={an.id} className="group relative">
                <Link href={`/analyses/${an.id}`}>
                  <div className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer pr-24">
                    <StatusIcon status={an.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{an.url}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">
                        {an.type} · {new Date(an.createdAt).toLocaleDateString()}
                        {an.status === "queued" && <span className="ml-2 text-amber-600 animate-pulse">In Queue</span>}
                      </p>
                    </div>
                    {an.seoScore != null && (
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-black ${
                          an.seoScore >= 80 ? "text-emerald-600" : an.seoScore >= 60 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {an.seoScore}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Score</p>
                      </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  </div>
                </Link>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {confirmDelete === an.id ? (
                    <button
                      onClick={(e) => handleDelete(an.id, e)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors shadow-sm"
                      title="Click to confirm deletion"
                    >
                      {deleting === an.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDelete(an.id, e)}
                      disabled={deleting === an.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all focus:opacity-100"
                      title="Delete this analysis"
                    >
                      {deleting === an.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed border-border">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-bold text-foreground mb-1">No analyses yet</h3>
            <p className="text-sm text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
              Enter a URL above and click Analyze to generate your first SEO audit report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
