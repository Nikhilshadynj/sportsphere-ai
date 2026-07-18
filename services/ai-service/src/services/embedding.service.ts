import {
  EMBEDDING_DIMENSION,
  QDRANT_COLLECTION,
  qdrantClient,
} from "../config/qdrant";

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