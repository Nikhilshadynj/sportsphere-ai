import { Router } from "express";

import {
  uploadDocumentController,
} from "../controllers/document.controller";

import {
  uploadDocument,
} from "../middleware/document-upload.middleware";

import {
  authenticate,
} from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/upload",
  uploadDocument,
  uploadDocumentController
);

export default router;