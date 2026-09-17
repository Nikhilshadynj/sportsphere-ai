# app/consumers/chat_title.py
"""
Chat-title consumer — Step 3: manual ack/nack + retry/DLQ routing.
Replaces Step 2's message.process() auto-ack with explicit control.
"""
import json
import os
from datetime import datetime, timezone

import aio_pika
from openai import AsyncOpenAI
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.rabbit import QUEUE_MAIN, QUEUE_RETRY, EXCHANGE_NAME, ROUTING_KEY, MAX_RETRIES
from app.core.redis import invalidate_cache
from app.models.conversation import Conversation

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "Teri_OpenRouter_Key_Yaha_Aayegi")
ai_client = AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")

CONVERSATION_UPDATED_QUEUE = "conversation.updated"


def _get_retry_count(message: aio_pika.IncomingMessage) -> int:
    """
    RabbitMQ tracks this for us automatically in the 'x-death' header —
    we don't maintain our own counter anywhere. We filter specifically for
    OUR retry queue's name, in case this message's headers ever accumulate
    death records from elsewhere.

    NOTE: verify at runtime whether 'queue' comes back as str or bytes in
    this aio_pika version — added a decode fallback below just in case.
    """
    headers = message.headers or {}
    deaths = headers.get("x-death", [])
    for death in deaths:
        queue_name = death.get("queue")
        if isinstance(queue_name, bytes):
            queue_name = queue_name.decode()
        if queue_name == QUEUE_RETRY:
            return int(death.get("count", 0))
    return 0


async def start_chat_title_consumer(channel: aio_pika.RobustChannel):
    await channel.declare_queue(CONVERSATION_UPDATED_QUEUE, durable=True)
    queue = await channel.get_queue(QUEUE_MAIN)
    dlq_exchange = await channel.get_exchange(f"{EXCHANGE_NAME}.dlq")

    async def handle_message(message: aio_pika.IncomingMessage):
        # Manual control now — no more `async with message.process()`.
        # We decide explicitly: ack (done), reject-to-retry, or
        # publish-to-DLQ-then-ack.
        try:
            payload = json.loads(message.body.decode())
            conversation_id = payload["conversationId"]
            first_message = payload["message"]

            print(f"[chat-title-py] processing conversation {conversation_id}")

            completion = await ai_client.chat.completions.create(
                model="openrouter/free",
                messages=[
                    {
                        "role": "system",
                        "content": "Generate a very short chat title (max 5 words). Return only the title.",
                    },
                    {"role": "user", "content": first_message},
                ],
            )
            content = completion.choices[0].message.content
            title = content.strip() if content else None

            if not title:
                print(f"[chat-title-py] empty title, acking anyway (not a retryable failure): {conversation_id}")
                await message.ack()
                return

            async with SessionLocal() as db:
                result = await db.execute(
                    select(Conversation).where(Conversation.id == conversation_id)
                )
                conversation = result.scalar_one_or_none()

                if not conversation:
                    print(f"[chat-title-py] conversation {conversation_id} not found, acking (not retryable)")
                    await message.ack()
                    return

                conversation.title = title
                conversation.updated_at = datetime.now(timezone.utc)
                await db.commit()
                user_id = conversation.user_id

            await invalidate_cache(f"conversations:{user_id}")

            await channel.default_exchange.publish(
                aio_pika.Message(
                    body=json.dumps({
                        "conversationId": str(conversation_id),
                        "title": title,
                        "userId": user_id,
                    }).encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                ),
                routing_key=CONVERSATION_UPDATED_QUEUE,
            )

            await message.ack()
            print(f"[chat-title-py] success — title '{title}' set for {conversation_id}")

        except Exception as e:
            retry_count = _get_retry_count(message)
            print(f"[chat-title-py] FAILED (attempt {retry_count + 1}/{MAX_RETRIES + 1}): {e}")

            if retry_count < MAX_RETRIES:
                # reject(requeue=False) sends it to the main queue's
                # configured dead-letter-exchange, which is EXCHANGE_NAME
                # + ".retry" (set in rabbit.py's main_queue arguments).
                # It sits in the retry queue for RETRY_TTL_MS, then
                # RabbitMQ auto-routes it back to the main queue for us.
                await message.reject(requeue=False)
                print(f"[chat-title-py] routed to retry queue (will retry after TTL)")
            else:
                # Exhausted retries — route to the permanent DLQ ourselves
                # (main queue's default DLX points to retry, not DLQ, so
                # we publish there explicitly), then ack the original to
                # remove it from the main queue.
                await dlq_exchange.publish(
                    aio_pika.Message(
                        body=message.body,
                        headers=message.headers,
                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    ),
                    routing_key=ROUTING_KEY,
                )
                await message.ack()
                print(f"[chat-title-py] max retries exceeded — moved to DLQ permanently")

    await queue.consume(handle_message)
    print("[chat-title-py] consumer started (Step 3: retry/DLQ active)")