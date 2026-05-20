import express from "express";

import upload from "../config/multer";

import { uploadDocument } from "../controllers/document.controller";

const router = express.Router();

router.post(
  "/documents/upload",
  upload.single("file"),
  uploadDocument
);

export default router;