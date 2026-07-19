import fs from "fs";
import path from "path";
import connectDB from "../config/db";
import CodeChunk from "../models/codeChunk.model";
import dotenv from "dotenv";
import { generateEmbedding } from "../services/rag/embedding.service";

dotenv.config();

const ROOT_DIR = path.resolve(__dirname, "../../../../");

const ALLOWED_EXTENSIONS = [".ts", ".js", ".json", ".md"];

const IGNORED_FOLDERS = [
  "node_modules",
  "dist",
  ".git",
  "data",
];

const CHUNK_SIZE = 1200;

function shouldIgnore(filePath: string) {
  return IGNORED_FOLDERS.some((folder) =>
    filePath.includes(`${path.sep}${folder}${path.sep}`)
  );
}

function isAllowedFile(filePath: string) {
  return ALLOWED_EXTENSIONS.includes(path.extname(filePath));
}

function getAllFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (shouldIgnore(fullPath)) continue;

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (isAllowedFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function chunkText(text: string) {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }

  return chunks;
}

async function main() {
  await connectDB();

  await CodeChunk.deleteMany({});
  console.log("Old code chunks deleted");

  const files = getAllFiles(ROOT_DIR);

  console.log(`Total files found: ${files.length}`);

  let totalChunks = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const chunks = chunkText(content);

    for (let i = 0; i < chunks.length; i++) {
      const embedding: number[] = await generateEmbedding(chunks[i]);

await CodeChunk.create({
  filePath: file.replace(ROOT_DIR, ""),
  content: chunks[i],
  chunkIndex: i,
  embedding,
});

      totalChunks++;
    }

    console.log("==============================");
    console.log("Saved file:", file.replace(ROOT_DIR, ""));
    console.log("Chunks:", chunks.length);
  }

  console.log("==============================");
  console.log(`Total chunks saved: ${totalChunks}`);

  process.exit(0);
}

main();