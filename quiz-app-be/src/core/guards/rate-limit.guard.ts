import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';

/** Default for every HTTP route without its own @RateLimit. */
export const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  limit: 120,
  windowMs: 60_000,
  limitEnv: 'THROTTLE_DEFAULT_LIMIT',
};

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-memory, per-IP rate limiter (single-instance deployment —
 * same scope as @nestjs/throttler's default in-memory storage).
 * Registered globally (APP_GUARD); WebSocket handlers are skipped.
 * Exceeding the limit → 429 Too Many Requests with a Retry-After header.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, Bucket>();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext, now: number = Date.now()): boolean {
    if (context.getType() !== 'http') return true;

    const opts =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_RATE_LIMIT;
    const envLimit = opts.limitEnv ? Number(process.env[opts.limitEnv]) : NaN;
    const limit =
      Number.isFinite(envLimit) && envLimit > 0 ? envLimit : opts.limit;

    const req = context
      .switchToHttp()
      .getRequest<{ ip?: string; socket?: { remoteAddress?: string } }>();
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const key = `${context.getClass().name}.${context.getHandler().name}|${ip}`;

    if (this.buckets.size > 10_000) this.sweep(now);
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;

    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      context
        .switchToHttp()
        .getResponse<{ setHeader?: (name: string, value: string) => void }>()
        ?.setHeader?.('Retry-After', String(retryAfter));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests — please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private sweep(now: number) {
    for (const [k, b] of this.buckets)
      if (b.resetAt <= now) this.buckets.delete(k);
  }
}
