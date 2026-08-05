import { Request, Response } from "express";
import Conversation from "../models/conversation.model";
import Message from "../models/message.model";
import cacheService from "../services/cache.service";

export const createConversation = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { title, type = "chat" } = req.body as {
      title?: string;
      type?: "chat" | "agent";
    };

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!["chat", "agent"].includes(type)) {
      return res.status(400).json({
        message: "Invalid conversation type",
      });
    }

    const conversation =
      await Conversation.create({
        userId,
        title: title?.trim() || "New Chat",
        type,
      });
    await cacheService.del(`conversations:${userId}`);
    res.status(201).json(conversation);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message:
        "Conversation creation failed",
    });
  }
};

export const getMessages = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId =
      req.headers["x-user-id"] as string;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const conversation =
      await Conversation.findOne({
        _id: id,
        userId,
      });

    if (!conversation) {
      return res.status(404).json({
        message:
          "Conversation not found",
      });
    }
    const cacheKey = `messages:${id}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log("✅ Messages Redis HIT");

      return res.json(cached);
    }
    const messages = await Message.find({
      conversationId: id,
    }).sort({
      createdAt: 1,
    });

    await cacheService.set(cacheKey, messages);

    res.json(messages);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message:
        "Failed to fetch messages",
    });
  }
};

export const getAllConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id']!;
    const cacheKey = `conversations:${userId}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      console.log("✅ Redis HIT");

      return res.json({
        success: true,
        conversations: cached,
      });
    }
    const conversations = await Conversation.find({
      userId,
    })
      .select("_id title type updatedAt createdAt")
      .sort({ updatedAt: -1 });
    const normalizedConversations =
      conversations.map((conversation) => ({
        ...conversation.toObject(),
        type: conversation.type || "chat",
      }));
    await cacheService.set(cacheKey, normalizedConversations);

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error,
    });
  }
};