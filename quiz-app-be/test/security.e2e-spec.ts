import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(60000);

const ROLE_STUDENT = 1;
const ROLE_TEACHER = 2;
const PW = 'Password123!';
const ADMIN_KEY = process.env.ADMIN_SECRET ?? '';

/**
 * End-to-end tests through the real HTTP stack (ValidationPipe + guards +
 * services + database). Complements the unit tests (which mock repositories)
 * by proving auth, RBAC and class isolation work together against the live DB.
 */
describe('Security (e2e): auth, RBAC & class isolation', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const ts = Date.now();
  const teacherEmail = `e2e_ta_${ts}@test.com`;
  const studentInEmail = `e2e_sin_${ts}@test.com`;
  const studentOutEmail = `e2e_sout_${ts}@test.com`;

  let teacherToken = '';
  let studentInToken = '';
  let studentOutToken = '';
  let classId = 0;
  let classCode = '';

  const register = (email: string, role: number) =>
    request(http)
      .post('/api/v1/auth/register')
      .send({ email, password: PW, role_id: role });
  const login = async (email: string): Promise<string> => {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password: PW });
    return res.body.data.access_token as string;
  };
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    // Match main.ts so validation behaves exactly as in production.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    http = app.getHttpServer();

    // Teachers can no longer self-register — they are created by an admin.
    await request(http)
      .post('/api/v1/admin/create-teacher')
      .set('x-admin-key', ADMIN_KEY)
      .send({ name: 'E2E Teacher', password: PW, email: teacherEmail })
      .expect(201);
    await register(studentInEmail, ROLE_STUDENT);
    await register(studentOutEmail, ROLE_STUDENT);
    teacherToken = await login(teacherEmail);
    studentInToken = await login(studentInEmail);
    studentOutToken = await login(studentOutEmail);
  });

  afterAll(async () => {
    // Best-effort cleanup: deleting the users cascades their data via the FKs.
    const adminKey = process.env.ADMIN_SECRET;
    if (adminKey && http) {
      const res = await request(http)
        .get('/api/v1/admin/users')
        .set('x-admin-key', adminKey);
      const emails = [teacherEmail, studentInEmail, studentOutEmail];
      for (const u of (res.body?.data ?? []).filter((x: any) =>
        emails.includes(x.email),
      )) {
        await request(http)
          .delete(`/api/v1/admin/users/${u.id}`)
          .set('x-admin-key', adminKey);
      }
    }
    if (app) await app.close();
  });

  describe('Authentication', () => {
    it('rejects /auth/me without a token (401)', () =>
      request(http).get('/api/v1/auth/me').expect(401));

    it('returns the profile for a valid token (200)', async () => {
      const res = await request(http)
        .get('/api/v1/auth/me')
        .set(auth(teacherToken))
        .expect(200);
      expect(res.body.data.email).toBe(teacherEmail);
    });
  });

  describe('RBAC — teacher-only endpoints', () => {
    it('blocks a student from creating a class (403)', () =>
      request(http)
        .post('/api/v1/classes')
        .set(auth(studentInToken))
        .send({ name: 'Nope' })
        .expect(403));

    it('blocks a student from teacher analytics (403)', () =>
      request(http)
        .get('/api/v1/classes/analytics')
        .set(auth(studentInToken))
        .expect(403));

    it('lets a teacher create a class (201)', async () => {
      const res = await request(http)
        .post('/api/v1/classes')
        .set(auth(teacherToken))
        .send({ name: 'E2E Class', description: 'x' })
        .expect(201);
      classId = res.body.data.id;
      classCode = res.body.data.class_code;
      expect(classId).toBeGreaterThan(0);
      expect(classCode).toBeTruthy();
    });
  });

  describe('Class isolation — GET /classes/:id', () => {
    it('an enrolled student can join by code then read the class (200)', async () => {
      await request(http)
        .post('/api/v1/classes/join')
        .set(auth(studentInToken))
        .send({ class_code: classCode })
        .expect(201);
      await request(http)
        .get(`/api/v1/classes/${classId}`)
        .set(auth(studentInToken))
        .expect(200);
    });

    it('the owning teacher can read the class (200)', () =>
      request(http)
        .get(`/api/v1/classes/${classId}`)
        .set(auth(teacherToken))
        .expect(200));

    it('an unrelated (unenrolled) student is forbidden (403)', () =>
      request(http)
        .get(`/api/v1/classes/${classId}`)
        .set(auth(studentOutToken))
        .expect(403));
  });

  describe('Shared reads', () => {
    it('a student can list their own classes (200)', () =>
      request(http)
        .get('/api/v1/classes')
        .set(auth(studentInToken))
        .expect(200));
  });

  describe('Registration roles', () => {
    it('rejects self-registration as a teacher (400)', () =>
      register(`e2e_fake_teacher_${ts}@test.com`, ROLE_TEACHER).expect(400));
  });

  describe('Refresh tokens (rotation + revocation)', () => {
    const loginPair = async (email: string) =>
      (
        await request(http)
          .post('/api/v1/auth/login')
          .send({ email, password: PW })
          .expect(200)
      ).body.data as {
        access_token: string;
        refresh_token: string;
      };
    const refresh = (refresh_token: string) =>
      request(http).post('/api/v1/auth/refresh').send({ refresh_token });

    it('rotates the refresh token and rejects reuse of the old one', async () => {
      const pair = await loginPair(studentInEmail);
      const res = await refresh(pair.refresh_token).expect(200);
      expect(res.body.data.refresh_token).toBeTruthy();
      expect(res.body.data.refresh_token).not.toBe(pair.refresh_token);
      await refresh(pair.refresh_token).expect(401);
    });

    it('does not accept an access token as a refresh token', async () => {
      const pair = await loginPair(studentInEmail);
      await refresh(pair.access_token).expect(401);
    });

    it('logout revokes the refresh token', async () => {
      const pair = await loginPair(studentInEmail);
      await request(http)
        .post('/api/v1/auth/logout')
        .send({ refresh_token: pair.refresh_token })
        .expect(200);
      await refresh(pair.refresh_token).expect(401);
    });
  });
});
