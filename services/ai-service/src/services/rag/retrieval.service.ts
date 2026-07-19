import {
  generateQueryEmbedding,
} from "./embedding.service";

import {
  searchDocumentChunks,
} from "./vector-store.service";

import {
  RetrievedChunk,
} from "../../types/rag.types";

interface RetrieveContextInput {
  query: string;
  userId: string;
  documentId?: string;
  limit?: number;
}

export async function retrieveContext(
  input: RetrieveContextInput
): Promise<RetrievedChunk[]> {
  const {
    query,
    userId,
    documentId,
    limit = 5,
  } = input;

  const normalizedQuery =
    query.trim();

  if (!normalizedQuery) {
    throw new Error(
      "Query is required"
    );
  }

  const queryVector =
    await generateQueryEmbedding(
      normalizedQuery
    );

  const chunks =
    await searchDocumentChunks({
      queryVector,
      userId,
      documentId,
      limit,
      scoreThreshold: 0.3,
    });

  return chunks;
}