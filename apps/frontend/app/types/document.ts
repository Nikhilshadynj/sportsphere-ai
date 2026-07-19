export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export interface RagDocument {
  id: string;
  originalName: string;
  fileSize: number;
  status: DocumentStatus;
  createdAt: string;
}

export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  document: RagDocument;
}

export interface DocumentSource {
  documentId: string;
  originalName: string;
  chunkIndex: number;
  score: number;
  textPreview: string;
}

export interface DocumentQueryResponse {
  success: boolean;
  query: string;
  answer: string;
  sources: DocumentSource[];
}

export interface DocumentQueryRequest {
  query: string;
  documentId?: string;
  limit?: number;
}