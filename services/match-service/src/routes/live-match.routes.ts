import { Router } from "express";
import { fetchLiveMatches, syncLiveMatches } from "../controllers/live-match.controller";

const router = Router();

router.get("/", fetchLiveMatches);
router.post("/sync", syncLiveMatches);

export default router;