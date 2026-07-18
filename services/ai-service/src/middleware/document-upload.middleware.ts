import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer, {
  FileFilterCallback,
} from "multer";
import { Request } from "express";

const uploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "documents"
);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (
    _req,
    _file,
    callback
  ) => {
    callback(null, uploadDirectory);
  },

  filename: (
    _req,
    file,
    callback
  ) => {
    const extension =
      path.extname(file.originalname)
        .toLowerCase();

    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}${extension}`;

    callback(null, uniqueName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  const isPdfMimeType =
    file.mimetype === "application/pdf";

  const isPdfExtension =
    path.extname(file.originalname)
      .toLowerCase() === ".pdf";

  if (!isPdfMimeType || !isPdfExtension) {
    callback(
      new Error(
        "Only PDF documents are allowed"
      )
    );

    return;
  }

  callback(null, true);
};

export const uploadDocument =
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  }).single("document");