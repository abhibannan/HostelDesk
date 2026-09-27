import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/auth.js";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }
    next();
  };
}
