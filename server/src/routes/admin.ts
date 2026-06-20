import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import {
  listAllUsers,
  listPayments,
  listSubscriptions,
  approvePayment,
  declinePayment,
  getPaymentStats,
  getUsersCount,
} from "../db/index.js";

const router: IRouter = Router();

router.use(requireAuth, requireAdmin);

router.get("/users", async (req: Request, res: Response) => {
  const users = listAllUsers();
  res.json({ users, total: users.length });
});

router.get("/payments", async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const result = listPayments(limit, offset);
  res.json(result);
});

router.get("/subscriptions", async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  const offset = Number(req.query.offset) || 0;
  const result = listSubscriptions(limit, offset);
  res.json(result);
});

router.get("/stats", async (req: Request, res: Response) => {
  const paymentStats = getPaymentStats();
  const totalUsers = getUsersCount();
  res.json({ ...paymentStats, totalUsers });
});

router.post("/payments/:id/approve", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!id) { res.status(400).json({ error: "Missing payment ID" }); return; }
  approvePayment(id);
  res.json({ success: true });
});

router.post("/payments/:id/decline", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!id) { res.status(400).json({ error: "Missing payment ID" }); return; }
  declinePayment(id);
  res.json({ success: true });
});

export default router;
