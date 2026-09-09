# app/core/rabbit.py
import os
import aio_pika

RABBIT_URL = os.getenv("RABBIT_URL", "amqp://guest:guest@localhost:5672/")

RETRY_TTL_MS = int(os.getenv("CHAT_TITLE_RETRY_TTL_MS", "10000"))  # 10s
MAX_RETRIES = int(os.getenv("CHAT_TITLE_MAX_RETRIES", "3"))

# Namespaced separately from Node's setup ("chat" exchange, "chat-title"
# queue). Node's original topology is left completely untouched — it stays
# revivable any time by just restarting the Node service. Python builds
# its own isolated topology here instead of reusing/colliding with it.
EXCHANGE_NAME = "chat-py"
QUEUE_MAIN = "chat-title-py"
QUEUE_RETRY = "chat-title-py-retry"
QUEUE_DLQ = "chat-title-py-dlq"
ROUTING_KEY = "chat.created"

_connection: aio_pika.RobustConnection | None = None
_channel: aio_pika.RobustChannel | None = None


async def get_rabbit_channel():
    global _connection, _channel

    if _connection is None or _connection.is_closed:
        _connection = await aio_pika.connect_robust(RABBIT_URL)
        _channel = await _connection.channel()
        await _channel.set_qos(prefetch_count=1)
        await _declare_topology(_channel)

    return _connection, _channel, await _channel.get_exchange(EXCHANGE_NAME)


async def _declare_topology(channel: aio_pika.RobustChannel):
    main_exchange = await channel.declare_exchange(
        EXCHANGE_NAME, aio_pika.ExchangeType.DIRECT, durable=True
    )

    retry_exchange = await channel.declare_exchange(
        f"{EXCHANGE_NAME}.retry", aio_pika.ExchangeType.DIRECT, durable=True
    )
    retry_queue = await channel.declare_queue(
        QUEUE_RETRY,
        durable=True,
        arguments={
            "x-message-ttl": RETRY_TTL_MS,
            "x-dead-letter-exchange": EXCHANGE_NAME,
            "x-dead-letter-routing-key": ROUTING_KEY,
        },
    )
    await retry_queue.bind(retry_exchange, routing_key=ROUTING_KEY)

    dlq_exchange = await channel.declare_exchange(
        f"{EXCHANGE_NAME}.dlq", aio_pika.ExchangeType.DIRECT, durable=True
    )
    dlq_queue = await channel.declare_queue(QUEUE_DLQ, durable=True)
    await dlq_queue.bind(dlq_exchange, routing_key=ROUTING_KEY)

    main_queue = await channel.declare_queue(
        QUEUE_MAIN,
        durable=True,
        arguments={
            "x-dead-letter-exchange": f"{EXCHANGE_NAME}.retry",
            "x-dead-letter-routing-key": ROUTING_KEY,
        },
    )
    await main_queue.bind(main_exchange, routing_key=ROUTING_KEY)


async def close_rabbit():
    if _connection and not _connection.is_closed:
        await _connection.close()