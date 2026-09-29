# app/api/chat.py
import json
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from openai import AsyncOpenAI
import aio_pika

# Hamari banayi hui files import kar rahe hain
from app.core.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ChatRequest, ChatResponse
from app.core.redis import invalidate_cache
from app.core.rabbit import get_rabbit_channel

router = APIRouter()

# OpenAI client for OpenRouter
# (Bina API key ke test nahi hoga, baad me env se uthayenge, abhi ke liye aise hi likh de)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "Teri_OpenRouter_Key_Yaha_Aayegi")
ai_client = AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    payload: ChatRequest, 
    x_user_id: str = Header(...), # Express req.headers["x-user-id"]
    db: AsyncSession = Depends(get_db)
):
    try:
        # 1. Save user message
        user_msg = Message(
            conversation_id=payload.conversationId, 
            role="user", 
            content=payload.message
        )
        db.add(user_msg)
        await db.commit()

        # 2. Fetch conversation history (sort by createdAt ascending)
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == payload.conversationId)
            .order_by(Message.created_at.asc())
        )
        messages = result.scalars().all()

        # 3. Convert messages for LLM
        formatted_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

        # 4. AI Request
        completion = await ai_client.chat.completions.create(
            model="openrouter/free",
            messages=formatted_messages
        )
        ai_response = completion.choices[0].message.content

        if not ai_response:
            raise HTTPException(status_code=500, detail="AI returned empty response")

        # 5. Save AI response
        assistant_msg = Message(
            conversation_id=payload.conversationId, 
            role="assistant", 
            content=ai_response
        )
        db.add(assistant_msg)
        await db.commit()

        # 6. Invalidate Redis cache immediately after DB write
        # (Fixes Race #2: previously this ran after the RabbitMQ publish,
        # leaving a window where GET /messages served stale cached data)
        await invalidate_cache(f"messages:{payload.conversationId}", f"conversations:{x_user_id}")

        # 7. Atomic title check + RabbitMQ publish
        # (Fixes Race #1 & #3: UPDATE ... WHERE title = 'New Chat' is
        # atomic — only the first concurrent request wins the row,
        # preventing duplicate title-generation events)
        title_result = await db.execute(
            update(Conversation)
            .where(
                Conversation.id == payload.conversationId,
                Conversation.title == "New Chat",
            )
            .values(title="Generating...")
            .returning(Conversation.id)
        )
        was_new_chat = title_result.scalar_one_or_none() is not None
        await db.commit()

        if was_new_chat:
            _, channel, exchange = await get_rabbit_channel()
            
            message_body = json.dumps({
                "conversationId": str(payload.conversationId), 
                "message": payload.message
            }).encode()
            
            await exchange.publish(
                aio_pika.Message(
                    body=message_body, 
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                ),
                routing_key="chat.created"
            )
            print("Published to RabbitMQ")

        # 8. Update conversation timestamp
        await db.execute(
            update(Conversation)
            .where(Conversation.id == payload.conversationId)
            .values(updated_at=datetime.now(timezone.utc))
        )
        await db.commit()

        return {"response": ai_response}

    except Exception as e:
        import traceback; traceback.print_exc()
        traceback.print_exc()
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Chat failed")