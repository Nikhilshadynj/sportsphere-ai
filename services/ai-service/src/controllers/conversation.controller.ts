import { Request, Response } from "express";
import Conversation from "../models/conversation.model";
import Message from "../models/message.model";
import cacheService from "../services/cache.service";

export const createConversation = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, title } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const conversation =
      await Conversation.create({
        userId,
        title,
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

export const getConversations = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const conversations =
      await Conversation.find({
        userId,
      }).sort({
        createdAt: -1,
      });

    res.json(conversations);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to fetch conversations",
    });
  }
};

export const getMessages = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const messages = await Message.find({
      conversationId: id,
    }).sort({
      createdAt: 1,
    });

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
    const cacheKey = `conversations:nikhil123`;
    const cached = await cacheService.get(cacheKey);

if (cached) {
  console.log("✅ Redis HIT");

  return res.json({
    success: true,
    conversations: cached,
  });
}
    const conversations = await Conversation.find()
      .select("_id title updatedAt createdAt")
      .sort({ updatedAt: -1 });
    await cacheService.set(cacheKey, conversations);
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