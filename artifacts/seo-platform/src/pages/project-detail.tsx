import { useGetProject, useListAnalyses, useListKeywords, getListAnalysesQueryKey, getListKeywordsQueryKey, useCreateKeyword, getGetProjectQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Globe, ArrowLeft, BarChart, Key, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const cls = {
    completed: "bg-emerald-100 text-emerald-700",
    running: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
  }[status] ?? "bg-muted text-muted-foreground";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>{status}</span>;
}

function TrendIcon({ trend }: { trend: string | null | undefined }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default function ProjectDetail({ id }: { id: number }) {
  const { data: project, isLoading: projLoading } = useGetProject(id, { query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } });
  const { data: analyses, isLoading: anLoading } = useListAnalyses({ projectId: id }, { query: { enabled: !!id, queryKey: getListAnalysesQueryKey({ projectId: id }) } });
  const { data: keywords, isLoading: kwLoading } = useListKeywords({ projectId: id }, { query: { enabled: !!id, queryKey: getListKeywordsQueryKey({ projectId: id }) } });
  const createKeyword = useCreateKeyword();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [kwOpen, setKwOpen] = useState(false);
  const [kwInput, setKwInput] = useState("");
  const [volume, setVolume] = useState("");

  const handleAddKeyword = () => {
    if (!kwInput.trim()) return;
    createKeyword.mutate(
      { data: { projectId: id, keyword: kwInput.trim(), searchVolume: volume ? Number(volume) : null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey({ projectId: id }) });
          setKwOpen(false); setKwInput(""); setVolume("");
          toast({ title: "Keyword added" });
        },
      }
    );
  };

  if (projLoading) return <div className="p-6"><Skeleton className="h-32 w-full rounded-xl" /></div>;
  if (!project) return <div className="p-6 text-muted-foreground">Project not found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.domain}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {project.latestScore != null && (
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${project.latestScore >= 80 ? "bg-emerald-100 text-emerald-700" : project.latestScore >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
              Score: {project.latestScore}
            </span>
          )}
          <Link href="/analyzer">
            <Button size="sm" className="gap-1"><BarChart className="w-3.5 h-3.5" />New Analysis</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="analyses">
        <TabsList>
          <TabsTrigger value="analyses">Analyses ({analyses?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="keywords">Keywords ({keywords?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="analyses" className="mt-4 space-y-3">
          {anLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : analyses && analyses.length > 0 ? (
            analyses.map(an => (
              <Link key={an.id} href={`/analyses/${an.id}`} data-testid={`row-analysis-${an.id}`}>
                <div className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-3.5 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{an.url}</p>
                    <p className="text-xs text-muted-foreground">{new Date(an.createdAt).toLocaleDateString()} · {an.type}</p>
                  </div>
                  <StatusBadge status={an.status} />
                  {an.seoScore != null && (
                    <span className={`text-sm font-bold ${an.seoScore >= 80 ? "text-emerald-600" : an.seoScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                      {an.seoScore}
                    </span>
                  )}
                  {an.issueCount != null && (
                    <span className="text-xs text-muted-foreground">{an.issueCount} issues</span>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border text-muted-foreground text-sm">
              No analyses for this project. <Link href="/analyzer" className="text-primary hover:underline">Run one now</Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          <div className="flex justify-end mb-3">
            <Dialog open={kwOpen} onOpenChange={setKwOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1" data-testid="button-add-keyword">
                  <Plus className="w-3.5 h-3.5" />Add Keyword
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Track Keyword</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Keyword</Label>
                    <Input value={kwInput} onChange={e => setKwInput(e.target.value)} placeholder="e.g. javascript tutorials" data-testid="input-keyword" />
                  </div>
                  <div>
                    <Label>Monthly Search Volume (optional)</Label>
                    <Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="e.g. 5000" data-testid="input-search-volume" />
                  </div>
                  <Button className="w-full" onClick={handleAddKeyword} disabled={createKeyword.isPending || !kwInput.trim()} data-testid="button-submit-keyword">
                    {createKeyword.isPending ? "Adding..." : "Add Keyword"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {kwLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl mb-2" />)
          ) : keywords && keywords.length > 0 ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Keyword</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Rank</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Volume</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Difficulty</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr key={kw.id} className="border-b border-border last:border-0 hover:bg-muted/20" data-testid={`row-keyword-${kw.id}`}>
                      <td className="px-5 py-3 font-medium text-foreground">{kw.keyword}</td>
                      <td className="px-5 py-3 text-right font-mono">{kw.currentRank ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{kw.searchVolume?.toLocaleString() ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{kw.difficulty ?? "—"}</td>
                      <td className="px-5 py-3 flex justify-center">
                        <TrendIcon trend={kw.trend} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border text-muted-foreground text-sm">
              No keywords tracked. Add your target keywords to monitor rankings.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
