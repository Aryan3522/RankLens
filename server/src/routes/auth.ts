import { Router } from "express";
import passport from "@/lib/auth/passport.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@/db/index.js";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env.js";
import { isAuthenticated } from "@/middlewares/auth.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  let { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  email = email.trim().toLowerCase();

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

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: "30d" });

    // Establish session (keep for backward compatibility if needed)
    req.login(user, (err) => {
      if (err) return next(err);
      return res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    });
  } catch (err: any) {
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message || "Authentication failed." });

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      
      const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: "30d" });

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    });
  })(req, res, next);
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("ranklens.sid"); // Clear the session cookie
      res.sendStatus(204);
    });
  });
});

router.get("/me", isAuthenticated, (req, res) => {
  const user = req.user as any;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});

export default router;
