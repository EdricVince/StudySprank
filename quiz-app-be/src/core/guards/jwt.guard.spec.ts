import { UnauthorizedException } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { signHs256, verifyHs256 } from '../security/jwt.util';

const SECRET = 'guard-secret';
const config = {
  get: (k: string) => (k === 'JWT_SECRET' ? SECRET : undefined),
} as any;

function build(dbUser: { id: number; is_active: boolean } | null) {
  const repo = { findOne: jest.fn().mockResolvedValue(dbUser) };
  const dataSource = { getRepository: () => repo } as any;
  return { guard: new JwtGuard(config, dataSource), repo };
}

const ctx = (authorization?: string) => {
  const req: any = { headers: authorization ? { authorization } : {} };
  return {
    req,
    context: { switchToHttp: () => ({ getRequest: () => req }) } as any,
  };
};

const tokenFor = (sub: number, ttl = 900, nowMs = Date.now()) =>
  signHs256({ sub, email: 'u@x.y', role_id: 1 }, SECRET, ttl, nowMs);

describe('JwtGuard', () => {
  it('accepts a valid token for an active user and attaches request.user', async () => {
    const { guard } = build({ id: 5, is_active: true });
    const { req, context } = ctx(`Bearer ${tokenFor(5)}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 5, email: 'u@x.y', role_id: 1 });
  });

  it('returns 401 for a deactivated user even with an unexpired token', async () => {
    const { guard } = build({ id: 5, is_active: false });
    await expect(
      guard.canActivate(ctx(`Bearer ${tokenFor(5)}`).context),
    ).rejects.toThrow('Account is not active');
  });

  it('returns 401 for a deleted user', async () => {
    const { guard } = build(null);
    await expect(
      guard.canActivate(ctx(`Bearer ${tokenFor(5)}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns 401 for an expired token without touching the database', async () => {
    const { guard, repo } = build({ id: 5, is_active: true });
    const expired = tokenFor(5, 60, Date.now() - 3600_000);
    await expect(
      guard.canActivate(ctx(`Bearer ${expired}`).context),
    ).rejects.toThrow('Token expired');
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('returns 401 for a missing header or a tampered signature', async () => {
    const { guard } = build({ id: 5, is_active: true });
    await expect(guard.canActivate(ctx().context)).rejects.toThrow(
      'No token provided',
    );
    const t = tokenFor(5);
    const tampered = t.slice(0, -2) + (t.endsWith('AA') ? 'BB' : 'AA');
    await expect(
      guard.canActivate(ctx(`Bearer ${tampered}`).context),
    ).rejects.toThrow('Invalid token signature');
  });
});

describe('verifyHs256 (constant-time signature check)', () => {
  it('rejects a signature of the wrong length without throwing', () => {
    const t = tokenFor(1);
    expect(verifyHs256(`${t}xyz`, SECRET)).toEqual({
      ok: false,
      reason: 'signature',
    });
    expect(verifyHs256('a.b', SECRET)).toEqual({ ok: false, reason: 'format' });
  });
});
