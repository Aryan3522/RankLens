import { useState } from "react";
import {
  useCreateAnalysis, useListAnalyses, useListProjects,
  getListAnalysesQueryKey,
} from "@/api";
import { customFetch } from "@/api/custom-fetch";
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

const tabs: { type: AnalysisType; label: string; icon: React.ElementType; placeholder: string }[] = [
  { type: "website",   label: "Website",   icon: Globe,      placeholder: "https://example.com" },
  { type: "youtube",   label: "YouTube",   icon: Youtube,    placeholder: "https://youtube.com/watch?v=..." },
  { type: "instagram", label: "Instagram", icon: Instagram,  placeholder: "https://instagram.com/p/..." },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === "failed")    return <XCircle    className="w-4 h-4 text-red-500 shrink-0" />;
  if (status === "running")   return <RefreshCw  className="w-4 h-4 text-blue-500 animate-spin shrink-0" />;
  return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
}

export default function Analyzer() {
  const [url, setUrl]           = useState("");
  const [type, setType]         = useState<AnalysisType>("website");
  const [projectId, setProjectId] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const { data: analyses, isLoading } = useListAnalyses();
  const { data: projects } = useListProjects();
  const createAnalysis = useCreateAnalysis();
  const queryClient    = useQueryClient();
  const { toast }      = useToast();
  const [, navigate]   = useLocation();

  const activeTab = tabs.find(t => t.type === type)!;

  const handleSubmit = () => {
    if (!url.trim()) return;
    createAnalysis.mutate(
      { data: { url: url.trim(), type, projectId: projectId && projectId !== "none" ? Number(projectId) : null } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
          setUrl("");
          toast({ title: "Analysis started", description: `Analyzing ${data.url}` });
          setTimeout(() => queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() }), 2000);
        },
        onError: () => toast({ title: "Error", description: "Failed to start analysis", variant: "destructive" }),
      }
    );
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirmDelete !== id) {
      setConfirmDelete(id);
      // auto-reset confirm after 3s
      setTimeout(() => setConfirmDelete(prev => prev === id ? null : prev), 3000);
      return;
    }

    setDeleting(id);
    setConfirmDelete(null);
    try {
      await customFetch(`/api/analyses/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
      toast({ title: "Deleted", description: "Analysis removed." });
    } catch {
      toast({ title: "Error", description: "Could not delete analysis.", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const sorted = analyses ? [...analyses].reverse() : [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">URL Analyzer</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Submit a URL for deep SEO analysis</p>
      </div>

      {/* Type selector + form */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ type: t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              data-testid={`tab-type-${t}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="url-input">URL to analyze</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                id="url-input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={activeTab.placeholder}
                className="flex-1"
                data-testid="input-url"
              />
              <Button
                onClick={handleSubmit}
                disabled={createAnalysis.isPending || !url.trim()}
                className="gap-2 shrink-0"
                data-testid="button-analyze"
              >
                <Search className="w-4 h-4" />
                {createAnalysis.isPending ? "Analyzing…" : "Analyze"}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="project-select">Assign to project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project-select" className="mt-1.5 w-64" data-testid="select-project">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)} data-testid={`option-project-${p.id}`}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Recent analyses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Recent Analyses</h2>
          {sorted.length > 0 && (
            <span className="text-xs text-muted-foreground">{sorted.length} total</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : sorted.length > 0 ? (
          <div className="space-y-2">
            {sorted.map((an) => (
              <div key={an.id} className="group relative" data-testid={`row-analysis-${an.id}`}>
                <Link href={`/analyses/${an.id}`}>
                  <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3.5 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer pr-24">
                    <StatusIcon status={an.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{an.url}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {an.type} · {new Date(an.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {an.seoScore != null && (
                      <span className={`text-sm font-bold shrink-0 ${
                        an.seoScore >= 80 ? "text-emerald-600" : an.seoScore >= 60 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {an.seoScore}/100
                      </span>
                    )}
                    {an.issueCount != null && (
                      <span className="text-xs text-muted-foreground shrink-0">{an.issueCount} issues</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>

                {/* Delete button — floated right, outside the Link */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {confirmDelete === an.id ? (
                    <button
                      onClick={(e) => handleDelete(an.id, e)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors"
                      title="Click to confirm deletion"
                    >
                      {deleting === an.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDelete(an.id, e)}
                      disabled={deleting === an.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
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
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No analyses yet</h3>
            <p className="text-sm text-muted-foreground">Submit a URL above to run your first SEO analysis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
