import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
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
  let dataSource: DataSource;

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
    dataSource = app.get(DataSource);

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

    it('blocks a student from the teacher student total (403)', () =>
      request(http)
        .get('/api/v1/classes/student-total')
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

    it('counts each enrolled student once for the teacher (student-total)', async () => {
      const res = await request(http)
        .get('/api/v1/classes/student-total')
        .set(auth(teacherToken))
        .expect(200);
      expect(res.body.data.students).toBe(1);
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

    it('a teacher cannot read the analytics of another teacher’s class (403)', () =>
      request(http)
        .get(`/api/v1/classes/analytics?classId=${classId}`)
        .set(auth(applicantToken))
        .expect(403));

    it('the admin record of the account shows the application, the reviewer and the trail', async () => {
      await new Promise((resolve) => setTimeout(resolve, 500)); // log writes are fire-and-forget
      const res = await request(http)
        .get(`/api/v1/admin/users/${applicantId}/account`)
        .set(auth(adminToken))
        .expect(200);
      const { account, history } = res.body.data as {
        account: Record<string, unknown>;
        history: { action: string; metadata: Record<string, unknown> }[];
      };
      expect(account).toMatchObject({
        email: applicantEmail,
        role: 'teacher',
        teacher_status: 'approved',
        teacher_organization: 'E2E School',
        has_teacher_card: true,
        teacher_reviewed_by_email: ADMIN_EMAIL,
        classes_owned: 1,
      });
      expect(account.teacher_applied_at).toBeTruthy();
      expect(account.teacher_reviewed_at).toBeTruthy();
      const actions = history.map((h) => h.action);
      expect(actions).toEqual(
        expect.arrayContaining(['teacher.apply', 'teacher.review']),
      );
      // both decisions (rejection with its reason, then approval) are in the trail
      const decisions = history
        .filter((h) => h.action === 'teacher.review')
        .map((h) => h.metadata.status);
      expect(decisions).toEqual(
        expect.arrayContaining(['rejected', 'approved']),
      );
    });

    it('the same record is readable straight from the database views', async () => {
      const rows = await dataSource.query<
        { status: string; decided_by_email: string; decisions: number }[]
      >(
        `SELECT status, decided_by_email, decisions FROM teacher_applications WHERE id = $1`,
        [applicantId],
      );
      expect(rows[0]).toMatchObject({
        status: 'approved',
        decided_by_email: ADMIN_EMAIL,
        decisions: 2,
      });
    });

    it('signing in stores the last sign-in time; only an admin can read account records', async () => {
      await login(applicantEmail);
      const rows = await dataSource.query<{ last_login_at: Date | null }[]>(
        `SELECT last_login_at FROM user_accounts WHERE id = $1`,
        [applicantId],
      );
      expect(rows[0].last_login_at).toBeTruthy();
      await request(http)
        .get(`/api/v1/admin/users/${applicantId}/account`)
        .set(auth(teacherToken))
        .expect(403);
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

  describe('Learning history (flashcards and quiz games)', () => {
    const session = (over: Record<string, unknown> = {}) => ({
      kind: 'quiz',
      mode_id: 'multiple-choice',
      mode_name: 'Multiple Choice',
      source: 'builtin',
      title: 'Multiple Choice',
      learning_lang: 'en',
      meaning_lang: 'vi',
      score: 200,
      xp_earned: 10,
      duration_seconds: 42,
      words: [
        { term: 'door', meaning: 'cửa', is_correct: true },
        { term: 'cat', meaning: 'con mèo', is_correct: false },
      ],
      ...over,
    });
    let quizId = 0;
    let deckSessionId = 0;
    let historyDeckId = 0;

    beforeAll(async () => {
      const res = await request(http)
        .post('/api/v1/flashcard-decks')
        .set(auth(teacherToken))
        .send({
          title: 'Unit 1',
          class_id: classId,
          cards: [{ term: 'apple', definition: 'quả táo' }],
        })
        .expect(201);
      historyDeckId = res.body.data.id;
    });

    it('requires a signed-in user (401)', () =>
      request(http)
        .post('/api/v1/learning-sessions')
        .send(session())
        .expect(401));

    it('rejects an empty word list and unknown fields (400)', async () => {
      await request(http)
        .post('/api/v1/learning-sessions')
        .set(auth(studentInToken))
        .send(session({ words: [] }))
        .expect(400);
      await request(http)
        .post('/api/v1/learning-sessions')
        .set(auth(studentInToken))
        .send(session({ user_id: 1 }))
        .expect(400);
    });

    it('stores a finished quiz game with its words', async () => {
      const res = await request(http)
        .post('/api/v1/learning-sessions')
        .set(auth(studentInToken))
        .send(session())
        .expect(201);
      quizId = res.body.data.id;
      expect(res.body.data).toMatchObject({
        total_items: 2,
        correct_items: 1,
        accuracy: 50,
      });
      expect(res.body.data.words).toHaveLength(2);
    });

    it('stores a flashcard session on a class deck, and the words can be read back in order', async () => {
      const res = await request(http)
        .post('/api/v1/learning-sessions')
        .set(auth(studentInToken))
        .send(
          session({
            kind: 'flashcard',
            mode_id: 'flashcards',
            mode_name: 'Flashcards',
            source: 'deck',
            title: 'Unit 1',
            deck_id: historyDeckId,
            words: [{ term: 'apple', meaning: 'quả táo', is_correct: true }],
          }),
        )
        .expect(201);
      deckSessionId = res.body.data.id;
      const detail = await request(http)
        .get(`/api/v1/learning-sessions/${deckSessionId}`)
        .set(auth(studentInToken))
        .expect(200);
      expect(detail.body.data.deck_id).toBe(historyDeckId);
      expect(detail.body.data.words.map((w: any) => w.term)).toEqual(['apple']);
    });

    it('lists the history by kind, only the caller’s own', async () => {
      const flash = await request(http)
        .get('/api/v1/learning-sessions?kind=flashcard')
        .set(auth(studentInToken))
        .expect(200);
      expect(flash.body.data.items.map((s: any) => s.id)).toEqual([
        deckSessionId,
      ]);
      const quiz = await request(http)
        .get('/api/v1/learning-sessions?kind=quiz')
        .set(auth(studentInToken))
        .expect(200);
      expect(quiz.body.data.items.map((s: any) => s.id)).toContain(quizId);

      const other = await request(http)
        .get('/api/v1/learning-sessions')
        .set(auth(studentOutToken))
        .expect(200);
      expect(other.body.data.total).toBe(0);
      await request(http)
        .get(`/api/v1/learning-sessions/${quizId}`)
        .set(auth(studentOutToken))
        .expect(404);
      await request(http)
        .delete(`/api/v1/learning-sessions/${quizId}`)
        .set(auth(studentOutToken))
        .expect(404);
    });

    it('is readable straight from the database view, with the class and the words', async () => {
      const rows = await dataSource.query<
        { title: string; class_name: string | null; words: string }[]
      >(
        `SELECT title, class_name, words FROM learning_history_feed WHERE id = $1`,
        [deckSessionId],
      );
      expect(rows[0].title).toBe('Unit 1');
      expect(rows[0].class_name).toBeTruthy();
      expect(rows[0].words).toContain('apple = quả táo');
    });

    it('keeps the history after the deck is deleted, and the owner can delete a session', async () => {
      await request(http)
        .delete(`/api/v1/flashcard-decks/${historyDeckId}`)
        .set(auth(teacherToken))
        .expect(204);
      const detail = await request(http)
        .get(`/api/v1/learning-sessions/${deckSessionId}`)
        .set(auth(studentInToken))
        .expect(200);
      expect(detail.body.data.deck_id).toBeNull();
      expect(detail.body.data.title).toBe('Unit 1');

      await request(http)
        .delete(`/api/v1/learning-sessions/${quizId}`)
        .set(auth(studentInToken))
        .expect(204);
      await request(http)
        .get(`/api/v1/learning-sessions/${quizId}`)
        .set(auth(studentInToken))
        .expect(404);
    });
  });

  describe('Analytics: teacher sees joined students only, student sees their own statistics', () => {
    it('students who joined appear in the class analytics; nobody else does', async () => {
      await request(http)
        .post('/api/v1/classes/join')
        .set(auth(studentOutToken))
        .send({ class_code: classCode })
        .expect(201);

      const res = await request(http)
        .get(`/api/v1/classes/analytics?classId=${classId}`)
        .set(auth(teacherToken))
        .expect(200);
      expect(res.body.data.selectedClassId).toBe(classId);
      expect(res.body.data.students.map((x: any) => x.email)).toEqual([
        studentOutEmail,
      ]);
      expect(res.body.data.studentsTotal).toBe(1);
      expect(res.body.data.classes.map((c: any) => c.id)).toContain(classId);
    });

    it('a student who left the class disappears from it', async () => {
      await request(http)
        .delete(`/api/v1/classes/${classId}/leave`)
        .set(auth(studentOutToken))
        .expect(204);
      const res = await request(http)
        .get(`/api/v1/classes/analytics?classId=${classId}`)
        .set(auth(teacherToken))
        .expect(200);
      expect(res.body.data.students).toEqual([]);
    });

    it('students cannot open the teacher analytics (403) and a bad class id is rejected (400)', async () => {
      await request(http)
        .get('/api/v1/classes/analytics')
        .set(auth(studentInToken))
        .expect(403);
      await request(http)
        .get('/api/v1/classes/analytics?classId=abc')
        .set(auth(teacherToken))
        .expect(400);
    });

    it('a student reads their own statistics, week by default', async () => {
      await request(http)
        .post('/api/v1/learning-sessions')
        .set(auth(studentInToken))
        .send({
          kind: 'quiz',
          mode_id: 'multiple-choice',
          mode_name: 'Multiple Choice',
          source: 'builtin',
          title: 'Multiple Choice',
          duration_seconds: 90,
          words: [
            { term: 'door', meaning: 'cửa', is_correct: false },
            { term: 'cat', meaning: 'con mèo', is_correct: true },
          ],
        })
        .expect(201);

      const res = await request(http)
        .get('/api/v1/progress/statistics')
        .set(auth(studentInToken))
        .expect(200);
      const d = res.body.data;
      expect(d.period).toBe('week');
      expect(d.activity).toHaveLength(7);
      expect(d.summary.quizGames).toBeGreaterThanOrEqual(1);
      expect(d.byMode.map((m: any) => m.modeId)).toContain('multiple-choice');
      expect(d.vocabulary.learned).toBeGreaterThanOrEqual(1);
      expect(d.vocabulary.weakWords.map((w: any) => w.term)).toContain('door');
      expect(d.hasHistory).toBe(true);
    });

    it('statistics belong to the caller only, support month/year and reject other periods', async () => {
      const other = await request(http)
        .get('/api/v1/progress/statistics?period=year')
        .set(auth(studentOutToken))
        .expect(200);
      expect(other.body.data.activity).toHaveLength(12);
      expect(other.body.data.summary.sessions).toBe(0);
      expect(other.body.data.vocabulary.weakWords).toEqual([]);

      await request(http)
        .get('/api/v1/progress/statistics?period=decade')
        .set(auth(studentInToken))
        .expect(400);
      await request(http).get('/api/v1/progress/statistics').expect(401);
    });
  });

  describe('Vocabulary list: every word the student practised', () => {
    const post = (token: string, words: object[], over: object = {}) =>
      request(http)
        .post('/api/v1/learning-sessions')
        .set(auth(token))
        .send({
          kind: 'quiz',
          mode_id: 'multiple-choice',
          mode_name: 'Multiple Choice',
          source: 'builtin',
          title: 'Multiple Choice',
          words,
          ...over,
        })
        .expect(201);
    const list = (token: string, query = '') =>
      request(http)
        .get(`/api/v1/learning-sessions/vocabulary${query}`)
        .set(auth(token));

    beforeAll(async () => {
      await post(studentInToken, [
        { term: 'Quokka', meaning: 'chuột túi nhỏ', is_correct: false },
        { term: 'yak', meaning: 'bò Tây Tạng', is_correct: true },
        { term: 'ibex', meaning: 'dê rừng' }, // never rated
      ]);
      await post(studentInToken, [
        {
          term: 'quokka',
          meaning: 'chuột túi nhỏ',
          example: 'A quokka smiles.',
          is_correct: false,
        },
      ]);
      // Battle questions are not vocabulary
      await post(
        studentInToken,
        [
          {
            term: 'battleq: capital of France?',
            meaning: 'Paris',
            is_correct: true,
          },
        ],
        { mode_id: 'battle', mode_name: 'Battle Mode', source: 'ai' },
      );
    });

    it('merges a word that came up several times into one row with how it went', async () => {
      const res = await list(studentInToken, '?search=quokka').expect(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]).toMatchObject({
        meaning: 'chuột túi nhỏ',
        example: 'A quokka smiles.',
        seen: 2,
        correct: 0,
        missed: 2,
        status: 'weak',
      });
      expect(res.body.data.items[0].term.toLowerCase()).toBe('quokka');
    });

    it('filters by status and reports the size of the whole list', async () => {
      const weak = await list(
        studentInToken,
        '?status=weak&search=quokka',
      ).expect(200);
      expect(weak.body.data.total).toBe(1);
      const none = await list(
        studentInToken,
        '?status=learned&search=quokka',
      ).expect(200);
      expect(none.body.data.total).toBe(0);

      const learned = await list(
        studentInToken,
        '?status=learned&search=yak',
      ).expect(200);
      expect(learned.body.data.items[0].status).toBe('learned');

      const all = await list(studentInToken).expect(200);
      const terms = all.body.data.items.map((w: any) => w.term.toLowerCase());
      expect(terms).toEqual(expect.arrayContaining(['quokka', 'yak', 'ibex']));
      expect(
        all.body.data.items.find((w: any) => w.term === 'ibex').status,
      ).toBe('unrated');
      expect(all.body.data.summary.total).toBeGreaterThanOrEqual(3);
      expect(all.body.data.summary.weak).toBeGreaterThanOrEqual(1);
    });

    it('also finds a word by its meaning, and treats % and _ literally', async () => {
      const byMeaning = await list(
        studentInToken,
        '?search=' + encodeURIComponent('bò Tây'),
      ).expect(200);
      expect(byMeaning.body.data.items.map((w: any) => w.term)).toContain(
        'yak',
      );
      const percent = await list(studentInToken, '?search=%25').expect(200);
      expect(percent.body.data.total).toBe(0); // no word contains a literal %
    });

    it('leaves Battle questions out', async () => {
      const res = await list(studentInToken, '?search=battleq').expect(200);
      expect(res.body.data.total).toBe(0);
    });

    it('is private to the caller and validates its query', async () => {
      const other = await list(studentOutToken, '?search=quokka').expect(200);
      expect(other.body.data.total).toBe(0);
      await list(studentInToken, '?status=bogus').expect(400);
      await request(http)
        .get('/api/v1/learning-sessions/vocabulary')
        .expect(401);
    });

    it('accepts a session made of words picked from the list (source review)', async () => {
      const res = await post(
        studentInToken,
        [{ term: 'yak', meaning: 'bò Tây Tạng', is_correct: true }],
        {
          kind: 'flashcard',
          mode_id: 'flashcards-review',
          source: 'review',
          title: 'My vocabulary',
        },
      );
      expect(res.body.data.source).toBe('review');
    });
  });

  describe('Account: profile, settings, password, export, deletion and study plans', () => {
    const email = `e2e_acct_${ts}@test.com`;
    const otherEmail = `e2e_acct2_${ts}@test.com`;
    const NEW_PW = 'Another-Password-456!';
    let token = '';
    let refresh = '';
    let userId = 0;
    let otherToken = '';

    const signIn = (mail: string, password: string) =>
      request(http).post('/api/v1/auth/login').send({ email: mail, password });
    const put = (path: string, body: object, tk = token) =>
      request(http).put(path).set(auth(tk)).send(body);

    beforeAll(async () => {
      await register(email, ROLE_STUDENT);
      await register(otherEmail, ROLE_STUDENT);
      const a = await signIn(email, PW);
      token = a.body.data.access_token;
      refresh = a.body.data.refresh_token;
      userId = a.body.data.user.id;
      otherToken = (await signIn(otherEmail, PW)).body.data.access_token;
    });

    it('needs a signed-in user, and a new account has an empty profile', async () => {
      await request(http).get('/api/v1/account/profile').expect(401);
      const res = await request(http)
        .get('/api/v1/account/profile')
        .set(auth(token))
        .expect(200);
      expect(res.body.data).toMatchObject({
        bio: '',
        social_links: [],
        target_band: null,
        preferences: {},
      });
    });

    it('saves the profile card, target band and settings, merging the settings section by section', async () => {
      await put('/api/v1/account/profile', {
        username: 'vinh',
        phone: '0900 000 000',
        title: 'Student',
        location: 'Hanoi',
        bio: 'Learning English',
        target_band: 7.5,
        social_links: [{ platform: 'GitHub', url: 'https://github.com/vinh' }],
        preferences: { notifications: { email: false, reminderTime: '07:30' } },
      }).expect(200);
      await put('/api/v1/account/profile', {
        preferences: {
          study: { cardsPerDay: 40, studyMinutes: 25 },
          privacy: { showStreak: false },
        },
      }).expect(200);

      const res = await request(http)
        .get('/api/v1/account/profile')
        .set(auth(token))
        .expect(200);
      expect(res.body.data).toMatchObject({
        username: 'vinh',
        bio: 'Learning English',
        target_band: 7.5,
        social_links: [{ platform: 'GitHub', url: 'https://github.com/vinh' }],
        preferences: {
          notifications: { email: false, reminderTime: '07:30' },
          study: { cardsPerDay: 40, studyMinutes: 25 },
          privacy: { showStreak: false },
        },
      });
    });

    it('is stored in the database (user_profiles), one row for the account', async () => {
      const rows = await dataSource.query<
        { bio: string; target_band: number; preferences: any }[]
      >(
        `SELECT bio, target_band, preferences FROM user_profiles WHERE user_id = $1`,
        [userId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].bio).toBe('Learning English');
      expect(rows[0].target_band).toBe(7.5);
      expect(rows[0].preferences.study.cardsPerDay).toBe(40);
    });

    it('rejects unsafe or invalid values (400)', async () => {
      const bad = (body: object) =>
        put('/api/v1/account/profile', body).expect(400);
      await bad({
        social_links: [{ platform: 'x', url: 'javascript:alert(1)' }],
      });
      await bad({
        social_links: Array.from({ length: 11 }, () => ({
          platform: 'a',
          url: 'https://a.io',
        })),
      });
      await bad({ target_band: 7.3 });
      await bad({ bio: 'x'.repeat(501) });
      await bad({ preferences: { notifications: { reminderTime: '25:00' } } });
      await bad({ preferences: { study: { cardsPerDay: 0 } } });
      await bad({ user_id: 1 });
    });

    it('keeps each account’s profile separate', async () => {
      const res = await request(http)
        .get('/api/v1/account/profile')
        .set(auth(otherToken))
        .expect(200);
      expect(res.body.data.bio).toBe('');
    });

    it('creates, lists, edits and deletes the student’s study plans; nobody else can touch them', async () => {
      const id = randomUUID();
      const body = {
        name: 'IELTS 7.0 — B1',
        form: { target_exam: 'IELTS' },
        plan: { months_needed: 3, monthly_plan: [{ theme: 'x' }] },
      };
      await put(`/api/v1/study-plans/${id}`, body).expect(200);
      await put(`/api/v1/study-plans/${id}`, {
        ...body,
        name: 'IELTS 7.0 — renamed',
      }).expect(200);

      const list = await request(http)
        .get('/api/v1/study-plans')
        .set(auth(token))
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).toMatchObject({
        id,
        name: 'IELTS 7.0 — renamed',
      });
      expect(list.body.data[0].plan.monthly_plan).toHaveLength(1);

      const rows = await dataSource.query<{ name: string }[]>(
        `SELECT name FROM study_plans WHERE id = $1`,
        [id],
      );
      expect(rows).toEqual([{ name: 'IELTS 7.0 — renamed' }]);

      await put(`/api/v1/study-plans/${id}`, body, otherToken).expect(409);
      await request(http)
        .delete(`/api/v1/study-plans/${id}`)
        .set(auth(otherToken))
        .expect(404);
      const other = await request(http)
        .get('/api/v1/study-plans')
        .set(auth(otherToken))
        .expect(200);
      expect(other.body.data).toEqual([]);
      await put('/api/v1/study-plans/not-a-uuid', body).expect(400);
      await put(`/api/v1/study-plans/${randomUUID()}`, {
        name: '',
        form: {},
        plan: {},
      }).expect(400);

      // one more stays, to prove it goes away with the account
      await put(`/api/v1/study-plans/${randomUUID()}`, body).expect(200);
      await request(http)
        .delete(`/api/v1/study-plans/${id}`)
        .set(auth(token))
        .expect(204);
      const after = await request(http)
        .get('/api/v1/study-plans')
        .set(auth(token))
        .expect(200);
      expect(after.body.data).toHaveLength(1);
    });

    it('exports everything held about the account, without the password hash', async () => {
      await request(http)
        .post('/api/v1/learning-sessions')
        .set(auth(token))
        .send({
          kind: 'quiz',
          mode_id: 'multiple-choice',
          mode_name: 'Multiple Choice',
          source: 'builtin',
          title: 'Multiple Choice',
          words: [{ term: 'door', meaning: 'cửa', is_correct: true }],
        })
        .expect(201);
      const res = await request(http)
        .get('/api/v1/account/export')
        .set(auth(token))
        .expect(200);
      const d = res.body.data;
      expect(d.account.email).toBe(email);
      expect(d.profile.bio).toBe('Learning English');
      expect(d.learningHistory[0].words[0].term).toBe('door');
      expect(d.studyPlans).toHaveLength(1);
      expect(JSON.stringify(d)).not.toMatch(/password|\$2[aby]\$/i);
    });

    it('changes the password: wrong or unchanged is a 400, then the old password and old sessions stop working', async () => {
      const change = (current: string, next: string, tk = token) =>
        put(
          '/api/v1/account/password',
          { current_password: current, new_password: next },
          tk,
        );
      await change('not-the-password', NEW_PW).expect(400);
      await change(PW, PW).expect(400);
      await change(PW, 'short').expect(400);

      const res = await change(PW, NEW_PW).expect(200);
      expect(res.body.data.access_token).toBeTruthy();
      expect(res.body.data.refresh_token).toBeTruthy();

      await signIn(email, PW).expect(401);
      await signIn(email, NEW_PW).expect(200);
      await request(http)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refresh })
        .expect(401); // the old session
      const next = await request(http)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: res.body.data.refresh_token })
        .expect(200);
      token = next.body.data.access_token;
    });

    it('deletes the account only with the right password; an administrator cannot delete theirs', async () => {
      const del = (password: string, tk = token) =>
        request(http)
          .delete('/api/v1/account')
          .set(auth(tk))
          .send({ password });
      await del('wrong').expect(400);
      await signIn(email, NEW_PW).expect(200); // still there

      await del(ADMIN_PASSWORD, adminToken).expect(403);

      await del(NEW_PW).expect(200);
      await signIn(email, NEW_PW).expect(401);
      for (const table of [
        'users',
        'user_profiles',
        'study_plans',
        'learning_sessions',
      ]) {
        const col = table === 'users' ? 'id' : 'user_id';
        const rows = await dataSource.query<{ n: number }[]>(
          `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${col} = $1`,
          [userId],
        );
        expect(rows[0].n).toBe(0);
      }
      // the other account is untouched
      await signIn(otherEmail, PW).expect(200);
    });
  });
});
