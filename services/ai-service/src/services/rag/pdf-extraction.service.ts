import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export interface ExtractedPdf {
  text: string;
  pageCount: number;
  characterCount: number;
}

function cleanExtractedText(text: string): string {
  return text
    // Windows line endings normalize
    .replace(/\r\n/g, "\n")

    // Spaces and tabs normalize
    .replace(/[ \t]+/g, " ")

    // Line ke start/end ke extra spaces remove
    .replace(/^[ \t]+|[ \t]+$/gm, "")

    // 3+ blank lines ko maximum 2 banao
    .replace(/\n{3,}/g, "\n\n")

    .trim();
}

export async function extractTextFromPdf(
  filePath: string
): Promise<ExtractedPdf> {
  const fileBuffer = await fs.readFile(filePath);

  const parser = new PDFParse({
    data: fileBuffer,
  });

  try {
    const result = await parser.getText();

    const cleanedText =
      cleanExtractedText(result.text);

    if (!cleanedText) {
      throw new Error(
        "No readable text found in the PDF"
      );
    }

    return {
      text: cleanedText,
      pageCount: result.total,
      characterCount:
        cleanedText.length,
    };
  } finally {
    await parser.destroy();
  }
}