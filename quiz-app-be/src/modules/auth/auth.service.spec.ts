import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterTeacherDto } from './dto/register.dto';
import { parseDurationSeconds } from './token-ttl';
import { signHs256 } from '../../core/security/jwt.util';

const SECRET = 'unit-test-secret';
const PW = 'Password123!';

/** In-memory stand-in for the refresh_tokens repository. */
function makeRefreshRepo() {
  const rows: any[] = [];
  const matches = (r: any, crit: Record<string, unknown>) =>
    Object.entries(crit).every(([k, v]) =>
      k === 'revoked_at' ? r.revoked_at == null : r[k] === v,
    );
  return {
    rows,
    create: (x: any) => ({ ...x }),
    save: jest.fn(async (x: any) => {
      if (!x.id) {
        x.id = rows.length + 1;
        rows.push(x);
      }
      return x;
    }),
    findOne: jest.fn(
      async ({ where }: any) =>
        rows.find((r) => r.token_hash === where.token_hash) ?? null,
    ),
    update: jest.fn(async (crit: any, patch: any) => {
      rows
        .filter((r) => matches(r, crit))
        .forEach((r) => Object.assign(r, patch));
    }),
  };
}

describe('AuthService — access/refresh tokens with rotation', () => {
  let user: any;
  let users: any;
  let refreshRepo: ReturnType<typeof makeRefreshRepo>;
  let service: AuthService;

  beforeAll(async () => {
    user = {
      id: 1,
      email: 'a@b.c',
      role_id: 1,
      is_active: true,
      password: await bcrypt.hash(PW, 4),
    };
  });

  beforeEach(() => {
    user.is_active = true;
    users = {
      findByEmail: jest.fn(async (e: string) =>
        e === user.email ? user : null,
      ),
      findById: jest.fn(async (id: number) => (id === user.id ? user : null)),
      create: jest.fn(),
    };
    const env: Record<string, string> = {
      JWT_SECRET: SECRET,
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    const config = { get: (k: string) => env[k] } as any;
    refreshRepo = makeRefreshRepo();
    service = new AuthService(users, config, {} as any, refreshRepo as any);
  });

  const login = () => service.login({ email: user.email, password: PW });
  const payloadOf = (jwt: string) =>
    JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());

  it('login returns a short-lived access token (JWT_ACCESS_EXPIRES_IN) and a refresh token stored only as a hash', async () => {
    const res = await login();
    const p = payloadOf(res.access_token);
    expect(p.exp - p.iat).toBe(15 * 60);
    expect(res.refresh_token).toBeTruthy();
    expect(refreshRepo.rows).toHaveLength(1);
    expect(refreshRepo.rows[0].token_hash).toBe(
      crypto.createHash('sha256').update(res.refresh_token).digest('hex'),
    );
    expect(JSON.stringify(refreshRepo.rows)).not.toContain(res.refresh_token);
    const ttlMs = refreshRepo.rows[0].expires_at.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(7 * 86400_000 - 5_000);
  });

  it('a valid refresh token is rotated: new pair issued, old token revoked, same family', async () => {
    const { refresh_token } = await login();
    const next = await service.refresh(refresh_token);

    expect(next.access_token).toBeTruthy();
    expect(next.refresh_token).not.toBe(refresh_token);
    expect(refreshRepo.rows[0].revoked_at).toBeInstanceOf(Date);
    expect(refreshRepo.rows[1].revoked_at).toBeNull();
    expect(refreshRepo.rows[1].family_id).toBe(refreshRepo.rows[0].family_id);
  });

  it('rejects a refresh token that was already used and revokes the whole family (reuse detection)', async () => {
    const { refresh_token } = await login();
    const next = await service.refresh(refresh_token);

    await expect(service.refresh(refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
    // the legitimately rotated token is now revoked too
    await expect(service.refresh(next.refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshRepo.rows.every((r) => r.revoked_at)).toBe(true);
  });

  it('logout revokes the refresh token so it can no longer be used', async () => {
    const { refresh_token } = await login();
    await service.logout(refresh_token);
    await expect(service.refresh(refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('an access token (even an expired one) cannot be used to refresh', async () => {
    const { access_token } = await login();
    await expect(service.refresh(access_token)).rejects.toThrow(
      UnauthorizedException,
    );
    const expired = signHs256(
      { sub: 1, email: user.email, role_id: 1 },
      SECRET,
      60,
      Date.now() - 3600_000,
    );
    await expect(service.refresh(expired)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuses to refresh for a deactivated account', async () => {
    const { refresh_token } = await login();
    user.is_active = false;
    await expect(service.refresh(refresh_token)).rejects.toThrow(
      'Account is not active',
    );
  });

  it('rejects an expired refresh token', async () => {
    const { refresh_token } = await login();
    refreshRepo.rows[0].expires_at = new Date(Date.now() - 1000);
    await expect(service.refresh(refresh_token)).rejects.toThrow(
      'Refresh token expired',
    );
  });

  it('self-registration never creates a teacher-domain account', async () => {
    await expect(
      service.register({ email: 'x@teacher.sprk', password: PW }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('RegisterDto — role_id restriction', () => {
  it.each([2, 3])('rejects role_id=%i on self-registration', async (role) => {
    const errors = await validate(
      plainToInstance(RegisterDto, {
        email: 'a@b.c',
        password: PW,
        role_id: role,
      }),
    );
    expect(errors.map((e) => e.property)).toContain('role_id');
  });

  it('accepts a student registration (role_id omitted or 1)', async () => {
    const email = 'student@example.com'; // class-validator rejects 1-letter TLDs like a@b.c
    expect(
      await validate(plainToInstance(RegisterDto, { email, password: PW })),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(RegisterDto, { email, password: PW, role_id: 1 }),
      ),
    ).toHaveLength(0);
  });
});

describe('parseDurationSeconds', () => {
  it('parses s/m/h/d suffixes and bare seconds, falling back on bad input', () => {
    expect(parseDurationSeconds('15m', 1)).toBe(900);
    expect(parseDurationSeconds('7d', 1)).toBe(604800);
    expect(parseDurationSeconds('2h', 1)).toBe(7200);
    expect(parseDurationSeconds('45', 1)).toBe(45);
    expect(parseDurationSeconds('soon', 123)).toBe(123);
    expect(parseDurationSeconds(undefined, 123)).toBe(123);
  });
});

describe('AuthService — teacher applications', () => {
  const CARD = 'data:image/png;base64,iVBORw0KGgo=';
  const dto = {
    email: 'teacher@school.edu',
    password: PW,
    name: ' Jane Roe ',
    organization: ' Hanoi English Centre ',
    teacher_card_image: CARD,
  };

  const build = (existing: any = null) => {
    const teacher = {
      id: 11,
      email: dto.email,
      role_id: 2,
      is_active: true,
      teacher_status: 'pending',
    };
    const users = {
      findByEmail: jest.fn().mockResolvedValue(existing),
      findById: jest.fn().mockResolvedValue(existing),
      createTeacherApplicant: jest.fn().mockResolvedValue(teacher),
      submitTeacherApplication: jest.fn().mockResolvedValue(undefined),
    } as any;
    const refreshRepo = {
      create: (x: any) => x,
      save: jest.fn().mockResolvedValue({}),
    } as any;
    const config = { get: () => SECRET } as any;
    return {
      users,
      service: new AuthService(users, config, {} as any, refreshRepo),
    };
  };

  it('creates a pending teacher with the trimmed profile and signs them in', async () => {
    const { users, service } = build();
    const res = await service.registerTeacher(dto);

    expect(users.createTeacherApplicant).toHaveBeenCalledWith(
      expect.objectContaining({
        email: dto.email,
        name: 'Jane Roe',
        organization: 'Hanoi English Centre',
        cardImage: CARD,
      }),
    );
    // the password is stored hashed, never as typed
    const stored = users.createTeacherApplicant.mock.calls[0][0];
    expect(await bcrypt.compare(PW, stored.hashedPassword)).toBe(true);
    expect(res).toMatchObject({ role_id: 2, teacher_status: 'pending' });
    expect(res.access_token).toBeTruthy();
  });

  it('refuses an email that is already registered (409)', async () => {
    const { service } = build({ id: 1, email: dto.email });
    await expect(service.registerTeacher(dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('a rejected teacher can re-submit a document and returns to the queue', async () => {
    const existing = {
      id: 11,
      role_id: 2,
      teacher_status: 'rejected',
      created_at: new Date(),
    };
    const { users, service } = build(existing);
    await service.submitTeacherApplication(11, {
      teacher_card_image: CARD,
      organization: ' New School ',
    });
    expect(users.submitTeacherApplication).toHaveBeenCalledWith(
      11,
      CARD,
      'New School',
    );
  });

  it('only non-approved teacher accounts can apply', async () => {
    const student = build({ id: 2, role_id: 1, teacher_status: 'none' });
    await expect(
      student.service.submitTeacherApplication(2, {
        teacher_card_image: CARD,
      }),
    ).rejects.toThrow(ForbiddenException);

    const approved = build({ id: 3, role_id: 2, teacher_status: 'approved' });
    await expect(
      approved.service.submitTeacherApplication(3, {
        teacher_card_image: CARD,
      }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('RegisterTeacherDto', () => {
  const base = {
    email: 'teacher@school.edu',
    password: PW,
    name: 'Jane Roe',
    organization: 'Hanoi English Centre',
    teacher_card_image: 'data:image/jpeg;base64,/9j/4AAQ',
  };
  const invalid = async (patch: object) => {
    const errors = await validate(
      plainToInstance(RegisterTeacherDto, { ...base, ...patch }),
    );
    return errors.map((e) => e.property);
  };

  it('accepts a complete application', async () => {
    expect(await invalid({})).toEqual([]);
  });

  it('requires the document to be a base64 image data URL', async () => {
    const urlProps = await invalid({ teacher_card_image: 'http://evil/x.png' });
    expect(urlProps).toContain('teacher_card_image');
    const htmlProps = await invalid({
      teacher_card_image: 'data:text/html;base64,AAAA',
    });
    expect(htmlProps).toContain('teacher_card_image');
  });

  it('requires a name, an organization and an 8+ character password', async () => {
    expect(await invalid({ name: 'J' })).toContain('name');
    expect(await invalid({ organization: '' })).toContain('organization');
    expect(await invalid({ password: 'short' })).toContain('password');
  });
});
