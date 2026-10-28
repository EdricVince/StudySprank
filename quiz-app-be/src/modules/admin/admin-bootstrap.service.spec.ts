import { Logger } from '@nestjs/common';
import { AdminBootstrapService } from './admin-bootstrap.service';

describe('AdminBootstrapService — first administrator from env', () => {
  let warn: jest.SpyInstance;
  beforeAll(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });
  afterAll(() => jest.restoreAllMocks());
  beforeEach(() => warn.mockClear());

  const build = (env: Record<string, string>, existing: any = null) => {
    const config = { get: (k: string) => env[k] } as any;
    const users = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn((x: any) => x),
      save: jest.fn((x: any) => Promise.resolve(x)),
    } as any;
    return { users, service: new AdminBootstrapService(config, users) };
  };

  it('does nothing when ADMIN_EMAIL / ADMIN_PASSWORD are not set', async () => {
    const { users, service } = build({});
    await service.onApplicationBootstrap();
    expect(users.save).not.toHaveBeenCalled();
  });

  it('creates an active, verified admin (role 3) with a hashed password', async () => {
    const { users, service } = build({
      ADMIN_EMAIL: ' Boss@Example.com ',
      ADMIN_PASSWORD: 'longenough1',
    });
    await service.onApplicationBootstrap();
    const saved = users.save.mock.calls[0][0];
    expect(saved).toMatchObject({
      email: 'boss@example.com',
      role_id: 3,
      is_active: true,
      is_verified: true,
    });
    expect(saved.password).not.toBe('longenough1');
    expect(saved.password).toMatch(/^\$2[aby]\$/);
  });

  it('never promotes or overwrites an existing non-admin account with that email', async () => {
    const { users, service } = build(
      { ADMIN_EMAIL: 'a@b.c', ADMIN_PASSWORD: 'longenough1' },
      { id: 3, email: 'a@b.c', role_id: 1 },
    );
    await service.onApplicationBootstrap();
    expect(users.save).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('leaves an existing admin untouched', async () => {
    const { users, service } = build(
      { ADMIN_EMAIL: 'a@b.c', ADMIN_PASSWORD: 'longenough1' },
      { id: 3, email: 'a@b.c', role_id: 3 },
    );
    await service.onApplicationBootstrap();
    expect(users.save).not.toHaveBeenCalled();
  });

  it('skips a password shorter than 8 characters', async () => {
    const { users, service } = build({
      ADMIN_EMAIL: 'a@b.c',
      ADMIN_PASSWORD: 'short',
    });
    await service.onApplicationBootstrap();
    expect(users.save).not.toHaveBeenCalled();
  });
});
