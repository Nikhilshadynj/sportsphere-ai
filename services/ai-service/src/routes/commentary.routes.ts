import express from "express";

import { summarizeCommentary } from "../controllers/commentary.controller";

const router = express.Router();

router.post(
  "/commentary/summarize",
  summarizeCommentary
);

export default router;