import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchStatus } from "../../components/matches/match-status";
import { getMatchById } from "../../services/match.service";

interface MatchDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function MatchDetailsPage({
  params,
}: MatchDetailsPageProps) {
  const { id } = await params;

  let response;

  try {
    response = await getMatchById(id);
  } catch {
    notFound();
  }

  const match = response.data;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link
          href="/matches"
          className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to matches
        </Link>

        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {match.format}
              </p>

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {match.name}
              </h1>
            </div>

            <MatchStatus
              status={match.status}
            />
          </div>

          <div className="my-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-500">
                Team A
              </p>

              <h2 className="mt-2 text-xl font-bold text-gray-900">
                {match.teamA}
              </h2>

              <p className="mt-4 text-lg font-semibold text-gray-700">
                {match.score?.teamA
                  ? `${match.score.teamA.runs}/${match.score.teamA.wickets} (${match.score.teamA.overs} ov)`
                  : "Yet to bat"}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-500">
                Team B
              </p>

              <h2 className="mt-2 text-xl font-bold text-gray-900">
                {match.teamB}
              </h2>

              <p className="mt-4 text-lg font-semibold text-gray-700">
                {match.score?.teamB
                  ? `${match.score.teamB.runs}/${match.score.teamB.wickets} (${match.score.teamB.overs} ov)`
                  : "Yet to bat"}
              </p>
            </div>
          </div>

          <dl className="grid gap-5 border-t border-gray-200 pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Start time
              </dt>

              <dd className="mt-1 text-gray-900">
                {formatDate(match.startTime)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Venue
              </dt>

              <dd className="mt-1 text-gray-900">
                {match.venue ||
                  "Venue not available"}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Provider status
              </dt>

              <dd className="mt-1 text-gray-900">
                {match.providerStatus ||
                  match.status}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Last synced
              </dt>

              <dd className="mt-1 text-gray-900">
                {match.lastSyncedAt
                  ? formatDate(
                      match.lastSyncedAt
                    )
                  : "Not available"}
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </main>
  );
}