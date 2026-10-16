import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimit } from '../decorators/rate-limit.decorator';

class FakeAuthController {
  @RateLimit({ limit: 3, windowMs: 60_000 })
  login() {}

  other() {}
}

function ctx(handler: (...a: any[]) => any, ip = '1.2.3.4', type = 'http') {
  const res = { setHeader: jest.fn() };
  return {
    res,
    context: {
      getType: () => type,
      getHandler: () => handler,
      getClass: () => FakeAuthController,
      switchToHttp: () => ({
        getRequest: () => ({ ip }),
        getResponse: () => res,
      }),
    } as any,
  };
}

describe('RateLimitGuard', () => {
  const T = 1_000_000;
  let guard: RateLimitGuard;
  beforeEach(() => {
    guard = new RateLimitGuard(new Reflector());
  });

  it('allows up to the @RateLimit limit, then answers 429 with Retry-After', () => {
    const { context, res } = ctx(FakeAuthController.prototype.login);
    for (let i = 0; i < 3; i++)
      expect(guard.canActivate(context, T)).toBe(true);

    let err: HttpException | undefined;
    try {
      guard.canActivate(context, T + 10_000);
    } catch (e) {
      err = e as HttpException;
    }
    expect(err?.getStatus()).toBe(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '50');
  });

  it('starts a fresh window after windowMs', () => {
    const { context } = ctx(FakeAuthController.prototype.login);
    for (let i = 0; i < 3; i++) guard.canActivate(context, T);
    expect(guard.canActivate(context, T + 60_000)).toBe(true);
  });

  it('counts each client IP separately', () => {
    const a = ctx(FakeAuthController.prototype.login, '1.1.1.1').context;
    const b = ctx(FakeAuthController.prototype.login, '2.2.2.2').context;
    for (let i = 0; i < 3; i++) guard.canActivate(a, T);
    expect(() => guard.canActivate(a, T)).toThrow(HttpException);
    expect(guard.canActivate(b, T)).toBe(true);
  });

  it('uses the global default (120/min) for routes without @RateLimit and ignores WebSocket events', () => {
    const { context } = ctx(FakeAuthController.prototype.other);
    for (let i = 0; i < 120; i++) guard.canActivate(context, T);
    expect(() => guard.canActivate(context, T)).toThrow(HttpException);
    expect(
      guard.canActivate(
        ctx(FakeAuthController.prototype.other, '1.2.3.4', 'ws').context,
        T,
      ),
    ).toBe(true);
  });
});
