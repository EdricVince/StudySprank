import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  /** Max requests per window per client IP. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Optional env var that overrides `limit` (e.g. relaxed limits in the e2e CI job). */
  limitEnv?: string;
}

/** Stricter per-route limit on top of the global default (see RateLimitGuard). */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
