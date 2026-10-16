import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface CurrentUserData {
  id: number;
  email: string;
  role_id: number;
}

/** An Express request after JwtGuard has attached the verified user. */
export interface AuthenticatedRequest extends Request {
  user: CurrentUserData;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
