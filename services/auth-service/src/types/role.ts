export const ROLES = ["user", "admin", "ai-agent"] as const;

export type Role = (typeof ROLES)[number];

export const isRole = (value: string): value is Role =>
  ROLES.includes(value as Role);
