import os
from openai import AsyncOpenAI

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "Teri_OpenRouter_Key")
ai_client = AsyncOpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free")

async def generate_rag_answer(query: str, chunks: list) -> dict:
    query = query.strip()
    if not query:
        raise ValueError("Query is required")

    # Edge Case: Agar PDF me wo data hai hi nahi, toh hallucinate mat karo.
    if not chunks:
        return {
            "answer": "I could not find this information in the uploaded documents.",
            "sources": []
        }

    # Context format karna (exact Node.js jaisa)
    context_parts = []
    for i, chunk in enumerate(chunks):
        part = f"[Source {i + 1}]\nDocument: {chunk['originalName']}\nChunk: {chunk['chunkIndex']}\nSimilarity score: {chunk['score']:.4f}\n\n{chunk['text']}"
        context_parts.append(part)
        
    context = "\n\n---\n\n".join(context_parts)

    system_prompt = (
        "You are a document question-answering assistant.\n"
        "Answer only from the provided document context.\n"
        "Do not use outside knowledge.\n"
        "Do not invent or assume missing facts.\n"
        "If the answer is not clearly available in the context, say:\n"
        '"I could not find this information in the uploaded documents."\n'
        "Keep the answer direct and concise.\n"
        "When useful, mention the source number in square brackets, such as [Source 1]."
    )

    user_prompt = f"DOCUMENT CONTEXT:\n{context}\n\nUSER QUESTION:\n{query}"

    completion = await ai_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        temperature=0.1,  # Low temperature for factual RAG answers
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    )

    answer = completion.choices[0].message.content.strip()

    # Frontend expects sources to display match % and text preview
    sources = []
    for chunk in chunks:
        sources.append({
            "documentId": chunk["documentId"],
            "originalName": chunk["originalName"],
            "chunkIndex": chunk["chunkIndex"],
            "score": chunk["score"],
            "textPreview": chunk["text"][:200]
        })

    return {
        "answer": answer,
        "sources": sources
    }