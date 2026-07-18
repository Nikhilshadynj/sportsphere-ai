import type { MatchStatus } from "../../types/match";

interface MatchStatusProps {
  status: MatchStatus;
}

const statusClasses: Record<
  MatchStatus,
  string
> = {
  upcoming:
    "bg-blue-100 text-blue-700 border-blue-200",

  live:
    "bg-red-100 text-red-700 border-red-200",

  completed:
    "bg-green-100 text-green-700 border-green-200",

  cancelled:
    "bg-gray-100 text-gray-700 border-gray-200",
};

export function MatchStatus({
  status,
}: MatchStatusProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}