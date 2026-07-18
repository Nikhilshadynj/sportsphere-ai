import { MatchesClient } from "../components/matches/matches-client";

export default function MatchesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <MatchesClient />
      </div>
    </main>
  );
}