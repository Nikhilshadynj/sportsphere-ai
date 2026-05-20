import { Request, Response } from "express";

import client from "../services/openrouter.service";

export const summarizeCommentary =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { commentary } =
        req.body;

      if (
        !commentary ||
        !Array.isArray(
          commentary
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Commentary array is required",
          });
      }

      const commentaryText =
        commentary.join("\n");

      const prompt = `
You are an expert cricket commentator and analyst.

Analyze the following ball-by-ball commentary and generate:

1. Match Summary
2. Key Turning Points
3. Momentum Analysis
4. Best Performers
5. Match Situation
6. Important Moments

COMMENTARY:
${commentaryText}

Important:
- Keep it natural and professional.
- Do not invent fake statistics.
- Use only provided commentary.
`;

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
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message:
          "Commentary summarization failed",
      });
    }
  };