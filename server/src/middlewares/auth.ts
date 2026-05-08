import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/lib/env.js";
import { db, usersTable } from "@/db/index.js";
import { eq } from "drizzle-orm";

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // 1. Check if user is already authenticated via session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // 2. Check for Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: number };
      
      // Fetch user and attach to request
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, decoded.id))
        .limit(1);

      if (user) {
        // Manually attach user to request object
        (req as any).user = user;
        return next();
      }
    } catch (err) {
      // Token invalid or expired
      return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
    }
  }

  res.status(401).json({ error: "Unauthorized. Please log in." });
}
