import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    # UUID Node ke ObjectId ka kaam karega
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, default="New Chat", nullable=False)
    
    # timezone=True zaroori hai taaki UTC time accurately save ho
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))