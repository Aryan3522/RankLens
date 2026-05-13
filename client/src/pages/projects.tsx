import { useState } from "react";
import { useListProjects, useCreateProject, getListProjectsQueryKey } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Globe, TrendingUp, BarChart, Trash2, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDeleteProject } from "@/api";
import { GlowCard } from "@/components/ui/glow-card";

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">No analysis</span>;
  const colorClass = score >= 80 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
    : score >= 60 ? "text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]" 
    : "text-red-400 bg-red-500/10 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${colorClass}`}>{score} Score</span>;
}

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim() || !domain.trim()) return;
    createProject.mutate(
      { data: { name: name.trim(), domain: domain.trim(), description: description.trim() || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setOpen(false);
          setName(""); setDomain(""); setDescription("");
          toast({ title: "Project created" });
        },
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm("Delete this project?")) return;
    deleteProject.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        toast({ title: "Project deleted" });
      },
    });
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-foreground tracking-tight neon-text-cyan">Projects</h1>
          <p className="text-muted-foreground text-sm font-medium">Manage your tracked SEO projects</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)] border-cyan-500 hover:bg-cyan-500/20 text-cyan-400 bg-cyan-500/10" variant="outline" data-testid="button-create-project">
              <FolderPlus className="w-4 h-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-cyan-400">Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="proj-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project Name</Label>
                <Input id="proj-name" value={name} onChange={e => setName(e.target.value)} placeholder="My Website" className="bg-black/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500" data-testid="input-project-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-domain" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Domain</Label>
                <Input id="proj-domain" value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" className="bg-black/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500" data-testid="input-project-domain" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-desc" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description (optional)</Label>
                <Input id="proj-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." className="bg-black/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500" data-testid="input-project-description" />
              </div>
              <Button className="w-full mt-2 bg-cyan-500 text-black hover:bg-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]" onClick={handleCreate} disabled={createProject.isPending || !name.trim() || !domain.trim()} data-testid="button-submit-project">
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} data-testid={`card-project-${project.id}`} className="min-w-0">
              <GlowCard className="group p-5 cursor-pointer relative h-full flex flex-col hover:border-cyan-500/30" glowColor="rgba(6, 182, 212, 0.15)">
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 bg-black/50 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition-all p-2 rounded-md z-10 backdrop-blur-sm shadow-sm"
                  data-testid={`button-delete-project-${project.id}`}
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="flex items-start gap-4 mb-4 w-full min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]">
                    <Globe className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                  </div>
                  <div className="min-w-0 flex-1 pr-16">
                    <h3 className="text-lg font-bold text-foreground truncate break-all tracking-tight">{project.name}</h3>
                    <p className="text-[11px] font-mono text-muted-foreground truncate break-all bg-white/5 w-fit max-w-full px-2 py-0.5 rounded border border-white/5 mt-1">{project.domain}</p>
                  </div>
                </div>
                
                {project.description && (
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2 leading-relaxed flex-1">{project.description}</p>
                )}
                {!project.description && <div className="flex-1" />}
                
                <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-black/40 px-2.5 py-1.5 rounded-md border border-white/5">
                    <BarChart className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-semibold text-zinc-300">{project.totalAnalyses}</span>
                    <span className="text-[10px] uppercase tracking-widest">{project.totalAnalyses === 1 ? "analysis" : "analyses"}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto bg-black/40 px-2.5 py-1 rounded-md border border-white/5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <ScoreBadge score={project.latestScore} />
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
      ) : (
        <GlowCard className="flex flex-col items-center justify-center py-20 text-center border-dashed">
          <Globe className="w-16 h-16 text-cyan-500/30 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]" />
          <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-[300px] leading-relaxed">Create your first project to start tracking SEO performance and AI visibility.</p>
          <Button onClick={() => setOpen(true)} className="gap-2 bg-cyan-500 text-black hover:bg-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Plus className="w-4 h-4" /> Create First Project
          </Button>
        </GlowCard>
      )}
    </div>
  );
}
