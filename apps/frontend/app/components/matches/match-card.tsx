import Link from "next/link";

import { MatchStatus } from "./match-status";

import type { Match } from "../../types/match";

interface MatchCardProps {
  match: Match;
}

function formatMatchDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatScore(
  score:
    | {
        runs?: number;
        wickets?: number;
        overs?: number;
      }
    | undefined
): string {
  if (!score) {
    return "Yet to bat";
  }

  const runs = score.runs ?? 0;
  const wickets = score.wickets ?? 0;
  const overs = score.overs ?? 0;

  if (
    runs === 0 &&
    wickets === 0 &&
    overs === 0
  ) {
    return "Yet to bat";
  }

  return `${runs}/${wickets} (${overs} ov)`;
}

export function MatchCard({
  match,
}: MatchCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {match.format}
          </p>

          <h2 className="mt-1 text-lg font-bold text-gray-900">
            {match.name}
          </h2>
        </div>

        <MatchStatus status={match.status} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
          <div>
            <p className="font-semibold text-gray-900">
              {match.teamA}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {formatScore(
                match.score?.teamA
              )}
            </p>
          </div>

          <span className="text-xs font-semibold text-gray-400">
            VS
          </span>

          <div className="text-right">
            <p className="font-semibold text-gray-900">
              {match.teamB}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {formatScore(
                match.score?.teamB
              )}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-800">
              Date:
            </span>{" "}
            {formatMatchDate(match.startTime)}
          </p>

          <p>
            <span className="font-medium text-gray-800">
              Venue:
            </span>{" "}
            {match.venue || "Venue not available"}
          </p>

          {match.providerStatus && (
            <p>
              <span className="font-medium text-gray-800">
                Update:
              </span>{" "}
              {match.providerStatus}
            </p>
          )}
        </div>

        <Link
          href={`/matches/${match._id}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          View match
        </Link>
      </div>
    </article>
  );
}