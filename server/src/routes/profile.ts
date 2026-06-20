import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { getUserById, updateUserProfile, updateUserPassword, getUserByEmailOrUsername } from "../db/index.js";
import { verifyPassword, signToken } from "../lib/auth-service.js";

const router: IRouter = Router();

router.use(requireAuth);

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.get("/", async (req: Request, res: Response) => {
  const user = getUserById(req.user!.sub);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.put("/", async (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { name, username } = parsed.data;
  if (username) {
    const existing = getUserByEmailOrUsername(username);
    if (existing && existing.id !== req.user!.sub) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
  }
  const user = updateUserProfile(req.user!.sub, { name, username });
  const token = signToken({ sub: user.id, email: user.email, role: user.role, plan: user.plan });
  res.json({ user, token });
});

router.put("/password", async (req: Request, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const user = getUserById(req.user!.sub);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const dbUser = getUserByEmailOrUsername(user.email);
  if (!verifyPassword(parsed.data.currentPassword, dbUser.password_hash)) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  updateUserPassword(req.user!.sub, parsed.data.newPassword);
  res.json({ success: true });
});

export default router;
