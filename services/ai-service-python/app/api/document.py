import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, Header, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.document import Document, DocumentStatus
from app.producers.document import publish_document_processing_event
from typing import Optional
from pydantic import BaseModel
from app.services.embedding import generate_query_embedding
from app.services.vector_store import search_document_chunks
from app.services.rag_answer import generate_rag_answer

router = APIRouter()

# Centralized configuration for storage
UPLOAD_DIRECTORY = os.path.join(os.getcwd(), "uploads", "documents")

@router.post("/upload")
async def upload_document(
    document: UploadFile = File(...),
    x_user_id: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    # 1. Validation: Ensure it's a PDF
    if document.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF documents are allowed")
    
    # 2. Ensure the upload directory exists
    os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
    
    # 3. Generate a secure, collision-free filename
    file_extension = ".pdf"
    secure_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(UPLOAD_DIRECTORY, secure_filename)
    
    # 4. Save the file asynchronously (prevents event loop blocking)
    file_size = 0
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            while chunk := await document.read(1024 * 1024):  # Read in 1MB chunks
                await out_file.write(chunk)
                file_size += len(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save document to disk")
    
    # 5. Database Insertion: Record the state as 'UPLOADED'
    new_doc = Document(
        user_id=x_user_id,
        original_name=document.filename,
        stored_name=secure_filename,
        file_path=file_path,
        mime_type=document.content_type,
        file_size=file_size,
        status=DocumentStatus.UPLOADED,
        chunk_count=0
    )
    
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    
    # 6. Publish event to RabbitMQ
    try:
        await publish_document_processing_event(
            document_id=str(new_doc.id),
            user_id=x_user_id,
            file_path=file_path,
            original_name=new_doc.original_name
        )
    except Exception as mq_error:
        # Graceful failure: If RabbitMQ is down, mark the document as FAILED in DB
        new_doc.status = DocumentStatus.FAILED
        new_doc.error_message = "Unable to queue document for processing"
        await db.commit()
        raise HTTPException(status_code=500, detail="Document saved, but processing queue is unavailable")
    
    # 7. Return exact JSON shape expected by the frontend
    return {
        "success": True,
        "message": "Document uploaded successfully",
        "document": {
            "id": str(new_doc.id),
            "originalName": new_doc.original_name,
            "fileSize": new_doc.file_size,
            "status": new_doc.status.value,
            "createdAt": new_doc.created_at.isoformat() if new_doc.created_at else None
        }
    }
    
# Request validation model
class QueryDocumentRequest(BaseModel):
    query: str
    documentId: Optional[str] = None
    limit: Optional[int] = 5

@router.post("/query")
async def query_documents(
    payload: QueryDocumentRequest,
    x_user_id: str = Header(...)
):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
        
    # Limit max 10 chunks to prevent huge prompt sizes
    limit = min(max(payload.limit or 5, 1), 10)

    try:
        # Step 1: Encode Question
        query_vector = await generate_query_embedding(query)
        
        # Step 2: Vector Search
        chunks = await search_document_chunks(
            query_vector=query_vector,
            user_id=x_user_id,
            document_id=payload.documentId,
            limit=limit,
            score_threshold=0.3
        )
        
        print(f"Retrieved {len(chunks)} relevant chunks for query: {query}")
        
        # Step 3: LLM Generation
        result = await generate_rag_answer(query=query, chunks=chunks)
        
        # Step 4: Frontend Exact Match Response
        return {
            "success": True,
            "query": query,
            "answer": result["answer"],
            "sources": result["sources"]
        }
    except Exception as e:
        print(f"Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to query document")    