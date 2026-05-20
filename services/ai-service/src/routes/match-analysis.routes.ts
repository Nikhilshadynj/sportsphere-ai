import express from "express";
import { analyzeMatch } from "../controllers/match-analysis.controller";

const router = express.Router();

router.post("/match/analyze", analyzeMatch);

export default router;