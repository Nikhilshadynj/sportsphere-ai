import express from "express";
import { createConversation,getConversations,
  getMessages, getAllConversations } from "../controllers/conversation.controller";

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
  "/conversation/:id/messages",
  getMessages
);

router.get("/list", getAllConversations);

export default router;