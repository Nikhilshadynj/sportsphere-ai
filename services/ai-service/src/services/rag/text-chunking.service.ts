import { TextChunk } from "../../types/rag.types";

export interface ChunkTextOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  minimumChunkSize?: number;
}

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_MINIMUM_CHUNK_SIZE = 100;

function findBestSplitPosition(
  text: string,
  start: number,
  idealEnd: number
): number {
  if (idealEnd >= text.length) {
    return text.length;
  }

  const searchStart = Math.max(
    start,
    idealEnd - 300
  );

  const candidateText = text.slice(
    searchStart,
    idealEnd
  );

  const paragraphBreak =
    candidateText.lastIndexOf("\n\n");

  if (paragraphBreak !== -1) {
    return searchStart + paragraphBreak + 2;
  }

  const sentenceEnd = Math.max(
    candidateText.lastIndexOf(". "),
    candidateText.lastIndexOf("? "),
    candidateText.lastIndexOf("! ")
  );

  if (sentenceEnd !== -1) {
    return searchStart + sentenceEnd + 2;
  }

  const lineBreak =
    candidateText.lastIndexOf("\n");

  if (lineBreak !== -1) {
    return searchStart + lineBreak + 1;
  }

  const whitespace =
    candidateText.lastIndexOf(" ");

  if (whitespace !== -1) {
    return searchStart + whitespace + 1;
  }

  return idealEnd;
}

export function chunkText(
  text: string,
  options: ChunkTextOptions = {}
): TextChunk[] {
  const chunkSize =
    options.chunkSize ??
    DEFAULT_CHUNK_SIZE;

  const chunkOverlap =
    options.chunkOverlap ??
    DEFAULT_CHUNK_OVERLAP;

  const minimumChunkSize =
    options.minimumChunkSize ??
    DEFAULT_MINIMUM_CHUNK_SIZE;

  if (!text.trim()) {
    return [];
  }

  if (chunkSize <= 0) {
    throw new Error(
      "Chunk size must be greater than zero"
    );
  }

  if (
    chunkOverlap < 0 ||
    chunkOverlap >= chunkSize
  ) {
    throw new Error(
      "Chunk overlap must be greater than or equal to zero and smaller than chunk size"
    );
  }

  const chunks: TextChunk[] = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const idealEnd = Math.min(
      start + chunkSize,
      text.length
    );

    const end = findBestSplitPosition(
      text,
      start,
      idealEnd
    );

    const chunkContent = text
      .slice(start, end)
      .trim();

    if (
      chunkContent.length >= minimumChunkSize
    ) {
      chunks.push({
        chunkIndex,
        text: chunkContent,
        characterCount:
          chunkContent.length,
        startCharacter: start,
        endCharacter: end,
      });

      chunkIndex += 1;
    }

    if (end >= text.length) {
      break;
    }

    const overlappingStart =
      end - chunkOverlap;

    const adjustedStart =
      adjustStartToWordBoundary(
        text,
        overlappingStart
      );

    start =
      adjustedStart > start
        ? adjustedStart
        : end;
  }

  return chunks;
}

function adjustStartToWordBoundary(
  text: string,
  start: number
): number {
  if (start <= 0) {
    return 0;
  }

  if (/\s/.test(text[start - 1] ?? "")) {
    return start;
  }

  const nextWhitespace =
    text.slice(start).search(/\s/);

  if (nextWhitespace === -1) {
    return start;
  }

  return start + nextWhitespace + 1;
}