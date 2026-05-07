import { Router, type IRouter } from "express";
import { eq, count, max, and } from "drizzle-orm";
import { db, projectsTable, analysesTable } from "../db/index.js";
import { CreateProjectBody, GetProjectParams, DeleteProjectParams } from "../types/generated/api.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/projects", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id))
    .orderBy(projectsTable.createdAt);

  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const [stats] = await db
        .select({ totalAnalyses: count(analysesTable.id), latestScore: max(analysesTable.seoScore) })
        .from(analysesTable)
        .where(eq(analysesTable.projectId, project.id));

      return {
        ...project,
        totalAnalyses: stats?.totalAnalyses ?? 0,
        latestScore: stats?.latestScore ?? null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      };
    })
  );

  res.json(projectsWithStats);
});

router.post("/projects", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  res.status(201).json({
    ...project,
    totalAnalyses: 0,
    latestScore: null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
});

router.get("/projects/:id", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, user.id)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [stats] = await db
    .select({ totalAnalyses: count(analysesTable.id), latestScore: max(analysesTable.seoScore) })
    .from(analysesTable)
    .where(eq(analysesTable.projectId, project.id));

  res.json({
    ...project,
    totalAnalyses: stats?.totalAnalyses ?? 0,
    latestScore: stats?.latestScore ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
});

router.delete("/projects/:id", isAuthenticated, async (req, res): Promise<void> => {
  const user = req.user as any;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, user.id)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
