export type MatchFormat =
  | "T20"
  | "ODI"
  | "TEST"
  | "OTHER";

export type MatchStatus =
  | "upcoming"
  | "live"
  | "completed"
  | "cancelled";

export interface TeamScore {
  runs: number;
  wickets: number;
  overs: number;
  inning?: string;
}

export interface Match {
  _id: string;
  externalId: string;
  name: string;

  teamA: string;
  teamB: string;

  format: MatchFormat;
  venue: string;

  startTime: string;
  status: MatchStatus;
  providerStatus?: string;

  score?: {
    teamA?: TeamScore;
    teamB?: TeamScore;
  };

  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchesResponse {
  success: boolean;
  count: number;
  data: Match[];
}

export interface MatchResponse {
  success: boolean;
  data: Match;
}

export interface SyncMatchesResponse {
  success: boolean;
  message: string;
  count: number;
  data: Match[];
}