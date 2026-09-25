import os
import hashlib
import uuid
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import PointStruct,Filter, FieldCondition, MatchValue
from app.services.embedding import QDRANT_URL, QDRANT_COLLECTION, OLLAMA_EMBEDDING_MODEL

QDRANT_BATCH_SIZE = int(os.getenv("QDRANT_BATCH_SIZE", "50"))
qdrant_client = AsyncQdrantClient(url=QDRANT_URL)

async def store_document_chunks(document_id: str, user_id: str, original_name: str, chunks: list) -> int:
    if not chunks:
        return 0
        
    points = []
    for chunk in chunks:
        # Deterministic UUID generation mapping Node logic
        hash_str = hashlib.sha256(f"{document_id}:{chunk['chunkIndex']}".encode()).hexdigest()
        point_id = str(uuid.UUID(hex=hash_str[:32]))
        
        payload = {
            "documentId": document_id,
            "userId": user_id,
            "originalName": original_name,
            "chunkIndex": chunk["chunkIndex"],
            "text": chunk["text"],
            "characterCount": chunk["characterCount"],
            "startCharacter": chunk["startCharacter"],
            "endCharacter": chunk["endCharacter"],
            "embeddingModel": OLLAMA_EMBEDDING_MODEL
        }
        
        points.append(
            PointStruct(id=point_id, vector=chunk["embedding"], payload=payload)
        )
        
    batches = [points[i:i + QDRANT_BATCH_SIZE] for i in range(0, len(points), QDRANT_BATCH_SIZE)]
    
    for batch in batches:
        await qdrant_client.upsert(
            collection_name=QDRANT_COLLECTION,
            points=batch,
            wait=True
        )
        
    return len(points)

async def search_document_chunks(query_vector: list, user_id: str, document_id: str = None, limit: int = 5, score_threshold: float = 0.3) -> list:
    if not query_vector:
        raise ValueError("Query vector cannot be empty")

    # Security: Multi-Tenancy Filter (Ensure user only searches their own docs)
    must_filters = [
        FieldCondition(key="userId", match=MatchValue(value=user_id))
    ]
    
    # Optionally filter by a specific document if requested
    if document_id:
        must_filters.append(FieldCondition(key="documentId", match=MatchValue(value=document_id)))

    # NAYI LINE: search() ki jagah query_points() use kar rahe hain
    response = await qdrant_client.query_points(
        collection_name=QDRANT_COLLECTION,
        query=query_vector,   # NAYI LINE: query_vector ki jagah sirf 'query' parameter
        limit=limit,
        score_threshold=score_threshold,
        query_filter=Filter(must=must_filters),
        with_payload=True
    )

    # Transform Qdrant response exactly to Node.js format
    retrieved_chunks = []
    
    # NAYI LINE: results ab response.points ke andar aate hain
    for result in response.points:
        payload = result.payload or {}
        retrieved_chunks.append({
            "id": result.id,
            "score": result.score,
            "documentId": str(payload.get("documentId", "")),
            "originalName": str(payload.get("originalName", "")),
            "chunkIndex": int(payload.get("chunkIndex", 0)),
            "text": str(payload.get("text", "")),
            "startCharacter": int(payload.get("startCharacter", 0)),
            "endCharacter": int(payload.get("endCharacter", 0))
        })

    return retrieved_chunks