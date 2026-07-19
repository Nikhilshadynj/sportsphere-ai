import {
  NextFunction,
  Request,
  Response,
} from "express";
import fs from "fs/promises";

import { DocumentModel } from "../models/document.model";
import {
  publishDocumentProcessingEvent,
} from "../producers/document.producer";

interface AuthenticatedRequest
  extends Request {
  user?: {
    id?: string;
    userId?: string;
  };
}

export async function uploadDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message:
          "Please upload a PDF document",
      });

      return;
    }

    const userId = req.userId;

    if (!userId) {
      await fs.unlink(req.file.path)
        .catch(() => undefined);

      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });

      return;
    }

    const document =
      await DocumentModel.create({
        userId,
        originalName:
          req.file.originalname,
        storedName:
          req.file.filename,
        filePath:
          req.file.path,
        mimeType:
          req.file.mimetype,
        fileSize:
          req.file.size,
        status: "uploaded",
        chunkCount: 0,
      });

    try {
      await publishDocumentProcessingEvent({
        documentId:
          document._id.toString(),
        userId:
          document.userId,
        filePath:
          document.filePath,
        originalName:
          document.originalName,
      });
    } catch (rabbitError) {
      await DocumentModel.findByIdAndUpdate(
        document._id,
        {
          status: "failed",
          errorMessage:
            "Unable to queue document for processing",
        }
      );

      throw rabbitError;
    }

    res.status(201).json({
      success: true,
      message:
        "Document uploaded successfully",
      document: {
        id: document._id,
        originalName:
          document.originalName,
        fileSize:
          document.fileSize,
        status:
          document.status,
        createdAt:
          document.createdAt,
      },
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path)
        .catch(() => undefined);
    }

    next(error);
  }
}