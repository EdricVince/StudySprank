import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(60000);

const ROLE_STUDENT = 1;
const ROLE_TEACHER = 2;
const PW = 'Password123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

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
  const applicantEmail = `e2e_tapp_${ts}@test.com`;

  let adminToken = '';
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

    // The first admin is bootstrapped from ADMIN_EMAIL / ADMIN_PASSWORD on start-up.
    const adminLogin = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.data.access_token as string;

    // A teacher created by the admin is approved straight away.
    await request(http)
      .post('/api/v1/admin/create-teacher')
      .set(auth(adminToken))
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
    if (adminToken && http) {
      const res = await request(http)
        .get('/api/v1/admin/users')
        .set(auth(adminToken));
      const emails = [
        teacherEmail,
        studentInEmail,
        studentOutEmail,
        applicantEmail,
      ];
      for (const u of (res.body?.data ?? []).filter((x: any) =>
        emails.includes(x.email),
      )) {
        await request(http)
          .delete(`/api/v1/admin/users/${u.id}`)
          .set(auth(adminToken));
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

  describe('Class hub, class flashcard decks and leaving a class', () => {
    let deckId = 0;
    const hub = (token: string) =>
      request(http).get(`/api/v1/classes/${classId}/hub`).set(auth(token));

    it('the teacher gets the roster and the code; an enrolled student only the content', async () => {
      const t = await hub(teacherToken).expect(200);
      expect(t.body.data.class.class_code).toBe(classCode);
      expect(t.body.data.students).toHaveLength(1);
      const s = await hub(studentInToken).expect(200);
      expect(s.body.data.class.class_code).toBeNull();
      expect(s.body.data.students).toBeNull();
    });

    it('an unenrolled student cannot open the hub (403)', () =>
      hub(studentOutToken).expect(403));

    it('a student cannot assign a deck to a class (403)', () =>
      request(http)
        .post('/api/v1/flashcard-decks')
        .set(auth(studentInToken))
        .send({ title: 'Sneaky', class_id: classId })
        .expect(403));

    it('a teacher can assign a deck to their own class; it is never public', async () => {
      const res = await request(http)
        .post('/api/v1/flashcard-decks')
        .set(auth(teacherToken))
        .send({
          title: 'Unit 1',
          class_id: classId,
          is_public: true,
          cards: [{ term: 'apple', definition: 'quả táo' }],
        })
        .expect(201);
      deckId = res.body.data.id;
      expect(res.body.data.class_id).toBe(classId);
      expect(res.body.data.is_public).toBe(false);
    });

    it('only the class sees that deck (list, read and hub)', async () => {
      const inList = await request(http)
        .get('/api/v1/flashcard-decks')
        .set(auth(studentInToken))
        .expect(200);
      expect(inList.body.data.map((d: any) => d.id)).toContain(deckId);
      await request(http)
        .get(`/api/v1/flashcard-decks/${deckId}`)
        .set(auth(studentInToken))
        .expect(200);

      const outList = await request(http)
        .get('/api/v1/flashcard-decks')
        .set(auth(studentOutToken))
        .expect(200);
      expect(outList.body.data.map((d: any) => d.id)).not.toContain(deckId);
      await request(http)
        .get(`/api/v1/flashcard-decks/${deckId}`)
        .set(auth(studentOutToken))
        .expect(403);

      const s = await hub(studentInToken).expect(200);
      expect(s.body.data.decks.map((d: any) => d.id)).toContain(deckId);
    });

    it('a student can leave the class and then loses access to it', async () => {
      await request(http)
        .delete(`/api/v1/classes/${classId}/leave`)
        .set(auth(studentInToken))
        .expect(204);
      await hub(studentInToken).expect(403);
      await request(http)
        .get(`/api/v1/flashcard-decks/${deckId}`)
        .set(auth(studentInToken))
        .expect(403);
      // leaving twice is a clean 404, not a crash
      await request(http)
        .delete(`/api/v1/classes/${classId}/leave`)
        .set(auth(studentInToken))
        .expect(404);
    });
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

  describe('Teacher applications (verification + activity log)', () => {
    // 1×1 PNG — stands in for a photographed teacher ID card.
    const CARD =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    let applicantToken = '';
    let applicantId = 0;

    const review = (token: string, body: object) =>
      request(http)
        .patch(`/api/v1/admin/users/${applicantId}/teacher-status`)
        .set(auth(token))
        .send(body);

    it('a self-registered teacher starts as pending and is blocked from teacher routes (403)', async () => {
      const res = await request(http)
        .post('/api/v1/auth/register-teacher')
        .send({
          email: applicantEmail,
          password: PW,
          name: 'E2E Applicant',
          organization: 'E2E School',
          teacher_card_image: CARD,
        })
        .expect(201);
      expect(res.body.data.teacher_status).toBe('pending');
      applicantToken = res.body.data.access_token as string;
      applicantId = res.body.data.id as number;

      await request(http)
        .post('/api/v1/classes')
        .set(auth(applicantToken))
        .send({ name: 'Not yet' })
        .expect(403);
    });

    it('only an admin can review applications (403 for a teacher)', () =>
      review(teacherToken, { status: 'approved' }).expect(403));

    it('rejecting requires a reason (400)', () =>
      review(adminToken, { status: 'rejected' }).expect(400));

    it('a rejection keeps the teacher blocked and shows the reason', async () => {
      await review(adminToken, {
        status: 'rejected',
        reason: 'Document unreadable',
      }).expect(200);
      await request(http)
        .post('/api/v1/classes')
        .set(auth(applicantToken))
        .send({ name: 'Still no' })
        .expect(403);
      const me = await request(http)
        .get('/api/v1/auth/me')
        .set(auth(applicantToken))
        .expect(200);
      expect(me.body.data.teacher_status).toBe('rejected');
      expect(me.body.data.teacher_reject_reason).toBe('Document unreadable');
    });

    it('approval unlocks teacher routes immediately (201)', async () => {
      await review(adminToken, { status: 'approved' }).expect(200);
      await request(http)
        .post('/api/v1/classes')
        .set(auth(applicantToken))
        .send({ name: 'Approved class' })
        .expect(201);
    });

    it('the review and the new class appear in the activity log', async () => {
      await new Promise((resolve) => setTimeout(resolve, 500)); // log writes are fire-and-forget
      const res = await request(http)
        .get('/api/v1/admin/activity?limit=100')
        .set(auth(adminToken))
        .expect(200);
      const actions = (res.body.data as { action: string }[]).map(
        (r) => r.action,
      );
      expect(actions).toEqual(
        expect.arrayContaining([
          'teacher.apply',
          'teacher.review',
          'class.create',
        ]),
      );
      // The log is admin-only.
      await request(http)
        .get('/api/v1/admin/activity')
        .set(auth(teacherToken))
        .expect(403);
    });
  });
});
