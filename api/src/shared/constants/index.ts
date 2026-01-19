export const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30000;
export const SHUTDOWN_POLL_INTERVAL_MS = 1000;
export const DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 minutes
export const DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const BCRYPT_COST = 10;

export const TIME_MULTIPLIERS_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
} as const;

export const TIME_MULTIPLIERS_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const;
