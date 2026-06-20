import { useGetProject, useListAnalyses, useListKeywords, getListAnalysesQueryKey, getListKeywordsQueryKey, useCreateKeyword, getGetProjectQueryKey } from "@/api";
import { Link } from "wouter";
import { Globe, ArrowLeft, BarChart, Key, Plus, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
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
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]",
    running: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]",
    queued: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]",
    failed: "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]",
  }[status] ?? "bg-white/5 text-muted-foreground border-white/10";
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${cls}`}>{status}</span>;
}

function TrendIcon({ trend }: { trend: string | null | undefined }) {
  if (trend === "up") return <div className="bg-emerald-500/10 p-1 rounded-md border border-emerald-500/20"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /></div>;
  if (trend === "down") return <div className="bg-red-500/10 p-1 rounded-md border border-red-500/20"><TrendingDown className="w-3.5 h-3.5 text-red-400" /></div>;
  return <div className="bg-white/5 p-1 rounded-md border border-white/10"><Minus className="w-3.5 h-3.5 text-muted-foreground" /></div>;
}

export default function ProjectDetail({ id }: { id: string }) {
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

  if (projLoading) return <div className="px-4 py-6 md:px-8 md:py-10"><Skeleton className="h-32 w-full rounded-xl" /></div>;
  if (!project) return <div className="px-4 py-6 md:px-8 md:py-10 text-muted-foreground text-center py-20 font-mono">_project_not_found</div>;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <Link href="/projects">
          <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/40 border border-white/10 text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]">
            <Globe className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-foreground truncate tracking-tight">{project.name}</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1 bg-white/5 w-fit px-2 py-0.5 rounded border border-white/10">{project.domain}</p>
          </div>
        </div>
        <div className="flex gap-3 shrink-0 items-center">
          {project.latestScore != null && (
            <div className="text-right bg-muted/40 px-4 py-2 rounded-lg border border-white/5">
              <span className={`text-xl font-black tracking-tighter block leading-none ${project.latestScore >= 80 ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : project.latestScore >= 60 ? "text-amber-400" : "text-red-400"}`}>
                {project.latestScore}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Score</span>
            </div>
          )}
          <Link href="/analyzer">
            <Button size="sm" className="gap-2 bg-cyan-500 text-black hover:bg-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] h-11">
              <BarChart className="w-4 h-4" />New Analysis
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="analyses">
        <TabsList className="bg-muted/40 p-1 border border-white/5">
          <TabsTrigger value="analyses" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 border border-transparent transition-all">
            Analyses ({analyses?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="keywords" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30 border border-transparent transition-all">
            Keywords ({keywords?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyses" className="mt-6 space-y-3">
          {anLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : analyses && analyses.length > 0 ? (
            <div className="space-y-3">
              {analyses.map(an => (
                <Link key={an.id} href={`/analyses/${an.id}`} data-testid={`row-analysis-${an.id}`}>
                  <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 cursor-pointer transition-all hover:border-cyan-500/30 hover:bg-white/[0.04]">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground truncate group-hover:text-cyan-400 transition-colors">{an.url}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2 py-0.5 bg-white/5 rounded border border-white/5">
                          {an.type}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                          {new Date(an.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0 bg-muted/30 p-2 rounded-lg border border-white/5">
                      <StatusBadge status={an.status} />
                      
                      {an.seoScore != null && (
                        <span className={`text-lg font-black tracking-tighter w-10 text-right ${an.seoScore >= 80 ? "text-emerald-400 neon-text-cyan" : an.seoScore >= 60 ? "text-amber-400" : "text-red-500"}`}>
                          {an.seoScore}
                        </span>
                      )}
                      
                      {an.issueCount != null && (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-muted-foreground">{an.issueCount}</span>
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50">Issues</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center bg-white/[0.01]">
              <BarChart className="w-12 h-12 text-cyan-500/30 mb-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]" />
              <p className="text-muted-foreground text-sm mb-4">No analyses for this project.</p>
              <Link href="/analyzer">
                <Button variant="outline" className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10">Run one now</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="keywords" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={kwOpen} onOpenChange={setKwOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 bg-emerald-500/5" data-testid="button-add-keyword">
                  <Key className="w-3.5 h-3.5" />Add Keyword
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card/95 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <DialogHeader><DialogTitle className="text-xl font-bold tracking-tight text-emerald-400">Track Keyword</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Keyword</Label>
                    <Input value={kwInput} onChange={e => setKwInput(e.target.value)} placeholder="e.g. javascript tutorials" className="bg-muted/40 border-white/10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500" data-testid="input-keyword" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monthly Search Volume (optional)</Label>
                    <Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="e.g. 5000" className="bg-muted/40 border-white/10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500" data-testid="input-search-volume" />
                  </div>
                  <Button className="w-full mt-2 bg-emerald-500 text-black hover:bg-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]" onClick={handleAddKeyword} disabled={createKeyword.isPending || !kwInput.trim()} data-testid="button-submit-keyword">
                    {createKeyword.isPending ? "Adding..." : "Add Keyword"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {kwLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl mb-3" />)
          ) : keywords && keywords.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10 bg-white/[0.02]">
                    <tr>
                      <th className="text-left px-5 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Keyword</th>
                      <th className="text-right px-5 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Rank</th>
                      <th className="text-right px-5 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Volume</th>
                      <th className="text-right px-5 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Difficulty</th>
                      <th className="text-center px-5 py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {keywords.map((kw) => (
                      <tr key={kw.id} className="hover:bg-white/[0.02] transition-colors group" data-testid={`row-keyword-${kw.id}`}>
                        <td className="px-5 py-4 font-bold text-foreground group-hover:text-emerald-400 transition-colors">{kw.keyword}</td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-cyan-400">{kw.currentRank ?? "—"}</td>
                        <td className="px-5 py-4 text-right font-mono text-muted-foreground">{kw.searchVolume?.toLocaleString() ?? "—"}</td>
                        <td className="px-5 py-4 text-right text-muted-foreground">
                          {kw.difficulty != null && (
                            <Badge className="bg-muted/50 border-white/10 hover:bg-muted/50 font-mono text-[10px]">
                              {kw.difficulty}
                            </Badge>
                          )}
                          {kw.difficulty == null && "—"}
                        </td>
                        <td className="px-5 py-4 flex justify-center">
                          <TrendIcon trend={kw.trend} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center bg-white/[0.01]">
              <Key className="w-12 h-12 text-emerald-500/30 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" />
              <p className="text-muted-foreground text-sm">No keywords tracked. Add your target keywords to monitor rankings.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
