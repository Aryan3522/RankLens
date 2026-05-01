import { useState } from "react";
import { useCreateAnalysis, useListAnalyses, useListProjects, getListAnalysesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Globe, Youtube, Instagram, Clock, CheckCircle, XCircle, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type AnalysisType = "website" | "youtube" | "instagram";

const tabs: { type: AnalysisType; label: string; icon: React.ElementType; placeholder: string }[] = [
  { type: "website", label: "Website", icon: Globe, placeholder: "https://example.com" },
  { type: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/watch?v=..." },
  { type: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/p/..." },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === "running") return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
}

export default function Analyzer() {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<AnalysisType>("website");
  const [projectId, setProjectId] = useState<string>("");
  const { data: analyses, isLoading } = useListAnalyses();
  const { data: projects } = useListProjects();
  const createAnalysis = useCreateAnalysis();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
          setTimeout(() => queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() }), 1500);
        },
        onError: () => toast({ title: "Error", description: "Failed to start analysis", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">URL Analyzer</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Submit a URL for deep SEO analysis</p>
      </div>

      {/* Type selector */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex gap-2">
          {tabs.map(({ type: t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              data-testid={`tab-type-${t}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
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
              <Button onClick={handleSubmit} disabled={createAnalysis.isPending || !url.trim()} className="gap-2 shrink-0" data-testid="button-analyze">
                <Search className="w-4 h-4" />
                {createAnalysis.isPending ? "Analyzing..." : "Analyze"}
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
                  <SelectItem key={p.id} value={String(p.id)} data-testid={`option-project-${p.id}`}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Recent analyses */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Recent Analyses</h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : analyses && analyses.length > 0 ? (
          <div className="space-y-2">
            {[...analyses].reverse().slice(0, 10).map((an) => (
              <Link key={an.id} href={`/analyses/${an.id}`} data-testid={`row-analysis-${an.id}`}>
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3.5 hover:shadow-sm transition-all cursor-pointer">
                  <StatusIcon status={an.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{an.url}</p>
                    <p className="text-xs text-muted-foreground capitalize">{an.type} · {new Date(an.createdAt).toLocaleString()}</p>
                  </div>
                  {an.seoScore != null && (
                    <span className={`text-sm font-bold ${an.seoScore >= 80 ? "text-emerald-600" : an.seoScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                      {an.seoScore}/100
                    </span>
                  )}
                  {an.issueCount != null && (
                    <span className="text-xs text-muted-foreground shrink-0">{an.issueCount} issues</span>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
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
