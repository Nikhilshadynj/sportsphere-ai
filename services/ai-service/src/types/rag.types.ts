export interface TextChunk {
  chunkIndex: number;
  text: string;
  characterCount: number;
  startCharacter: number;
  endCharacter: number;
}

export interface EmbeddedChunk extends TextChunk {
  embedding: number[];
}

export interface DocumentChunkPayload {
  documentId: string;
  userId: string;
  originalName: string;

  chunkIndex: number;
  text: string;
  characterCount: number;
  startCharacter: number;
  endCharacter: number;

  embeddingModel: string;
}

export interface RetrievedChunk {
  id: string | number;
  score: number;

  documentId: string;
  originalName: string;

  chunkIndex: number;
  text: string;

  startCharacter: number;
  endCharacter: number;
}

export interface RagSource {
  documentId: string;
  originalName: string;
  chunkIndex: number;
  score: number;
  textPreview: string;
}

export interface RagAnswerResult {
  answer: string;
  sources: RagSource[];
}