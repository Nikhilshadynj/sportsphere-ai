# app/schemas/chat.py
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

# Ye tera incoming JSON validate karega
class ChatRequest(BaseModel):
    conversationId: UUID
    message: str

# Ye tera outgoing response format hoga
class ChatResponse(BaseModel):
    response: str