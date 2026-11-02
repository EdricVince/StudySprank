import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AiGenerationService } from './ai-generation.service';
import { findAiLogRule } from './ai-log-rules';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';

interface AiLogRequest {
  method: string;
  route?: { path?: unknown };
  body?: unknown;
  query?: unknown;
  user?: CurrentUserData;
}

/**
 * Global interceptor: after an AI route (see ai-log-rules.ts) succeeds, store the request and the
 * AI's answer in `ai_generations`. Failed requests are not stored, and the response never waits
 * for (or fails because of) the write.
 */
@Injectable()
export class AiLogInterceptor implements NestInterceptor {
  /** The word of the day is served from a cache all day; only a newly picked word is new data. */
  private lastWordOfTheDay: string | null = null;

  constructor(private readonly generations: AiGenerationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<AiLogRequest>();
    const rule = findAiLogRule(req.method, req.route?.path);
    if (!rule) return next.handle();

    return next.handle().pipe(
      tap((response) => {
        const data: unknown =
          response && typeof response === 'object' && 'data' in response
            ? (response as { data: unknown }).data
            : response;
        if (rule.kind === 'word_of_the_day') {
          const word = JSON.stringify(data);
          if (word === this.lastWordOfTheDay) return;
          this.lastWordOfTheDay = word;
        }
        void this.generations.record({
          kind: rule.kind,
          userId: req.user?.id ?? null,
          userRole: req.user?.role_id ?? null,
          input: req.method === 'GET' ? req.query : req.body,
          output: data,
        });
      }),
    );
  }
}
