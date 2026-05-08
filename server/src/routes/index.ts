import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import projectsRouter from "./projects.js";
import analysesRouter from "./analyses.js";
import keywordsRouter from "./keywords.js";
import recommendationsRouter from "./recommendations.js";
import dashboardRouter from "./dashboard.js";
import authRouter from "./auth.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(analysesRouter);
router.use(keywordsRouter);
router.use(recommendationsRouter);
router.use(dashboardRouter);
router.use("/auth", authRouter);

export default router;
