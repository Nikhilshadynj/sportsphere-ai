# app/core/rabbit.py
import aio_pika

async def get_rabbit_channel():
    # Connect to RabbitMQ (amqp://guest:guest@localhost:5672)
    connection = await aio_pika.connect_robust("amqp://guest:guest@localhost:5672/")
    channel = await connection.channel()
    
    # Assert Exchange (Node: channel.assertExchange)
    exchange = await channel.declare_exchange("chat", aio_pika.ExchangeType.DIRECT, durable=True)
    
    return connection, channel, exchange