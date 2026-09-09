# app/core/rabbit.py
import os
import aio_pika

RABBIT_URL = os.getenv("RABBIT_URL", "amqp://guest:guest@localhost:5672/")

# Retry backoff — TTL on the retry queue. Message sits here, then
# auto-expires back to the main exchange after this many ms.
RETRY_TTL_MS = int(os.getenv("CHAT_TITLE_RETRY_TTL_MS", "10000"))  # 10s
MAX_RETRIES = int(os.getenv("CHAT_TITLE_MAX_RETRIES", "3"))

_connection: aio_pika.RobustConnection | None = None
_channel: aio_pika.RobustChannel | None = None


async def get_rabbit_channel():
    """
    Returns (connection, channel, main_exchange).
    Idempotent — reuses the same connection/channel across calls instead
    of opening a new one every time (chat.py currently opens one per
    request, which we should also fix later — flagging, not fixing now).
    """
    global _connection, _channel

    if _connection is None or _connection.is_closed:
        _connection = await aio_pika.connect_robust(RABBIT_URL)
        _channel = await _connection.channel()
        await _channel.set_qos(prefetch_count=1)

        await _declare_topology(_channel)

    return _connection, _channel, await _channel.get_exchange("chat")


async def _declare_topology(channel: aio_pika.RobustChannel):
    # 1. Main exchange — same as Node's "chat" exchange
    main_exchange = await channel.declare_exchange(
        "chat", aio_pika.ExchangeType.DIRECT, durable=True
    )

    # 2. Retry exchange + queue — messages land here when a handler fails.
    #    The queue itself has no consumer; its only job is to hold the
    #    message until message-TTL expires, then RabbitMQ dead-letters it
    #    BACK to the main exchange automatically (that's the retry).
    retry_exchange = await channel.declare_exchange(
        "chat.retry", aio_pika.ExchangeType.DIRECT, durable=True
    )
    retry_queue = await channel.declare_queue(
        "chat-title-retry",
        durable=True,
        arguments={
            "x-message-ttl": RETRY_TTL_MS,
            "x-dead-letter-exchange": "chat",              # where it goes after TTL expires
            "x-dead-letter-routing-key": "chat.created",    # back to the original routing key
        },
    )
    await retry_queue.bind(retry_exchange, routing_key="chat.created")

    # 3. Final DLQ — permanent parking for messages that exceeded MAX_RETRIES.
    #    No TTL, no dead-letter-exchange — nothing auto-happens here.
    #    A human (you) inspects this queue manually.
    dlq_exchange = await channel.declare_exchange(
        "chat.dlq", aio_pika.ExchangeType.DIRECT, durable=True
    )
    dlq_queue = await channel.declare_queue(
        "chat-title-dlq",
        durable=True,
    )
    await dlq_queue.bind(dlq_exchange, routing_key="chat.created")

    # 4. Main queue — this is what the consumer actually listens on.
    #    Its dead-letter-exchange points at the RETRY exchange, so any
    #    nack(requeue=False) sends the message to the retry queue by default.
    #    The consumer decides at the code level whether to route to retry
    #    vs DLQ (based on x-death count) by publishing directly to the
    #    right exchange instead of relying on this default — see Step 3.
    main_queue = await channel.declare_queue(
        "chat-title",
        durable=True,
        arguments={
            "x-dead-letter-exchange": "chat.retry",
            "x-dead-letter-routing-key": "chat.created",
        },
    )
    await main_queue.bind(main_exchange, routing_key="chat.created")


async def close_rabbit():
    if _connection and not _connection.is_closed:
        await _connection.close()