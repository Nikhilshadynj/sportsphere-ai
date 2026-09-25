# app/api/conversation.py
import json
from uuid import UUID
from app.models.message import Message
from app.core.redis import redis_client

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

# Existing imports
from app.core.database import get_db
from app.models.conversation import Conversation

router = APIRouter()

# Request body validation
class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Chat"

@router.post("/conversation")
async def create_conversation(
    payload: CreateConversationRequest,
    x_user_id: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    # 1. Naya conversation object banao
    new_conv = Conversation(
        user_id=x_user_id,
        title=payload.title
    )
    
    # 2. Database me insert karo
    db.add(new_conv)
    await db.commit()
    await db.refresh(new_conv)  # Taaki hume generate hua UUID mil sake
    
    # 3. Frontend ke hisaab se _id key ke saath response bhejo
    return {
        "_id": str(new_conv.id),
        "title": new_conv.title,
        "user_id": new_conv.user_id
    }

@router.get("/list")
async def list_conversations(
    x_user_id: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    # 1. User ki conversations query karo aur updatedAt descending sort karo
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == x_user_id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    # 2. Exact Node jaisa response shape format karo
    formatted_conversations = [
        {
            "_id": str(conv.id),
            "title": conv.title,
            "createdAt": conv.created_at.isoformat() if conv.created_at else None,
            "updatedAt": conv.updated_at.isoformat() if conv.updated_at else None
        }
        for conv in conversations
    ]

    return {
        "success": True,
        "conversations": formatted_conversations
    }

@router.get("/conversation/{id}/messages")
async def get_messages(
    id: UUID,
    x_user_id: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    cache_key = f"messages:{id}"
    
    # 1. Redis me check karo (Cache-aside)
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)  # Plain array return karega
    except Exception as e:
        print(f"Redis get error: {e}")
        # Agar redis fail ho, to gracefully DB pe fallback karo

    # 2. Cache miss, to Postgres se nikalo aur createdAt ascending sort karo
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    # 3. Node ke exact response shape me convert karo
    formatted_messages = []
    for msg in messages:
        formatted_messages.append({
            "_id": str(msg.id),
            "conversationId": str(msg.conversation_id),
            "role": msg.role,
            "content": msg.content,
            "createdAt": msg.created_at.isoformat() if hasattr(msg, 'created_at') and msg.created_at else None,
            "updatedAt": msg.updated_at.isoformat() if hasattr(msg, 'updated_at') and msg.updated_at else None
        })

    # 4. Redis me cache set karo (eg. 1 hour TTL)
    try:
        # Pydantic/FastAPI list of dicts ko apne aap json banati hai response ke liye, 
        # par redis me explicitly stringify karna padta hai
        await redis_client.setex(cache_key, 3600, json.dumps(formatted_messages))
    except Exception as e:
        print(f"Redis set error: {e}")

    # Plain array return kar rahe hain, koi 'success' wrapper nahi
    return formatted_messages