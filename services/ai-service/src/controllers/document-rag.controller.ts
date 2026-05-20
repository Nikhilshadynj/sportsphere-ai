import { Request, Response } from "express";

import DocumentChunk from "../models/documentChunk.model";

import client from "../services/openrouter.service";

import { generateEmbedding } from "../services/embedding.service";

import { cosineSimilarity } from "../utils/vector";

export const askDocument =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { question } =
        req.body;

      // question embedding
      const questionEmbedding =
        await generateEmbedding(
          question
        );

      // all chunks
      const chunks =
        await DocumentChunk.find(
          {}
        );

      // rank chunks
      const rankedChunks =
        chunks
          .map((chunk) => {
            const score =
              cosineSimilarity(
                questionEmbedding,
                chunk.embedding
              );

            return {
              chunk,
              score,
            };
          })
          .sort(
            (a, b) =>
              b.score -
              a.score
          )
          .slice(0, 5);

      // build context
      const context =
        rankedChunks
          .map(
            ({
              chunk,
              score,
            }) =>
              `
SCORE: ${score}

${chunk.content}
`
          )
          .join("\n\n---\n\n");

      // final prompt
      const prompt = `
You are a document assistant.

Answer ONLY using the provided document context.

DOCUMENT CONTEXT:
${context}

QUESTION:
${question}
`;

      // AI request
      const completion =
        await client.chat.completions.create(
          {
            model:
              "openrouter/free",

            messages: [
              {
                role: "user",
                content:
                  prompt,
              },
            ],
          }
        );

      const response =
        completion.choices[0]
          .message.content;

      res.json({
        response,

        chunksFound:
          rankedChunks.length,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message:
          "Document RAG failed",
      });
    }
  };