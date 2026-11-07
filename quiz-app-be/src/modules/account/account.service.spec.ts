import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AccountService, mergePreferences } from './account.service';

describe('mergePreferences', () => {
  it('merges section by section and key by key, so one toggle never wipes the others', () => {
    const current = {
      study: { cardsPerDay: 30, studyMinutes: 20 },
      notifications: { email: true, weeklyReport: false },
    };
    expect(
      mergePreferences(current, {
        notifications: { weeklyReport: true },
        privacy: { showStreak: false },
      }),
    ).toEqual({
      study: { cardsPerDay: 30, studyMinutes: 20 },
      notifications: { email: true, weeklyReport: true },
      privacy: { showStreak: false },
    });
  });

  it('ignores keys that were not sent and works from nothing', () => {
    expect(
      mergePreferences(null, {
        study: { cardsPerDay: 10, studyMinutes: undefined },
      }),
    ).toEqual({ study: { cardsPerDay: 10 } });
    expect(mergePreferences({ privacy: { analytics: true } }, {})).toEqual({
      privacy: { analytics: true },
    });
  });
});

function build(row: Record<string, unknown> | null = null) {
  const profiles = {
    findOne: jest.fn().mockResolvedValue(row),
    create: jest.fn((x: Record<string, unknown>) => ({ ...x })),
    save: jest.fn((x: Record<string, unknown>) => Promise.resolve(x)),
  };
  const auth = {
    changePassword: jest
      .fn()
      .mockResolvedValue({ access_token: 'a', refresh_token: 'r' }),
    checkPassword: jest.fn(),
  };
  const admin = { deleteUser: jest.fn().mockResolvedValue(undefined) };
  const users = { findById: jest.fn() };
  const service = new AccountService(
    profiles as never,
    { query: jest.fn() } as never,
    auth as never,
    admin as never,
    users as never,
  );
  return { service, profiles, auth, admin, users };
}

describe('AccountService profile', () => {
  it('returns empty defaults for an account that never saved a profile', async () => {
    const { service } = build(null);
    expect(await service.getProfile(1)).toEqual({
      username: '',
      phone: '',
      title: '',
      location: '',
      bio: '',
      social_links: [],
      preferences: {},
    });
  });

  it('creates the row on first save, trims text, clears a field with "" and keeps the rest', async () => {
    const { service, profiles } = build({
      user_id: 1,
      phone: '0900',
      bio: 'old',
      social_links: [],
      preferences: { study: { cardsPerDay: 30 } },
    });
    const saved = await service.updateProfile(1, {
      title: '  Student  ',
      bio: '',
      preferences: { study: { studyMinutes: 45 } },
    });
    expect(profiles.save).toHaveBeenCalled();
    expect(saved).toMatchObject({
      phone: '0900', // untouched
      title: 'Student', // trimmed
      bio: '', // cleared
      preferences: { study: { cardsPerDay: 30, studyMinutes: 45 } },
    });
  });

  it('replaces the social links as a whole, trimmed', async () => {
    const { service } = build(null);
    const saved = await service.updateProfile(1, {
      social_links: [{ platform: ' GitHub ', url: ' https://github.com/x ' }],
    });
    expect(saved.social_links).toEqual([
      { platform: 'GitHub', url: 'https://github.com/x' },
    ]);
  });
});

describe('AccountService password and deletion', () => {
  it('hands the password change to the auth service and returns the fresh tokens', async () => {
    const { service, auth } = build();
    const tokens = await service.changePassword(3, 'old', 'new-password');
    expect(auth.changePassword).toHaveBeenCalledWith(3, 'old', 'new-password');
    expect(tokens).toEqual({ access_token: 'a', refresh_token: 'r' });
  });

  it('never deletes an administrator', async () => {
    const { service, users, admin } = build();
    users.findById.mockResolvedValue({ id: 1, role_id: 3, password: 'h' });
    await expect(service.deleteAccount(1, 'pw')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it('needs the right password before deleting anything', async () => {
    const { service, users, auth, admin } = build();
    users.findById.mockResolvedValue({ id: 2, role_id: 1, password: 'hash' });
    auth.checkPassword.mockResolvedValue(false);
    await expect(service.deleteAccount(2, 'wrong')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(admin.deleteUser).not.toHaveBeenCalled();

    auth.checkPassword.mockResolvedValue(true);
    await service.deleteAccount(2, 'right');
    expect(auth.checkPassword).toHaveBeenLastCalledWith('hash', 'right');
    expect(admin.deleteUser).toHaveBeenCalledWith(2);
  });
});
