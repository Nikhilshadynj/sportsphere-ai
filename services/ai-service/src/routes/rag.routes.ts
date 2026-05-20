import express from "express";

import { askCodebase } from "../controllers/rag.controller";

const router = express.Router();

router.post("/rag/ask", askCodebase);

export default router;