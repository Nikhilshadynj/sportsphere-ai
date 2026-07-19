"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

import {
  uploadDocument,
} from "../../services/document.service";

import {
  RagDocument,
} from "../../types/document";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

function formatFileSize(
  bytes: number
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default function DocumentUpload() {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [uploadedDocument, setUploadedDocument] =
    useState<RagDocument | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ): void {
    setError("");
    setSuccessMessage("");
    setUploadedDocument(null);

    const file =
      event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const isPdf =
      file.type === "application/pdf" &&
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setSelectedFile(null);
      setError(
        "Please select a valid PDF file"
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError(
        "PDF size cannot exceed 10 MB"
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (!selectedFile) {
      setError(
        "Please select a PDF document"
      );

      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const result =
        await uploadDocument(
          selectedFile
        );

      setUploadedDocument(
        result.document
      );

      setSuccessMessage(
        result.message
      );

      setSelectedFile(null);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Document upload failed";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full justify-center p-6 md:p-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">
            Document RAG
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Upload sports reports, analysis
            documents or tournament rules and
            ask questions from their content.
          </p>
        </div>

        <form
          onSubmit={handleUpload}
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <label
            htmlFor="document"
            className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-950 p-6 text-center hover:border-zinc-500"
          >
            <span className="text-base font-medium text-white">
              Select a PDF document
            </span>

            <span className="mt-2 text-sm text-zinc-500">
              Maximum file size: 10 MB
            </span>

            <input
              id="document"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
            />
          </label>

          {selectedFile && (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="truncate text-sm font-medium text-white">
                {selectedFile.name}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {formatFileSize(
                  selectedFile.size
                )}
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="mt-4 rounded-lg border border-green-900 bg-green-950/40 p-3 text-sm text-green-300">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={
              !selectedFile ||
              loading
            }
            className="mt-5 w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Uploading..."
              : "Upload Document"}
          </button>
        </form>

        {uploadedDocument && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="font-medium text-white">
              Uploaded document
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <p className="text-zinc-400">
                Name:{" "}
                <span className="text-white">
                  {
                    uploadedDocument.originalName
                  }
                </span>
              </p>

              <p className="text-zinc-400">
                Size:{" "}
                <span className="text-white">
                  {formatFileSize(
                    uploadedDocument.fileSize
                  )}
                </span>
              </p>

              <p className="text-zinc-400">
                Status:{" "}
                <span className="capitalize text-yellow-300">
                  {
                    uploadedDocument.status
                  }
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}