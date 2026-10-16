import { UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function context(key?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: key === undefined ? {} : { 'x-admin-key': key },
      }),
    }),
  } as any;
}

describe('AdminGuard', () => {
  /** A guard whose ConfigService returns the given ADMIN_SECRET. */
  const guardWithSecret = (secret?: string) =>
    new AdminGuard({ get: () => secret } as any);

  it('allows a request whose x-admin-key matches ADMIN_SECRET', () => {
    expect(
      guardWithSecret('s3cret-key').canActivate(context('s3cret-key')),
    ).toBe(true);
  });

  it('rejects a wrong key (even of a different length)', () => {
    expect(() =>
      guardWithSecret('s3cret-key').canActivate(context('wrong')),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a missing key', () => {
    expect(() =>
      guardWithSecret('s3cret-key').canActivate(context(undefined)),
    ).toThrow(UnauthorizedException);
  });

  it('rejects when no ADMIN_SECRET is configured', () => {
    expect(() =>
      guardWithSecret(undefined).canActivate(context('anything')),
    ).toThrow(UnauthorizedException);
  });
});
