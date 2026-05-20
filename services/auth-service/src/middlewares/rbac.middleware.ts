import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/auth";
import { Role } from "../types/role";

export const authorize =
  (...allowedRoles: Role[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
        requiredRoles: allowedRoles,
        yourRole: req.user.role,
      });
    }

    next();
  };
