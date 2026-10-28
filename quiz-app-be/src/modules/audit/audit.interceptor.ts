import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ActivityLogService } from './activity-log.service';
import type { AuditRequest } from './activity-log.service';
import { findAuditRule } from './audit-rules';

/**
 * Global interceptor: after a request on an audited route (see audit-rules.ts)
 * succeeds, write who did it to `activity_logs`. Failed requests are not logged,
 * and the response never waits for (or fails because of) the log write.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly activity: ActivityLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<AuditRequest>();
    const rule = findAuditRule(req.method, req.route?.path);
    if (!rule) return next.handle();

    return next.handle().pipe(
      tap((response) => {
        void this.activity.record(rule, req, response);
      }),
    );
  }
}
