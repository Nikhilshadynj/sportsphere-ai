import {
  retrieveContext,
} from "./retrieval.service";

import {
  generateRagAnswer,
} from "./rag-answer.service";

import {
  RagAnswerResult,
} from "../../types/rag.types";

interface AskDocumentsInput {
  query: string;
  userId: string;
  documentId?: string;
  limit?: number;
}

export async function askDocuments(
  input: AskDocumentsInput
): Promise<RagAnswerResult> {
  const chunks =
    await retrieveContext({
      query: input.query,
      userId: input.userId,
      documentId:
        input.documentId,
      limit: input.limit ?? 5,
    });

  console.log({
    message:
      "Relevant document context retrieved",
    query:
      input.query,
    chunkCount:
      chunks.length,
    scores:
      chunks.map((chunk) =>
        Number(chunk.score.toFixed(4))
      ),
  });

  return generateRagAnswer({
    query: input.query,
    chunks,
  });
}