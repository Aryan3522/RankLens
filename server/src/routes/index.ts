import { Router, type IRouter } from "express";
import healthRouter from "@/routes/health.js";
import projectsRouter from "@/routes/projects.js";
import analysesRouter from "@/routes/analyses.js";
import keywordsRouter from "@/routes/keywords.js";
import recommendationsRouter from "@/routes/recommendations.js";
import dashboardRouter from "@/routes/dashboard.js";
import authRouter from "@/routes/auth.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(analysesRouter);
router.use(keywordsRouter);
router.use(recommendationsRouter);
router.use(dashboardRouter);
router.use("/auth", authRouter);

export default router;
