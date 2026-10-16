import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { CurrentUserData } from '../decorators/current-user.decorator';

/**
 * Enforces @Roles(...) on top of JwtGuard.
 * - Handlers/controllers with no @Roles → allowed for any authenticated user.
 * - Handlers with @Roles(...) → require request.user.role_id to be in the list.
 * Must be used AFTER JwtGuard: @UseGuards(JwtGuard, RolesGuard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<number[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true; // no role restriction

    const request = context
      .switchToHttp()
      .getRequest<{ user?: Partial<CurrentUserData> }>();
    const roleId = request.user?.role_id;

    if (roleId === undefined || !required.includes(roleId)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}
