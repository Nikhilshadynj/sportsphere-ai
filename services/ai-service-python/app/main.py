from contextlib import asynccontextmanager

from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

from app.api.chat import router as chat_router
from app.api.conversation import router as conversation_router
from app.api.document import router as document_router
from app.core.rabbit import get_rabbit_channel, close_rabbit
from app.consumers.chat_title import start_chat_title_consumer
from app.consumers.document_processing import start_document_consumer
from app.services.embedding import initialize_vector_store

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to RabbitMQ (this also declares the full topology —
    # see app/core/rabbit.py — chat-py exchange, chat-title-py queue,
    # retry queue, DLQ, plus the shared conversation.updated queue) and
    # start the chat-title consumer.
    _, channel, _ = await get_rabbit_channel()
    await start_chat_title_consumer(channel)
    await initialize_vector_store()
    await start_document_consumer(channel)
    print("Startup complete — chat-title-py consumer is running")

    yield  # app runs here

    # Shutdown
    await close_rabbit()
    print("Rabbit connection closed")


app = FastAPI(
    title="Sportsphere AI Service",
    description="Python RAG and Analytics Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify the service is running.
    """
    return {"success": True, "message": "Python AI Service is running!"}


app.include_router(chat_router, prefix="/api")
app.include_router(conversation_router, prefix="/api")
app.include_router(document_router, prefix="/api/documents")