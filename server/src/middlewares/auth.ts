import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/lib/env.js";
import { db, usersTable } from "@/db/index.js";
import { eq } from "drizzle-orm";

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Check if user is already authenticated via session (Passport)
    if (typeof req.isAuthenticated === "function" && req.isAuthenticated()) {
      return next();
    }

    // 2. Check for Authorization header (JWT)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as { id: number };
        
        // Fetch user from DB
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, decoded.id))
          .limit(1);

        if (user) {
          (req as any).user = user;
          return next();
        }
      } catch (jwtErr) {
        logger.warn({ err: jwtErr }, "JWT verification failed");
        return res.status(401).json({ error: "Invalid or expired token." });
      }
    }

    // If we reach here, no valid auth was found
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  } catch (err) {
    // Catch-all to prevent 500 errors that cause CORS issues
    logger.error({ err }, "Error in isAuthenticated middleware");
    return res.status(401).json({ error: "Authentication failed. Please try again." });
  }
}
