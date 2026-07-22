const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL =
  configuredApiUrl && configuredApiUrl.length > 0
    ? configuredApiUrl.replace(/\/$/, "")
    : "/api";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || undefined;
