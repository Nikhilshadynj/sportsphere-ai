import { channel } from "../config/rabbit";
import { DocumentProcessingEvent } from "../types/document-event.types";

const DOCUMENT_PROCESSING_QUEUE =
  "document.processing";

export async function publishDocumentProcessingEvent(
  event: DocumentProcessingEvent
): Promise<void> {

  await channel.assertQueue(
    DOCUMENT_PROCESSING_QUEUE,
    {
      durable: true,
    }
  );

  const published =
    channel.sendToQueue(
      DOCUMENT_PROCESSING_QUEUE,
      Buffer.from(
        JSON.stringify(event)
      ),
      {
        persistent: true,
        contentType:
          "application/json",
      }
    );

  if (!published) {
    console.warn(
      "Document event buffered by RabbitMQ"
    );
  }

  console.log(
    `Document processing event published: ${event.documentId}`
  );
}