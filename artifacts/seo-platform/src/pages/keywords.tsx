import { useListKeywords, useListProjects, useCreateKeyword, useDeleteKeyword, getListKeywordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function TrendBadge({ trend }: { trend: string | null | undefined }) {
  if (trend === "up") return (
    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
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
          projectId: Number(projectId),
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

  const handleDelete = (id: number) => {
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
    : keywords?.filter(k => String(k.projectId) === filterProject);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Keywords</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track and monitor keyword rankings over time</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-keyword">
              <Plus className="w-4 h-4" />Track Keyword
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Track New Keyword</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger data-testid="select-project"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Keyword</Label>
                <Input value={kwInput} onChange={e => setKwInput(e.target.value)} placeholder="e.g. react tutorials" data-testid="input-keyword" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Monthly Volume</Label>
                  <Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="e.g. 5000" data-testid="input-volume" />
                </div>
                <div>
                  <Label>Difficulty (0–100)</Label>
                  <Input type="number" min={0} max={100} value={difficulty} onChange={e => setDifficulty(e.target.value)} placeholder="e.g. 65" data-testid="input-difficulty" />
                </div>
              </div>
              <Button className="w-full" onClick={handleAdd} disabled={createKeyword.isPending || !kwInput.trim() || !projectId} data-testid="button-submit-keyword">
                {createKeyword.isPending ? "Adding..." : "Track Keyword"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Keyword</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Current Rank</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Prev Rank</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Volume</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Difficulty</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground">Trend</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((kw) => (
                <tr key={kw.id} className="border-b border-border last:border-0 hover:bg-muted/20 group" data-testid={`row-keyword-${kw.id}`}>
                  <td className="px-5 py-3.5 font-medium text-foreground">{kw.keyword}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-foreground">
                    {kw.currentRank ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">{kw.previousRank ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right text-muted-foreground">{kw.searchVolume?.toLocaleString() ?? "—"}</td>
                  <td className="px-5 py-3.5"><DifficultyBar difficulty={kw.difficulty} /></td>
                  <td className="px-5 py-3.5 flex justify-center"><TrendBadge trend={kw.trend} /></td>
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
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <Key className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No keywords tracked</h3>
          <p className="text-sm text-muted-foreground mb-4">Start tracking keywords to monitor ranking performance over time.</p>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />Track First Keyword
          </Button>
        </div>
      )}
    </div>
  );
}
