import { QdrantClient } from "@qdrant/js-client-rest";

const qdrantUrl = process.env.QDRANT_URL;

if (!qdrantUrl) {
  throw new Error(
    "QDRANT_URL is missing from environment variables"
  );
}

export const qdrantClient = new QdrantClient({
  url: qdrantUrl,
});

export const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ||
  "sportsphere_documents";

export const EMBEDDING_DIMENSION = Number(
  process.env.EMBEDDING_DIMENSION || 1536
);