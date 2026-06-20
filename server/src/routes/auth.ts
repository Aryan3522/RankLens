import { Router, type IRouter } from "express";
import { z } from "zod";
import { signToken, verifyPassword } from "../lib/auth-service.js";
import { createUser, getUserByEmailOrUsername, getUserById } from "../db/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { email, password, name, username } = parsed.data;
  const existing = getUserByEmailOrUsername(email);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  if (username) {
    const existingUser = getUserByEmailOrUsername(username);
    if (existingUser) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
  }
  const user = createUser(email, password, name, username);
  const token = signToken({ sub: user.id, email: user.email, role: user.role, plan: user.plan });
  res.status(201).json({ token, user });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { login, password } = parsed.data;
  const user = getUserByEmailOrUsername(login);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({ sub: user.id, email: user.email, role: user.role, plan: user.plan });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = getUserById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

export default router;
