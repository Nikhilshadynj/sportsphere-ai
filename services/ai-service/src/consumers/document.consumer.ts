import { ConsumeMessage } from "amqplib";
import {
  storeDocumentChunks,
} from "../services/rag/vector-store.service";

import {
  channel,
} from "../config/rabbit";

import {
  DocumentModel,
} from "../models/document.model";

import {
  DocumentProcessingEvent,
} from "../types/document-event.types";

import {
  extractTextFromPdf,
} from "../services/rag/pdf-extraction.service";
import {
  chunkText,
} from "../services/rag/text-chunking.service";

import {
  generateChunkEmbeddings,
} from "../services/rag/embedding.service";

const DOCUMENT_PROCESSING_QUEUE =
  "document.processing";

export async function startDocumentConsumer(): Promise<void> {

  await channel.assertQueue(
    DOCUMENT_PROCESSING_QUEUE,
    {
      durable: true,
    }
  );

  channel.prefetch(1);

  await channel.consume(
    DOCUMENT_PROCESSING_QUEUE,
    async (
      message: ConsumeMessage | null
    ) => {
      if (!message) {
        return;
      }
      let documentId: string | undefined;
      try {
        const event =
          JSON.parse(
            message.content.toString()
          ) as DocumentProcessingEvent;

        console.log(
          "Document processing started:",
          event.documentId
        );

        const document =
          await DocumentModel.findById(
            event.documentId
          );

        if (!document) {
          console.error(
            `Document not found: ${event.documentId}`
          );

          channel.ack(message);
          return;
        }

        document.status =
          "processing";

        document.errorMessage =
          undefined;

        await document.save();

        const extracted =
          await extractTextFromPdf(
            document.filePath
          );

        const chunks = chunkText(
          extracted.text,
          {
            chunkSize: 1200,
            chunkOverlap: 200,
            minimumChunkSize: 100,
          }
        );

        if (chunks.length === 0) {
          throw new Error(
            "No valid chunks could be created from the document"
          );
        }

        const embeddedChunks =
          await generateChunkEmbeddings(chunks);

        if (
          embeddedChunks.length !==
          chunks.length
        ) {
          throw new Error(
            "Not all chunks were embedded"
          );
        }

        const storedChunkCount =
          await storeDocumentChunks({
            documentId:
              document._id.toString(),

            userId:
              document.userId.toString(),

            originalName:
              document.originalName,

            chunks:
              embeddedChunks,
          });

        if (
          storedChunkCount !==
          embeddedChunks.length
        ) {
          throw new Error(
            "Not all document chunks were stored in Qdrant"
          );
        }
        document.pageCount =
          extracted.pageCount;

        document.characterCount =
          extracted.characterCount;

        document.chunkCount =
          chunks.length;

        document.status = "completed";
        document.errorMessage = undefined;

        await document.save();

        console.log({
          message:
            "Document ingestion completed successfully",

          documentId:
            document._id.toString(),

          pageCount:
            extracted.pageCount,

          chunkCount:
            storedChunkCount,

          embeddingDimension:
            embeddedChunks[0]
              .embedding.length,

          status:
            document.status,
        });


        channel.ack(message);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown document processing error";

        console.error(
          "Document extraction failed:",
          error
        );

        if (documentId) {
          await DocumentModel.findByIdAndUpdate(
            documentId,
            {
              status: "failed",
              errorMessage,
            }
          ).catch((databaseError) => {
            console.error(
              "Unable to update failed document status:",
              databaseError
            );
          });
        }

        channel.nack(
          message,
          false,
          false
        );
      }
    }
  );

  console.log(
    `Document consumer listening on ${DOCUMENT_PROCESSING_QUEUE}`
  );
}