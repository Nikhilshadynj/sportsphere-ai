import { Request, Response } from "express";
import Conversation from "../models/conversation.model";
import Message from "../models/message.model";

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