import { useListKeywords, useListProjects, useCreateKeyword, useDeleteKeyword, getListKeywordsQueryKey } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/charts/Sparkline";
import { MetricChip } from "@/components/charts/MetricChip";
import { useToast } from "@/hooks/use-toast";

function rankSeries(kw: { currentRank?: number | null; previousRank?: number | null }): number[] {
  return [kw.previousRank, kw.currentRank].filter((n): n is number => typeof n === "number");
}

function TrendBadge({ trend }: { trend: string | null | undefined }) {
  if (trend === "up") return (
    <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
      <TrendingUp className="w-3.5 h-3.5" />Up
    </span>
  );
  if (trend === "down") return (
    <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
      <TrendingDown className="w-3.5 h-3.5" />Down
    </span>
  );
  return <span className="flex items-center gap-1 text-muted-foreground text-xs"><Minus className="w-3.5 h-3.5" />Stable</span>;
}

function DifficultyBar({ difficulty }: { difficulty: number | null | undefined }) {
  if (!difficulty) return <span className="text-muted-foreground">—</span>;
  const color = difficulty >= 70 ? "bg-red-500" : difficulty >= 40 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${difficulty}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{difficulty}</span>
    </div>
  );
}

export default function Keywords() {
  const { data: keywords, isLoading } = useListKeywords();
  const { data: projects } = useListProjects();
  const createKeyword = useCreateKeyword();
  const deleteKeyword = useDeleteKeyword();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [kwInput, setKwInput] = useState("");
  const [projectId, setProjectId] = useState("");
  const [volume, setVolume] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [filterProject, setFilterProject] = useState("all");

  const handleAdd = () => {
    if (!kwInput.trim() || !projectId) return;
    createKeyword.mutate(
      {
        data: {
          projectId: projectId,
          keyword: kwInput.trim(),
          searchVolume: volume ? Number(volume) : null,
          difficulty: difficulty ? Number(difficulty) : null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() });
          setOpen(false);
          setKwInput(""); setProjectId(""); setVolume(""); setDifficulty("");
          toast({ title: "Keyword added" });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Stop tracking this keyword?")) return;
    deleteKeyword.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() });
        toast({ title: "Keyword removed" });
      },
    });
  };

  const filtered = filterProject === "all"
    ? keywords
    : keywords?.filter(k => k.projectId === filterProject);

  const diff = {
    easy: filtered?.filter((k) => (k.difficulty ?? 0) > 0 && k.difficulty! < 40).length ?? 0,
    medium: filtered?.filter((k) => (k.difficulty ?? 0) >= 40 && k.difficulty! < 70).length ?? 0,
    hard: filtered?.filter((k) => (k.difficulty ?? 0) >= 70).length ?? 0,
  };
  const avgRank = (() => {
    const ranks = filtered?.map((k) => k.currentRank).filter((n): n is number => typeof n === "number") ?? [];
    return ranks.length ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length) : null;
  })();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="neon-text-cyan text-3xl font-black tracking-tight text-foreground">Keywords</h1>
          <p className="mt-0.5 text-sm font-medium text-muted-foreground">Ranking performance over time</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-keyword">
              <Plus className="w-4 h-4" />Track Keyword
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <DialogHeader><DialogTitle className="text-xl font-bold tracking-tight text-cyan-400">Track New Keyword</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger data-testid="select-project" className="bg-muted/40 border-white/10"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent className="bg-card border-white/10 backdrop-blur-xl">
                    {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Keyword</Label>
                <Input value={kwInput} onChange={e => setKwInput(e.target.value)} placeholder="e.g. react tutorials" className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500" data-testid="input-keyword" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monthly Volume</Label>
                  <Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="e.g. 5000" className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500" data-testid="input-volume" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Difficulty (0–100)</Label>
                  <Input type="number" min={0} max={100} value={difficulty} onChange={e => setDifficulty(e.target.value)} placeholder="e.g. 65" className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500" data-testid="input-difficulty" />
                </div>
              </div>
              <Button className="w-full mt-2 bg-cyan-500 text-black hover:bg-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]" onClick={handleAdd} disabled={createKeyword.isPending || !kwInput.trim() || !projectId} data-testid="button-submit-keyword">
                {createKeyword.isPending ? "Adding..." : "Track Keyword"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground">Filter by project:</span>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-48" data-testid="select-filter-project">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricChip value={filtered.length} label="Tracked" />
            <MetricChip value={avgRank ?? "—"} label="Avg rank" accent="text-foreground" />
            <MetricChip value={diff.easy} label="Easy" accent="text-emerald-500" />
            <MetricChip value={diff.hard} label="Hard" accent="text-[#FF5E7A]" />
          </div>

          <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02]">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Keyword</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Rank</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">Trend</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Volume</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Difficulty</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((kw) => {
                  const series = rankSeries(kw);
                  const improving = series.length === 2 && series[1] < series[0];
                  return (
                    <tr key={kw.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] group" data-testid={`row-keyword-${kw.id}`}>
                      <td className="px-5 py-3.5 font-medium text-foreground">{kw.keyword}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-foreground">
                        {kw.currentRank ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <Sparkline values={series} invert color={improving ? "#29D398" : kw.trend === "down" ? "#FF5E7A" : "#4F8CFF"} width={72} />
                          <TrendBadge trend={kw.trend} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground">{kw.searchVolume?.toLocaleString() ?? "—"}</td>
                      <td className="px-5 py-3.5"><DifficultyBar difficulty={kw.difficulty} /></td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDelete(kw.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                          data-testid={`button-delete-keyword-${kw.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-20 text-center bg-white/[0.01]">
          <Key className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2 tracking-tight">No keywords tracked</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-[300px] leading-relaxed">Start tracking keywords to monitor ranking performance over time.</p>
          <Button onClick={() => setOpen(true)} className="gap-2 bg-cyan-500 text-black hover:bg-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Plus className="w-4 h-4" />Track First Keyword
          </Button>
        </div>
      )}
    </div>
  );
}
