import {
  Router,
} from "express";

import {
  chatWithAgent,
} from "../controllers/agent.controller";

const router = Router();

router.post("/agent/chat", chatWithAgent);

export default router;