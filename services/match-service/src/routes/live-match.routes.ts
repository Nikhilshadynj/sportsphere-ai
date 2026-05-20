import express from "express";

import {
  fetchLiveMatches,
} from "../controllers/live-match.controller";

const router =
  express.Router();

router.get(
  "/live",
  fetchLiveMatches
);

export default router;