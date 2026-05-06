import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import analysesRouter from "./analyses";
import keywordsRouter from "./keywords";
import recommendationsRouter from "./recommendations";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(analysesRouter);
router.use(keywordsRouter);
router.use(recommendationsRouter);
router.use(dashboardRouter);
router.use("/auth", authRouter);

export default router;
