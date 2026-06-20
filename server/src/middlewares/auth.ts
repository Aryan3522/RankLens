import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/auth-service.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email: string;
        role: string;
        plan: string;
      };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.user = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requirePlan(...plans: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!plans.includes(req.user.plan) && req.user.role !== "admin") {
      res.status(403).json({ error: `This requires a ${plans.join(" or ")} plan` });
      return;
    }
    next();
  };
}
