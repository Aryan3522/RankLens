import { Router } from "express";
import passport from "../lib/auth/passport.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, usersTable } from "../db/index.js";
import { eq } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET || "development-secret";

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const results = await db
      .insert(usersTable)
      .values({
        email,
        password: hashedPassword,
        name: name || null,
      })
      .returning();
    
    const user = results[0];

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message || "Authentication failed." });

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  })(req, res, next);
});

router.post("/logout", (req, res) => {
  // Stateless JWT logout is usually handled by client by deleting the token
  res.sendStatus(204);
});

router.get("/me", (req, res) => {
  // This will be handled by the updated isAuthenticated middleware which sets req.user
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  const user = req.user as any;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});

export default router;
