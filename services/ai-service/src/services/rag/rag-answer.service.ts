import client from "../../services/openrouter.service";

import {
  RagAnswerResult,
  RetrievedChunk,
} from "../../types/rag.types";

interface GenerateRagAnswerInput {
  query: string;
  chunks: RetrievedChunk[];
}

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";

function buildContext(
  chunks: RetrievedChunk[]
): string {
  return chunks
    .map((chunk, index) => {
      return [
        `[Source ${index + 1}]`,
        `Document: ${chunk.originalName}`,
        `Chunk: ${chunk.chunkIndex}`,
        `Similarity score: ${chunk.score.toFixed(4)}`,
        "",
        chunk.text,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function generateRagAnswer(
  input: GenerateRagAnswerInput
): Promise<RagAnswerResult> {
  const query = input.query.trim();

  if (!query) {
    throw new Error("Query is required");
  }

  if (!OPENROUTER_MODEL) {
    throw new Error(
      "OPENROUTER_MODEL is not configured"
    );
  }

  if (input.chunks.length === 0) {
    return {
      answer:
        "I could not find this information in the uploaded documents.",
      sources: [],
    };
  }

  const context = buildContext(
    input.chunks
  );

  const completion =
    await client.chat.completions.create({
      model: OPENROUTER_MODEL,

      temperature: 0.1,

      messages: [
        {
          role: "system",
          content: [
            "You are a document question-answering assistant.",
            "Answer only from the provided document context.",
            "Do not use outside knowledge.",
            "Do not invent or assume missing facts.",
            "If the answer is not clearly available in the context, say:",
            '"I could not find this information in the uploaded documents."',
            "Keep the answer direct and concise.",
            "When useful, mention the source number in square brackets, such as [Source 1].",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "DOCUMENT CONTEXT:",
            context,
            "",
            "USER QUESTION:",
            query,
          ].join("\n"),
        },
      ],
    });

  const answer =
    completion.choices[0]?.message
      ?.content?.trim();

  if (!answer) {
    throw new Error(
      "OpenRouter returned an empty RAG answer"
    );
  }

  return {
    answer,

    sources: input.chunks.map(
      (chunk) => ({
        documentId:
          chunk.documentId,

        originalName:
          chunk.originalName,

        chunkIndex:
          chunk.chunkIndex,

        score:
          chunk.score,

        textPreview:
          chunk.text.slice(0, 200),
      })
    ),
  };
}