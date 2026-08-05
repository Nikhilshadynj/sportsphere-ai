import type {
  GetLiveMatchesArguments,
} from "../agent.types";

interface LiveMatchToolResponse {
  success?: boolean;
  data?: unknown;
  message?: string;
}

const MATCH_SERVICE_URL =
  process.env.MATCH_SERVICE_URL?.replace(/\/$/, "") ||
  "http://localhost:5003";

export const executeGetLiveMatches = async (
  args: GetLiveMatchesArguments
): Promise<unknown> => {
  const limit = Math.min(
    Math.max(args.limit ?? 5, 1),
    10
  );

  const response = await fetch(
    `${MATCH_SERVICE_URL}/live-matches`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    }
  );

  const body =
    (await response.json()) as LiveMatchToolResponse;

  if (!response.ok) {
    throw new Error(
      body.message ||
        `Match Service returned HTTP ${response.status}`
    );
  }

  /*
   * Match controller currently wraps the CricAPI response:
   *
   * {
   *   success: true,
   *   data: {
   *     status: "success",
   *     data: [...]
   *   }
   * }
   */
  const providerResponse = body.data as
    | {
        data?: unknown[];
      }
    | undefined;

  const matches = Array.isArray(providerResponse?.data)
    ? providerResponse.data
    : [];

  return {
    totalAvailable: matches.length,
    returnedCount: Math.min(matches.length, limit),
    matches: matches.slice(0, limit),
  };
};