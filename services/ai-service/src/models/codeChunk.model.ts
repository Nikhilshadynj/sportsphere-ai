import mongoose, { Schema } from "mongoose";

const codeChunkSchema = new Schema(
  {
    filePath: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
    },

    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "CodeChunk",
  codeChunkSchema
);