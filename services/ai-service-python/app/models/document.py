import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

# Using Enum ensures only specific states can be saved in the database
class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Document(Base):
    __tablename__ = "documents"

    # Primary key using UUID for security and distributed system compatibility
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # user_id is indexed because we will frequently query documents by user
    user_id = Column(String, index=True, nullable=False)
    
    original_name = Column(String, nullable=False)
    stored_name = Column(String, unique=True, nullable=False)
    file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    
    # Native PostgreSQL Enum type mapping
    status = Column(
        Enum(DocumentStatus), 
        default=DocumentStatus.UPLOADED, 
        index=True, 
        nullable=False
    )
    
    chunk_count = Column(Integer, default=0)
    page_count = Column(Integer, nullable=True)
    character_count = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    
    # Timezone-aware datetimes are critical for preventing time-shift bugs
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )