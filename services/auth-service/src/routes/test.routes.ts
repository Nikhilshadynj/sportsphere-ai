import { Router, Response } from "express";
import authMiddleware from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";
import { AuthRequest } from "../types/auth";

const router = Router();

router.get("/protected", authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    message: "Protected route working",
    role: req.user?.role,
  });
});

router.get(
  "/admin-only",
  authMiddleware,
  authorize("admin"),
  (req: AuthRequest, res: Response) => {
    res.json({
      message: "Admin-only test route",
      role: req.user?.role,
    });
  }
);

export default router;
