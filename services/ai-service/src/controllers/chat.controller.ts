import { Request, Response } from "express";
import Message from "../models/message.model";
import Conversation from "../models/conversation.model";
import cacheService from "../services/cache.service";
import client from "../services/openrouter.service";
import { channel } from "../config/rabbit";

export const chatWithAI = async (
  req: Request,
  res: Response
) => {
  try {
    const { conversationId, message } = req.body;
    const userId = req.headers["x-user-id"] as string;

    // Save user message
    await Message.create({
      conversationId,
      role: "user",
      content: message,
    });

    // Fetch conversation history
    const messages = await Message.find({
      conversationId,
    }).sort({
      createdAt: 1,
    });

    // Convert messages for LLM
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // AI Request
    const completion =
      await client.chat.completions.create({
        model: "openrouter/free",
        messages: formattedMessages as any,
      });

    const aiResponse =
      completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return res.status(500).json({
        message: "AI returned empty response",
      });
    }

    // Save AI response
    await Message.create({
      conversationId,
      role: "assistant",
      content: aiResponse,
    });

    // Invalidate Redis cache immediately after DB write
    // (Fixes Race #2: previously this ran after the RabbitMQ
    // publish, leaving a window where GET /messages served
    // stale cached data)
    await cacheService.del(
      `messages:${conversationId}`
    );

    await cacheService.del(
      `conversations:${userId}`
    );

    // Atomic title check — findOneAndUpdate is atomic in
    // MongoDB: only the first concurrent request matching
    // title === "New Chat" wins, preventing duplicate
    // title-generation events (Fixes Race #1 & #3)
    const conversation =
      await Conversation.findOneAndUpdate(
        {
          _id: conversationId,
          title: "New Chat",
        },
        { $set: { title: "Generating..." } }
      );

    if (conversation) {
      channel.publish(
        "chat",
        "chat.created",
        Buffer.from(
          JSON.stringify({
            conversationId,
            message,
          })
        )
      );

      console.log("Published to RabbitMQ");
    }

    // Update conversation timestamp
    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        updatedAt: new Date(),
      }
    );

    return res.json({
      response: aiResponse,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Chat failed",
    });
  }
};