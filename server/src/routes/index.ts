import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import analysesRouter from "./analyses.js";
import authRouter from "./auth.js";
import paymentsRouter from "./payments.js";
import adminRouter from "./admin.js";
import profileRouter from "./profile.js";
import sitesRouter from "./sites.js";
import projectsRouter from "./projects.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysesRouter);
router.use("/auth", authRouter);
router.use("/payments", paymentsRouter);
router.use("/admin", adminRouter);
router.use("/profile", profileRouter);
router.use(sitesRouter);
router.use(projectsRouter);

export default router;
