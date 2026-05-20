import { Request, Response } from "express";

import fs from "fs";

import { PDFParse } from "pdf-parse";

import Document from "../models/document.model";

import DocumentChunk from "../models/documentChunk.model";

import { generateEmbedding } from "../services/embedding.service";

const CHUNK_SIZE = 1200;

function chunkText(text: string) {
  const chunks: string[] = [];

  for (
    let i = 0;
    i < text.length;
    i += CHUNK_SIZE
  ) {
    chunks.push(
      text.slice(
        i,
        i + CHUNK_SIZE
      )
    );
  }

  return chunks;
}

export const uploadDocument =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({
            message:
              "No file uploaded",
          });
      }

      // save document metadata
      const document =
        await Document.create({
          originalName:
            req.file.originalname,

          fileName:
            req.file.filename,

          mimeType:
            req.file.mimetype,

          size: req.file.size,
        });

      // read PDF
      const dataBuffer =
        fs.readFileSync(
          req.file.path
        );

      const parser = new PDFParse({ data: dataBuffer });
      const pdfData = await parser.getText();
      await parser.destroy();

      const text = pdfData.text;

      // chunking
      const chunks =
        chunkText(text);

      // embeddings + save
      for (
        let i = 0;
        i < chunks.length;
        i++
      ) {
        const embedding =
          await generateEmbedding(
            chunks[i]
          );

        await DocumentChunk.create(
          {
            documentId:
              document._id,

            content:
              chunks[i],

            chunkIndex: i,

            embedding,
          }
        );
      }

      res.json({
        message:
          "Document uploaded successfully",

        documentId:
          document._id,

        chunks:
          chunks.length,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message:
          "Document upload failed",
      });
    }
  };