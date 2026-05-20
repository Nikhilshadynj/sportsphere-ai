import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";
import {
  getProfile,
  userArea,
  adminArea,
  aiAgentArea,
} from "../controllers/rbac.controller";

const router = Router();

router.get("/me", authMiddleware, getProfile);

router.get(
  "/user",
  authMiddleware,
  authorize("user", "admin", "ai-agent"),
  userArea
);

router.get("/admin", authMiddleware, authorize("admin"), adminArea);

router.get("/ai-agent", authMiddleware, authorize("ai-agent"), aiAgentArea);

export default router;
