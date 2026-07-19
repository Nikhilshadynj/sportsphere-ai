import {
  EMBEDDING_DIMENSION,
  QDRANT_COLLECTION,
  qdrantClient,
} from "../../config/qdrant";
import {
  EmbeddedChunk,
  TextChunk,
} from "../../types/rag.types";

interface OllamaEmbeddingResponse {
  model: string;
  embeddings: number[][];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
}

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ??
  "http://localhost:11434";

const OLLAMA_EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL ??
  "nomic-embed-text";

const EMBEDDING_BATCH_SIZE = Number(
  process.env.EMBEDDING_BATCH_SIZE ?? 10
);

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
      items.slice(index, index + batchSize)
    );
  }

  return batches;
}

async function generateEmbeddingBatch(
  texts: string[]
): Promise<number[][]> {
  const response = await fetch(
    `${OLLAMA_BASE_URL}/api/embed`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: OLLAMA_EMBEDDING_MODEL,
        input: texts,
        truncate: true,
      }),
    }
  );

  if (!response.ok) {
    const errorBody =
      await response.text();

    throw new Error(
      `Ollama embedding request failed with status ${response.status}: ${errorBody}`
    );
  }

  const result =
    (await response.json()) as OllamaEmbeddingResponse;

  if (!Array.isArray(result.embeddings)) {
    throw new Error(
      "Ollama response does not contain embeddings"
    );
  }

  return result.embeddings;
}

export async function generateChunkEmbeddings(
  chunks: TextChunk[]
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  if (
    !Number.isInteger(EMBEDDING_BATCH_SIZE) ||
    EMBEDDING_BATCH_SIZE <= 0
  ) {
    throw new Error(
      "EMBEDDING_BATCH_SIZE must be a positive integer"
    );
  }

  const batches = createBatches(
    chunks,
    EMBEDDING_BATCH_SIZE
  );

  const embeddedChunks: EmbeddedChunk[] = [];

  let expectedDimension: number | undefined;

  for (
    let batchIndex = 0;
    batchIndex < batches.length;
    batchIndex += 1
  ) {
    const batch = batches[batchIndex];

    console.log(
      `Generating Ollama embedding batch ${
        batchIndex + 1
      }/${batches.length}`
    );

    const embeddings =
      await generateEmbeddingBatch(
        batch.map((chunk) => chunk.text)
      );

    if (embeddings.length !== batch.length) {
      throw new Error(
        `Embedding count mismatch. Expected ${batch.length}, received ${embeddings.length}`
      );
    }

    embeddings.forEach(
      (embedding, index) => {
        const chunk = batch[index];

        if (
          !Array.isArray(embedding) ||
          embedding.length === 0
        ) {
          throw new Error(
            `Invalid embedding for chunk ${chunk.chunkIndex}`
          );
        }

        if (!expectedDimension) {
          expectedDimension =
            embedding.length;
        }

        if (
          embedding.length !==
          expectedDimension
        ) {
          throw new Error(
            `Embedding dimension mismatch for chunk ${chunk.chunkIndex}`
          );
        }

        embeddedChunks.push({
          ...chunk,
          embedding,
        });
      }
    );
  }

  return embeddedChunks;
}

export async function initializeVectorStore(): Promise<void> {
  const collections =
    await qdrantClient.getCollections();

  const collectionExists =
    collections.collections.some(
      (collection) =>
        collection.name === QDRANT_COLLECTION
    );

  if (collectionExists) {
    console.log(
      `Qdrant collection already exists: ${QDRANT_COLLECTION}`
    );

    return;
  }

  await qdrantClient.createCollection(
    QDRANT_COLLECTION,
    {
      vectors: {
        size: EMBEDDING_DIMENSION,
        distance: "Cosine",
      },
    }
  );

  console.log(
    `Qdrant collection created: ${QDRANT_COLLECTION}`
  );
}

export async function generateQueryEmbedding(
  query: string
): Promise<number[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error(
      "Query cannot be empty"
    );
  }

  const embeddings =
    await generateEmbeddingBatch([
      normalizedQuery,
    ]);

  const embedding = embeddings[0];

  if (
    !embedding ||
    embedding.length === 0
  ) {
    throw new Error(
      "Query embedding could not be generated"
    );
  }

  return embedding;
}