import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import analysesRouter from "./analyses.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysesRouter);

export default router;
