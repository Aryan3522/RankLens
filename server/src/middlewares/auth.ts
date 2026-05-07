import type { Request, Response, NextFunction } from "express";

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.user || req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized. Please log in." });
}
