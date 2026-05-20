import { Request, Response } from "express";

import Message from "../models/message.model";

import client from "../services/openrouter.service";

export const chatWithAI = async (
  req: Request,
  res: Response
) => {
  try {
    const { conversationId, message } =
      req.body;

    // save user message
    await Message.create({
      conversationId,
      role: "user",
      content: message,
    });

    // fetch previous messages
    const messages = await Message.find({
      conversationId,
    }).sort({
      createdAt: 1,
    });

    // convert for AI provider
    const formattedMessages = messages.map(
      (msg) => ({
        role: msg.role,
        content: msg.content,
      })
    );

    // AI request
    const completion =
      await client.chat.completions.create({
        model:
          "openrouter/free",

        messages: formattedMessages as any,
      });

      const aiResponse = completion.choices[0]?.message?.content;

if (!aiResponse) {
  return res.status(500).json({
    message: "AI returned empty response",
  });
}

    // save AI response
    await Message.create({
      conversationId,
      role: "assistant",
      content: aiResponse,
    });

    res.json({
      response: aiResponse,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Chat failed",
    });
  }
};