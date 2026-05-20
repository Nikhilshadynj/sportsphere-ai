import express from "express";
import { createConversation,getConversations,
  getMessages } from "../controllers/conversation.controller";

const router = express.Router();

router.post(
  "/conversation",
  createConversation
);

router.get(
  "/conversations",
  getConversations
);

router.get(
  "/conversations/:id/messages",
  getMessages
);

export default router;