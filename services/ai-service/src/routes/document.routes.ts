import { Router } from "express";

import {
  uploadDocumentController,
} from "../controllers/document.controller";

import {
  uploadDocument,
} from "../middleware/document-upload.middleware";

import {
  queryDocuments,
} from "../controllers/document-query.controller";
const router = Router();

router.post(
  "/upload",
  uploadDocument,
  uploadDocumentController
);

router.post(
  "/query",
  queryDocuments
);

export default router;