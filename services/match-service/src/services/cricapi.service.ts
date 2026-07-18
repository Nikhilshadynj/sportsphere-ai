import axios, { AxiosError } from "axios";
import Match from "../models/match.model";

interface CricApiMatch {
  id: string;
  name?: string;
  matchType?: string;
  status?: string;
  venue?: string;
  dateTimeGMT?: string;
  teams?: string[];
  score?: Array<{
    inning?: string;
    runs?: number;
    wickets?: number;
    overs?: number;
  }>;
}


const BASE_URL =
  process.env.CRIC_API_BASE_URL || "https://api.cricapi.com/v1";

const CRIC_API_KEY = process.env.CRIC_API_KEY;

interface CricApiErrorResponse {
  status?: string;
  reason?: string;
  message?: string;
}

const cricApiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
});

const validateConfig = (): void => {
  if (!CRIC_API_KEY) {
    throw new Error("CRIC_API_KEY is missing in environment variables");
  }
};

const handleCricApiError = (error: unknown): never => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as
      | CricApiErrorResponse
      | undefined;

    const message =
      responseData?.reason ||
      responseData?.message ||
      error.message ||
      "Failed to fetch data from CricAPI";

    throw new Error(message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("Unknown CricAPI error");
};

export const getLiveMatches = async () => {
  try {
    validateConfig();

    const response = await cricApiClient.get("/currentMatches", {
      params: {
        apikey: CRIC_API_KEY,
        offset: 0,
      },
    });

    if (response.data?.status === "failure") {
      throw new Error(
        response.data?.reason || "CricAPI request failed"
      );
    }

    return response.data;
  } catch (error) {
    return handleCricApiError(error);
  }
};

const normalizeFormat = (
  matchType?: string
): "T20" | "ODI" | "TEST" | "OTHER" => {
  const value = matchType?.toLowerCase();

  if (value?.includes("t20")) return "T20";
  if (value?.includes("odi")) return "ODI";
  if (value?.includes("test")) return "TEST";

  return "OTHER";
};

const normalizeStatus = (
  providerStatus?: string,
  startTime?: Date
): "upcoming" | "live" | "completed" | "cancelled" => {
  const status = providerStatus?.toLowerCase() || "";

  if (
    status.includes("cancel") ||
    status.includes("abandon")
  ) {
    return "cancelled";
  }

  if (
    status.includes("won") ||
    status.includes("draw") ||
    status.includes("completed")
  ) {
    return "completed";
  }

  if (
    status.includes("live") ||
    status.includes("innings") ||
    status.includes("batting")
  ) {
    return "live";
  }

  if (startTime && startTime.getTime() > Date.now()) {
    return "upcoming";
  }

  return "live";
};

const getTeamScore = (
  score: CricApiMatch["score"],
  teamName: string
) => {
  const inning = score?.find((item) =>
    item.inning
      ?.toLowerCase()
      .includes(teamName.toLowerCase())
  );

  return {
    runs: inning?.runs ?? 0,
    wickets: inning?.wickets ?? 0,
    overs: inning?.overs ?? 0,
    inning: inning?.inning ?? "",
  };
};

export const syncCurrentMatches = async () => {
  const response = await getLiveMatches();

  const providerMatches: CricApiMatch[] =
    Array.isArray(response?.data) ? response.data : [];

  const syncedMatches = [];

  for (const providerMatch of providerMatches) {
    if (!providerMatch.id) {
      continue;
    }

    const teams = providerMatch.teams || [];

    const teamA = teams[0] || "Unknown Team";
    const teamB = teams[1] || "Unknown Team";

    const parsedStartTime = providerMatch.dateTimeGMT
      ? new Date(providerMatch.dateTimeGMT)
      : new Date();

    const startTime = Number.isNaN(parsedStartTime.getTime())
      ? new Date()
      : parsedStartTime;

    const match = await Match.findOneAndUpdate(
      {
        externalId: providerMatch.id,
      },
      {
        $set: {
          name:
            providerMatch.name ||
            `${teamA} vs ${teamB}`,
          teamA,
          teamB,
          format: normalizeFormat(
            providerMatch.matchType
          ),
          venue: providerMatch.venue || "",
          startTime,
          status: normalizeStatus(
            providerMatch.status,
            startTime
          ),
          providerStatus:
            providerMatch.status || "",
          score: {
            teamA: getTeamScore(
              providerMatch.score,
              teamA
            ),
            teamB: getTeamScore(
              providerMatch.score,
              teamB
            ),
          },
          lastSyncedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).lean();

    syncedMatches.push(match);
  }

  return syncedMatches;
};