import json
import aio_pika
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.rabbit import (
    get_rabbit_channel,
    QUEUE_DOC_MAIN,
    QUEUE_DOC_RETRY,
    DOC_EXCHANGE_NAME,
    DOC_ROUTING_KEY,
    MAX_RETRIES,
    declare_document_topology,
)
from app.models.document import Document, DocumentStatus
from app.services.pdf_extraction import extract_text_from_pdf
from app.services.text_chunking import chunk_text
from app.services.embedding import generate_chunk_embeddings
from app.services.vector_store import store_document_chunks


def _get_retry_count(message: aio_pika.IncomingMessage) -> int:
    headers = message.headers or {}
    deaths = headers.get("x-death", [])
    for death in deaths:
        queue_name = death.get("queue")
        if isinstance(queue_name, bytes):
            queue_name = queue_name.decode()
        if queue_name == QUEUE_DOC_RETRY:
            return int(death.get("count", 0))
    return 0


async def start_document_consumer(channel: aio_pika.RobustChannel):
    await declare_document_topology(channel)
    queue = await channel.get_queue(QUEUE_DOC_MAIN)
    dlq_exchange = await channel.get_exchange(f"{DOC_EXCHANGE_NAME}.dlq")

    async def handle_message(message: aio_pika.IncomingMessage):
        doc_id = None
        try:
            payload = json.loads(message.body.decode())
            doc_id = payload["documentId"]
            file_path = payload["filePath"]

            print(f"[doc-processing-py] Started processing {doc_id}")

            async with SessionLocal() as db:
                result = await db.execute(select(Document).where(Document.id == doc_id))
                document = result.scalar_one_or_none()

                if not document:
                    print(f"[doc-processing-py] Document {doc_id} not found, acking.")
                    await message.ack()
                    return

                document.status = DocumentStatus.PROCESSING
                document.error_message = None
                await db.commit()

                # Step 4: Extract
                extracted = await extract_text_from_pdf(file_path)

                # Step 5: Chunk
                chunks = chunk_text(extracted["text"])
                if not chunks:
                    raise Exception(
                        "No valid chunks could be created from the document"
                    )

                # Step 7: Embed
                embedded_chunks = await generate_chunk_embeddings(chunks)
                if len(embedded_chunks) != len(chunks):
                    raise Exception("Not all chunks were embedded")

                # Step 8: Store
                stored_count = await store_document_chunks(
                    document_id=str(document.id),
                    user_id=document.user_id,
                    original_name=document.original_name,
                    chunks=embedded_chunks,
                )
                if stored_count != len(embedded_chunks):
                    raise Exception("Not all document chunks were stored in Qdrant")

                # Step 9: Final Update
                document.page_count = extracted["page_count"]
                document.character_count = extracted["character_count"]
                document.chunk_count = stored_count
                document.status = DocumentStatus.COMPLETED
                document.error_message = None
                await db.commit()

            await message.ack()
            print(f"[doc-processing-py] Success! Doc {doc_id} completely processed.")

        except Exception as e:
            error_msg = str(e)
            retry_count = _get_retry_count(message)
            print(
                f"[doc-processing-py] FAILED (attempt {retry_count + 1}/{MAX_RETRIES + 1}): {error_msg}"
            )

            # Best-effort error save
        if doc_id:
            try:
                async with SessionLocal() as db:
                    res = await db.execute(
                        select(Document).where(Document.id == doc_id)
                    )
                    fail_doc = res.scalar_one_or_none()
                    if fail_doc:
                        fail_doc.status = DocumentStatus.FAILED
                        fail_doc.error_message = error_msg
                        await db.commit()
            except Exception as db_err:
                print(
                    f"[doc-processing-py] DB update failed during error handling: {db_err}"
                )

            if retry_count < MAX_RETRIES:
                await message.reject(requeue=False)
            else:
                await dlq_exchange.publish(
                    aio_pika.Message(
                        body=message.body,
                        headers=message.headers,
                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    ),
                    routing_key=DOC_ROUTING_KEY,
                )
                await message.ack()

    await queue.consume(handle_message)
    print("[doc-processing-py] consumer started (retry/DLQ active)")
