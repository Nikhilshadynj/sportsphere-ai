import {
  Document,
  Schema,
  model,
} from "mongoose";

export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export interface IDocument extends Document {
  userId: string;
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage?: string;
  pageCount: number;
  characterCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    storedName: {
      type: String,
      required: true,
      unique: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "uploaded",
        "processing",
        "completed",
        "failed",
      ],
      default: "uploaded",
      index: true,
    },

    chunkCount: {
      type: Number,
      default: 0,
    },

    errorMessage: {
      type: String,
    },

    pageCount: {
      type: Number,
      default: 0,
    },

    characterCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({
  userId: 1,
  createdAt: -1,
});

export const DocumentModel =
  model<IDocument>(
    "Document",
    documentSchema
  );