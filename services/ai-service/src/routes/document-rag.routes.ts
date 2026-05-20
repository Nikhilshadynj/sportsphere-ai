import express from "express";
import { askDocument } from "../controllers/document-rag.controller";

const router = express.Router();

router.post("/documents/ask", askDocument);

export default router;