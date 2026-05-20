import { Request, Response } from "express";
import client from "../services/openrouter.service";

export const askAI = async (
  req: Request,
  res: Response
) => {
  try {
    const { prompt } = req.body;

    const completion =
      await client.chat.completions.create({
        model:
          "openrouter/free",

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    res.json({
      response:
        completion.choices[0].message.content,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "AI request failed",
    });
  }
};