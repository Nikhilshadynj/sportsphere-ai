import json
import aio_pika
from app.core.rabbit import get_rabbit_channel, DOC_EXCHANGE_NAME, DOC_ROUTING_KEY

async def publish_document_processing_event(
    document_id: str, 
    user_id: str, 
    file_path: str, 
    original_name: str
) -> None:
    """
    Publishes an event to RabbitMQ to trigger async PDF processing.
    """
    # 1. Channel get karo
    _, channel, _ = await get_rabbit_channel()
    
    # 2. Topology me jo naya exchange declare kiya tha, usko get karo
    exchange = await channel.get_exchange(DOC_EXCHANGE_NAME)
    
    # 3. Payload construct karo
    payload = {
        "documentId": document_id,
        "userId": user_id,
        "filePath": file_path,
        "originalName": original_name
    }
    
    # 4. Exchange par publish karo (queue declare karne ki zaroorat nahi)
    await exchange.publish(
        aio_pika.Message(
            body=json.dumps(payload).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            content_type="application/json"
        ),
        routing_key=DOC_ROUTING_KEY
    )
    
    print(f"Published document processing event for doc: {document_id}")