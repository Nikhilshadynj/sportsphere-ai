import {
  retrieveContext,
} from "../../services/rag/retrieval.service";

import type {
  SearchDocumentArguments,
} from "../agent.types";

interface ExecuteSearchDocumentInput {
  userId: string;
  args: SearchDocumentArguments;
}

export const executeSearchDocument = async ({
  userId,
  args,
}: ExecuteSearchDocumentInput): Promise<unknown> => {
  const query = args.query?.trim();

  if (!query) {
    throw new Error(
      "A non-empty document search query is required"
    );
  }

  const requestedLimit =
    Number(args.limit ?? 5);

  const limit = Math.min(
    Math.max(
      Number.isInteger(requestedLimit)
        ? requestedLimit
        : 5,
      1
    ),
    10
  );

  const documentId =
    typeof args.documentId === "string" &&
    args.documentId.trim()
      ? args.documentId.trim()
      : undefined;

  const chunks = await retrieveContext({
    query,
    userId,
    documentId,
    limit,
  });

  return {
    query,
    documentId:
      documentId ?? null,

    resultCount:
      chunks.length,

    matches: chunks.map((chunk) => ({
      documentId:
        chunk.documentId,

      documentName:
        chunk.originalName,

      chunkIndex:
        chunk.chunkIndex,

      similarityScore:
        Number(
          chunk.score.toFixed(4)
        ),

      text:
        chunk.text,
    })),
  };
};