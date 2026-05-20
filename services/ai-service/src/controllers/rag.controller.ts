import { Request, Response } from "express";
import CodeChunk from "../models/codeChunk.model";
import client from "../services/openrouter.service";
import { generateEmbedding } from "../services/embedding.service";
import { cosineSimilarity } from "../utils/vector";

export const askCodebase = async (
  req: Request,
  res: Response
) => {
  try {
    const { question } = req.body;

    const questionEmbedding =
      await generateEmbedding(question);

    const allChunks = await CodeChunk.find({});

    const rankedChunks = allChunks
      .map((chunk) => {
        const score = cosineSimilarity(
          questionEmbedding as number[],
          chunk.embedding
        );

        return {
          chunk,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const context = rankedChunks
      .map(
        ({ chunk, score }) =>
          `FILE: ${chunk.filePath}
SIMILARITY_SCORE: ${score}

${chunk.content}`
      )
      .join("\n\n---\n\n");

    const prompt = `
You are a senior codebase assistant.

Answer the question using ONLY the provided project context.
If the context is not enough, say that clearly.

PROJECT CONTEXT:
${context}

QUESTION:
${question}
`;

    const completion =
      await client.chat.completions.create({
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const response =
      completion.choices[0].message.content;

    res.json({
      response,
      chunksFound: rankedChunks.length,
      sources: rankedChunks.map(({ chunk, score }) => ({
        filePath: chunk.filePath,
        chunkIndex: chunk.chunkIndex,
        score,
      })),
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "RAG request failed",
    });
  }
};