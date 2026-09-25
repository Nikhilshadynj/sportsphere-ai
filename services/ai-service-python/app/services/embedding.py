import os
import httpx
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import VectorParams, Distance

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "10"))
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "768"))
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "sportsphere_documents")

qdrant_client = AsyncQdrantClient(url=QDRANT_URL)

async def generate_chunk_embeddings(chunks: list) -> list:
    if not chunks:
        return []
        
    batches = [chunks[i:i + EMBEDDING_BATCH_SIZE] for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE)]
    embedded_chunks = []
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        for batch in batches:
            texts = [c["text"] for c in batch]
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/embed",
                json={"model": OLLAMA_EMBEDDING_MODEL, "input": texts, "truncate": True}
            )
            response.raise_for_status()
            
            result = response.json()
            if "embeddings" not in result:
                raise Exception("Ollama response does not contain embeddings")
                
            embeddings = result["embeddings"]
            if len(embeddings) != len(batch):
                raise Exception(f"Embedding count mismatch. Expected {len(batch)}, received {len(embeddings)}")
                
            for i, chunk in enumerate(batch):
                emb = embeddings[i]
                if len(emb) != EMBEDDING_DIMENSION:
                    raise Exception(f"Embedding dimension mismatch for chunk {chunk['chunkIndex']}")
                chunk["embedding"] = emb
                embedded_chunks.append(chunk)
                
    return embedded_chunks

async def initialize_vector_store():
    collections_response = await qdrant_client.get_collections()
    exists = any(c.name == QDRANT_COLLECTION for c in collections_response.collections)
    
    if not exists:
        await qdrant_client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE)
        )
        print(f"Qdrant collection created: {QDRANT_COLLECTION}")
    else:
        print(f"Qdrant collection already exists: {QDRANT_COLLECTION}")
        
        
async def generate_query_embedding(query: str) -> list:
    normalized_query = query.strip()
    if not normalized_query:
        raise ValueError("Query cannot be empty")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/embed",
            json={"model": OLLAMA_EMBEDDING_MODEL, "input": [normalized_query], "truncate": True}
        )
        response.raise_for_status()
        
        result = response.json()
        if "embeddings" not in result or not result["embeddings"]:
            raise Exception("Query embedding could not be generated")
            
        return result["embeddings"][0]        