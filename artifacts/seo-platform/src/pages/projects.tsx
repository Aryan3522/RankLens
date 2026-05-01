import { useState } from "react";
import { useListProjects, useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Globe, TrendingUp, BarChart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDeleteProject } from "@workspace/api-client-react";

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-muted-foreground">No analysis</span>;
  const color = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}/100</span>;
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

  const handleDelete = (e: React.MouseEvent, id: number) => {
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your tracked SEO projects</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-project">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="proj-name">Project Name</Label>
                <Input id="proj-name" value={name} onChange={e => setName(e.target.value)} placeholder="My Website" data-testid="input-project-name" />
              </div>
              <div>
                <Label htmlFor="proj-domain">Domain</Label>
                <Input id="proj-domain" value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" data-testid="input-project-domain" />
              </div>
              <div>
                <Label htmlFor="proj-desc">Description (optional)</Label>
                <Input id="proj-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." data-testid="input-project-description" />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createProject.isPending || !name.trim() || !domain.trim()} data-testid="button-submit-project">
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} data-testid={`card-project-${project.id}`}>
              <div className="group bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer relative">
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                  data-testid={`button-delete-project-${project.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{project.domain}</p>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BarChart className="w-3.5 h-3.5" />
                    {project.totalAnalyses} {project.totalAnalyses === 1 ? "analysis" : "analyses"}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Latest score: <ScoreBadge score={project.latestScore} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first project to start tracking SEO performance.</p>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create First Project
          </Button>
        </div>
      )}
    </div>
  );
}
