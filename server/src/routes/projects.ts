import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { createProject, listProjects, getProjectById, deleteProject } from "../db/index.js";

const router: IRouter = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().optional(),
  description: z.string().optional(),
});

router.get("/projects", requireAuth, (req, res) => {
  const projects = listProjects(req.user!.sub);
  res.json(projects);
});

router.post("/projects", requireAuth, (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join("; ") });
    return;
  }
  try {
    const project = createProject(req.user!.sub, parsed.data.name, parsed.data.domain, parsed.data.description);
    res.status(201).json(project);
  } catch {
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/projects/:id", requireAuth, (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }
  const project = getProjectById(id, req.user!.sub);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(project);
});

router.delete("/projects/:id", requireAuth, (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }
  deleteProject(id, req.user!.sub);
  res.status(204).end();
});

export default router;
