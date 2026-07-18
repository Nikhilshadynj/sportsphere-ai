import { Router } from "express";
import {
  createMatch,
  getMatches,
  getMatchById,
  getUpcomingMatches,
} from "../controllers/match.controller";

const router = Router();

router.post("/", createMatch);

router.get("/", getMatches);

// IMPORTANT:
// /upcoming ko /:id se pehle rakhna hai,
// otherwise Express "upcoming" ko match ID maan lega.
router.get("/upcoming", getUpcomingMatches);

router.get("/:id", getMatchById);

export default router;