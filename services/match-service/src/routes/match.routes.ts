import express from "express";
import {
  createMatch,
  getMatchById,
  getMatches,
} from "../controllers/match.controller";

const router = express.Router();

router.post("/", createMatch);
router.get("/", getMatches);
router.get("/:id", getMatchById);

export default router;