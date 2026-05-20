import { Request, Response } from "express";
import client from "../services/openrouter.service";

export const analyzeMatch = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      teamA,
      teamB,
      pitch,
      weather,
      format,
      venue,
      keyPlayers,
    } = req.body;

    if (!teamA || !teamB || !format) {
      return res.status(400).json({
        message: "teamA, teamB and format are required",
      });
    }

    const prompt = `
You are an expert cricket analyst.

Analyze the following match details and give a practical, structured match preview.

Match Details:
- Team A: ${teamA}
- Team B: ${teamB}
- Format: ${format}
- Venue: ${venue || "Not provided"}
- Pitch: ${pitch || "Not provided"}
- Weather: ${weather || "Not provided"}
- Key Players: ${
      Array.isArray(keyPlayers)
        ? keyPlayers.join(", ")
        : "Not provided"
    }

Return response in this structure:

1. Match Overview
2. Pitch & Weather Impact
3. Team A Strengths
4. Team B Strengths
5. Key Players to Watch
6. Possible Match Strategy
7. Fantasy Picks
8. Prediction with Confidence Level

Important:
- Do not hallucinate recent stats.
- If data is not provided, clearly say it is based only on provided inputs.
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

    if (!response) {
      return res.status(500).json({
        message: "AI returned empty response",
      });
    }

    res.json({
      response,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Match analysis failed",
    });
  }
};