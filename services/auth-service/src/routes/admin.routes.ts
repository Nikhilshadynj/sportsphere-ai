import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";
import { listUsers, updateUserRole } from "../controllers/admin.controller";

const router = Router();

router.use(authMiddleware, authorize("admin"));

router.get("/users", listUsers);
router.patch("/users/:id/role", updateUserRole);

export default router;
