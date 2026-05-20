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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Conversation",
  conversationSchema
);