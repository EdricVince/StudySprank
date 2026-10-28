import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { verifyHs256 } from '../security/jwt.util';
import type { Request } from 'express';
import type { CurrentUserData } from '../decorators/current-user.decorator';

export type { AccessTokenPayload as JwtPayload } from '../security/jwt.util';

const FAILURE_MESSAGES = {
  format: 'Invalid token format',
  signature: 'Invalid token signature',
  payload: 'Invalid token payload',
  expired: 'Token expired',
} as const;

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUserData }>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new UnauthorizedException('Server misconfiguration');

    const result = verifyHs256(authHeader.split(' ')[1], secret);
    if (!result.ok)
      throw new UnauthorizedException(FAILURE_MESSAGES[result.reason]);
    const payload = result.payload;

    // A deactivated (or deleted) account loses access immediately, even with an unexpired token.
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: payload.sub },
      select: ['id', 'is_active', 'teacher_status'],
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Account is not active');
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role_id: payload.role_id,
      teacher_status: user.teacher_status,
    };

    return true;
  }
}
