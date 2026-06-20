import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { requireAuth } from "../middlewares/auth.js";
import { createPayment, getDb } from "../db/index.js";
import { sendPaymentNotification } from "../lib/email.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const requestPaymentSchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
  billing: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  upiId: z.string().optional(),
});

const AMOUNTS: Record<string, number> = {
  pro_monthly: 4900,
  pro_yearly: 46800,
  enterprise_monthly: 19900,
  enterprise_yearly: 214800,
};

router.post("/request", requireAuth, async (req: Request, res: Response) => {
  const parsed = requestPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { plan, billing, upiId } = parsed.data;
  const key = `${plan}_${billing}`;
  const amount = AMOUNTS[key];
  if (!amount) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  try {
    // Create a pending payment record with a generated order ID
    const orderId = `UPI_${uuid().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const payment = createPayment(req.user!.sub, amount, plan, orderId, "completed");

    // Notify admin via email
    const db = getDb();
    const admin = db.prepare("SELECT email FROM users WHERE role = 'admin' LIMIT 1").get() as { email: string } | undefined;
    const user = db.prepare("SELECT email, name FROM users WHERE id = ?").get(req.user!.sub) as { email: string; name: string } | undefined;

    if (admin) {
      sendPaymentNotification({
        adminEmail: admin.email,
        userEmail: user?.email || req.user!.email,
        userName: user?.name || "Unknown",
        plan,
        amount,
        paymentId: payment.id,
      });
    }

    logger.info({ userId: req.user!.sub, plan, billing, amount, paymentId: payment.id }, "Payment request created");

    res.json({
      paymentId: payment.id,
      orderId,
      amount,
      plan,
      billing,
      message: "Payment request submitted. Admin will review and approve shortly.",
    });
  } catch (err: any) {
    logger.error({ error: err.message }, "Failed to create payment request");
    res.status(500).json({ error: "Failed to create payment request" });
  }
});

// Get UPI payment info (returns admin UPI ID + QR deep link)
router.get("/info", (_req: Request, res: Response) => {
  const upiId = process.env.ADMIN_UPI_ID || "aryanhooda3522-1@okicici";
  const payeeName = process.env.ADMIN_UPI_NAME || "RankLens";

  res.json({
    upiId,
    payeeName,
    note: "RankLens Subscription",
  });
});

export default router;
