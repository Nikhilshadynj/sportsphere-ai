import express from "express";
import { askAI } from "../controllers/openai.controller";

const router = express.Router();

router.post("/ask", askAI);

export default router;