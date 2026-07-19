"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  queryDocument,
} from "../../services/document.service";

import {
  DocumentSource,
} from "../../types/document";

interface DocumentChatProps {
  documentId?: string;
}

export default function DocumentChat({
  documentId,
}: DocumentChatProps) {
  const [query, setQuery] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [sources, setSources] =
    useState<DocumentSource[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedQuery =
      query.trim();

    if (!normalizedQuery) {
      setError(
        "Please enter a question."
      );

      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setAnswer("");
      setSources([]);

      const response =
        await queryDocument({
          query: normalizedQuery,
          documentId,
          limit: 5,
        });

      setAnswer(response.answer);
      setSources(response.sources);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="w-full max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          Ask your document
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Ask questions based on your
          uploaded PDF content.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3"
      >
        <textarea
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value
            )
          }
          placeholder="Ask a question about your document..."
          rows={4}
          disabled={isLoading}
          className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={
            isLoading ||
            !query.trim()
          }
          className="rounded-lg bg-black px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? "Searching..."
            : "Ask question"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {answer && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-2 font-semibold">
              Answer
            </h3>

            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {answer}
            </p>
          </div>

          {sources.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">
                Sources
              </h3>

              {sources.map(
                (source, index) => (
                  <article
                    key={`${source.documentId}-${source.chunkIndex}-${index}`}
                    className="rounded-lg border bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {
                          source.originalName
                        }
                      </p>

                      <span className="text-xs text-gray-500">
                        Match:{" "}
                        {(
                          source.score *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Chunk{" "}
                      {
                        source.chunkIndex
                      }
                    </p>

                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {
                        source.textPreview
                      }
                      ...
                    </p>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}