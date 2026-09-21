# app/api/conversation.py
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