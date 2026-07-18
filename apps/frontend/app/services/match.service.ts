import { apiRequest } from "../lib/api";

import type {
  MatchResponse,
  MatchesResponse,
  SyncMatchesResponse,
} from "../types/match";

export const getMatches =
  async (): Promise<MatchesResponse> => {
    return apiRequest<MatchesResponse>("/matches/matches");
  };

export const getUpcomingMatches =
  async (): Promise<MatchesResponse> => {
    return apiRequest<MatchesResponse>(
      "/matches/upcoming"
    );
  };

export const getMatchById = async (
  id: string
): Promise<MatchResponse> => {
  return apiRequest<MatchResponse>(
    `/matches/matches/${encodeURIComponent(id)}`
  );
};

export const syncLiveMatches =
  async (): Promise<SyncMatchesResponse> => {
    return apiRequest<SyncMatchesResponse>(
      "/matches/live-matches/sync",
      {
        method: "POST",
      }
    );
  };