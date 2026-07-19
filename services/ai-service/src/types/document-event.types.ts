export interface DocumentProcessingEvent {
  documentId: string;
  userId: string;
  filePath: string;
  originalName: string;
}