"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { MatchCard } from "./match-card";

import {
  getMatches,
  syncLiveMatches,
} from "../../services/match.service";

import type { Match } from "../../types/match";

export function MatchesClient() {
  const [matches, setMatches] = useState<
    Match[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSyncing, setIsSyncing] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const loadMatches =
    useCallback(async (): Promise<void> => {
      try {
        setError(null);

        const response =
          await getMatches();

        setMatches(response.data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load matches"
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const handleSync =
    async (): Promise<void> => {
      try {
        setIsSyncing(true);
        setError(null);

        await syncLiveMatches();
        await loadMatches();
      } catch (syncError) {
        setError(
          syncError instanceof Error
            ? syncError.message
            : "Failed to sync matches"
        );
      } finally {
        setIsSyncing(false);
      }
    };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
        Loading matches...
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Cricket Matches
          </h1>

          <p className="mt-1 text-gray-600">
            Explore upcoming, live and completed
            matches.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleSync();
          }}
          disabled={isSyncing}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSyncing
            ? "Syncing..."
            : "Refresh matches"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <h2 className="font-semibold text-gray-900">
            No matches available
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Click “Refresh matches” to sync the
            latest cricket data.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard
              key={match._id}
              match={match}
            />
          ))}
        </div>
      )}
    </section>
  );
}