import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      default: "New Chat",
    },
    type: {
      type: String,
      enum: ["chat", "agent"],
      default: "chat",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Conversation",
  conversationSchema
);