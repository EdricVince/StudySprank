const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

/**
 * Parse a duration like "15m", "7d", "12h", "30s" or a bare number of seconds.
 * Returns `fallbackSeconds` for anything missing or malformed.
 */
export function parseDurationSeconds(
  value: string | undefined | null,
  fallbackSeconds: number,
): number {
  if (!value) return fallbackSeconds;
  const m = /^\s*(\d+)\s*([smhd]?)\s*$/i.exec(value);
  if (!m) return fallbackSeconds;
  const n = Number(m[1]) * UNIT_SECONDS[(m[2] || 's').toLowerCase()];
  return n > 0 ? n : fallbackSeconds;
}

export const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60; // 15m
export const DEFAULT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7d
