import crypto from "node:crypto";

import {
    EmbeddedChunk,
} from "../../types/rag.types";

import {
    qdrantClient,
} from "../../config/qdrant";

import {
  RetrievedChunk,
} from "../../types/rag.types";


interface StoreDocumentChunksInput {
    documentId: string;
    userId: string;
    originalName: string;
    chunks: EmbeddedChunk[];
}

interface SearchDocumentChunksInput {
  queryVector: number[];
  userId: string;
  documentId?: string;
  limit?: number;
  scoreThreshold?: number;
}

const QDRANT_COLLECTION =
    process.env.QDRANT_COLLECTION ??
    "sportsphere_documents";

const QDRANT_BATCH_SIZE = Number(
    process.env.QDRANT_BATCH_SIZE ?? 50
);

const EMBEDDING_MODEL =
    process.env.OLLAMA_EMBEDDING_MODEL ??
    "nomic-embed-text";

function createPointId(
    documentId: string,
    chunkIndex: number
): string {
    const hash = crypto
        .createHash("sha256")
        .update(`${documentId}:${chunkIndex}`)
        .digest("hex");

    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        `5${hash.slice(13, 16)}`,
        `8${hash.slice(17, 20)}`,
        hash.slice(20, 32),
    ].join("-");
}

function createBatches<T>(
  items: T[],
  batchSize: number
): T[][] {
  const batches: T[][] = [];

  for (
    let index = 0;
    index < items.length;
    index += batchSize
  ) {
    batches.push(
      items.slice(
        index,
        index + batchSize
      )
    );
  }

  return batches;
}

export async function storeDocumentChunks(
  input: StoreDocumentChunksInput
): Promise<number> {
  const {
    documentId,
    userId,
    originalName,
    chunks,
  } = input;

  if (chunks.length === 0) {
    throw new Error(
      "Cannot store an empty chunk list"
    );
  }

  if (
    !Number.isInteger(QDRANT_BATCH_SIZE) ||
    QDRANT_BATCH_SIZE <= 0
  ) {
    throw new Error(
      "QDRANT_BATCH_SIZE must be a positive integer"
    );
  }

  const points = chunks.map((chunk) => ({
    id: createPointId(
      documentId,
      chunk.chunkIndex
    ),

    vector: chunk.embedding,

    payload: {
      documentId,
      userId,
      originalName,

      chunkIndex:
        chunk.chunkIndex,

      text:
        chunk.text,

      characterCount:
        chunk.characterCount,

      startCharacter:
        chunk.startCharacter,

      endCharacter:
        chunk.endCharacter,

      embeddingModel:
        EMBEDDING_MODEL,
    },
  }));

  const batches = createBatches(
    points,
    QDRANT_BATCH_SIZE
  );

  for (
    let batchIndex = 0;
    batchIndex < batches.length;
    batchIndex += 1
  ) {
    const batch = batches[batchIndex];

    console.log(
      `Storing Qdrant batch ${
        batchIndex + 1
      }/${batches.length}`
    );

    await qdrantClient.upsert(
      QDRANT_COLLECTION,
      {
        wait: true,
        points: batch,
      }
    );
  }

  return points.length;
}

export async function searchDocumentChunks(
  input: SearchDocumentChunksInput
): Promise<RetrievedChunk[]> {
  const {
    queryVector,
    userId,
    documentId,
    limit = 5,
    scoreThreshold = 0.3,
  } = input;

  if (queryVector.length === 0) {
    throw new Error(
      "Query vector cannot be empty"
    );
  }

  const mustFilters: Array<{
    key: string;
    match: {
      value: string;
    };
  }> = [
    {
      key: "userId",
      match: {
        value: userId,
      },
    },
  ];

  if (documentId) {
    mustFilters.push({
      key: "documentId",
      match: {
        value: documentId,
      },
    });
  }

  const results =
    await qdrantClient.search(
      QDRANT_COLLECTION,
      {
        vector: queryVector,
        limit,
        score_threshold:
          scoreThreshold,

        filter: {
          must: mustFilters,
        },

        with_payload: true,
        with_vector: false,
      }
    );

  return results.map((result) => {
    const payload =
      result.payload ?? {};

    return {
      id: result.id,
      score: result.score,

      documentId: String(
        payload.documentId ?? ""
      ),

      originalName: String(
        payload.originalName ?? ""
      ),

      chunkIndex: Number(
        payload.chunkIndex ?? 0
      ),

      text: String(
        payload.text ?? ""
      ),

      startCharacter: Number(
        payload.startCharacter ?? 0
      ),

      endCharacter: Number(
        payload.endCharacter ?? 0
      ),
    };
  });
}