import { generateEmbedding } from "../services/rag/embedding.service";

async function test() {
  const embedding =
    await generateEmbedding(
      "JWT authentication"
    );

  console.log(
    "Embedding length:",
    embedding.length
  );

  console.log(
    embedding.slice(0, 10)
  );
}

test();