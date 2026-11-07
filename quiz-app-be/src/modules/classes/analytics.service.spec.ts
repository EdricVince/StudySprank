import { ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const dayString = (n: number) => daysAgo(n).toISOString().slice(0, 10);

interface Fixture {
  classes?: { id: number; name: string }[];
  enrollments?: { class_id: number; student_id: number; joined_at: Date }[];
  submissions?: Record<string, unknown>[];
  exams?: Record<string, unknown>[];
  progress?: { user_id: number; last_activity_date: string | null }[];
  users?: { id: number; name: string | null; email: string }[];
  sessions?: Record<string, unknown>[];
}

const build = (f: Fixture) => {
  const classRepo = {
    find: jest.fn().mockResolvedValue(f.classes ?? []),
    query: jest.fn((sql: string) =>
      Promise.resolve(
        sql.includes('test_submissions')
          ? (f.submissions ?? [])
          : sql.includes('learning_sessions')
            ? (f.sessions ?? [])
            : (f.exams ?? []),
      ),
    ),
  };
  const enrollRepo = { find: jest.fn().mockResolvedValue(f.enrollments ?? []) };
  const progressRepo = { find: jest.fn().mockResolvedValue(f.progress ?? []) };
  const userRepo = { find: jest.fn().mockResolvedValue(f.users ?? []) };
  const service = new AnalyticsService(
    classRepo as never,
    enrollRepo as never,
    progressRepo as never,
    userRepo as never,
  );
  return { service, classRepo };
};

const sub = (over: Record<string, unknown>) => ({
  student_id: 1,
  test_id: 10,
  title: 'Reading 1',
  class_id: 1,
  score: 3,
  total: 4,
  created_at: daysAgo(1),
  ...over,
});

describe('AnalyticsService', () => {
  it('returns empty lists and null trends for a teacher with no data', async () => {
    const { service } = build({});
    const r = await service.getTeacherAnalytics(1);
    expect(r.kpiData.week).toEqual({
      students: 0,
      quizzes: 0,
      avgScore: 0,
      trends: [null, null, null],
    });
    expect(r.classScores).toEqual([]);
    expect(r.topStudents).toEqual([]);
    expect(r.testScores).toEqual([]);
    expect(r.strugglingStudents).toEqual([]);
    expect(r.skillsData).toEqual([]);
    expect(r.activityDataMap.week).toHaveLength(7);
    expect(r.activityDataMap.year).toHaveLength(12);
  });

  it('computes KPIs, class scores and the trend from real submissions', async () => {
    const { service } = build({
      classes: [
        { id: 1, name: 'Class A' },
        { id: 2, name: 'Class B' },
      ],
      enrollments: [
        { class_id: 1, student_id: 1, joined_at: daysAgo(30) },
        { class_id: 1, student_id: 2, joined_at: daysAgo(30) },
      ],
      submissions: [
        sub({ student_id: 1, score: 4, total: 4 }), // 100 %, this week
        sub({ student_id: 2, score: 2, total: 4 }), // 50 %, this week
        sub({ student_id: 1, score: 1, total: 4, created_at: daysAgo(9) }), // last week
      ],
      users: [
        { id: 1, name: 'An', email: 'an@x.com' },
        { id: 2, name: null, email: 'binh@x.com' },
      ],
    });
    const r = await service.getTeacherAnalytics(1);

    // a test submission counts as activity even when the progress record has no date
    expect(r.kpiData.week.students).toBe(2);
    expect(r.kpiData.week.quizzes).toBe(2);
    expect(r.kpiData.week.avgScore).toBe(75);
    // 2 submissions now vs 1 before = +100 %; average 75 % vs 25 % = +50 points
    expect(r.kpiData.week.trends).toEqual([null, 100, 50]);
    expect(r.classScores).toEqual([
      { name: 'Class A', score: 58, students: 2 },
      { name: 'Class B', score: null, students: 0 },
    ]);
    expect(r.topStudents.map((s) => [s.name, s.score, s.quizzes])).toEqual([
      ['An', 63, 2],
      ['binh@x.com', 50, 1],
    ]);
    expect(r.testScores).toEqual([
      { id: 10, title: 'Reading 1', class: 'Class A', avg: 58, count: 3 },
    ]);
  });

  it('flags students with a low average or no recent activity, lowest first', async () => {
    const { service } = build({
      classes: [{ id: 1, name: 'Class A' }],
      enrollments: [1, 2, 3].map((id) => ({
        class_id: 1,
        student_id: id,
        joined_at: daysAgo(40),
      })),
      submissions: [
        sub({ student_id: 1, score: 1, total: 10 }), // 10 %: low
        sub({ student_id: 2, score: 9, total: 10 }), // 90 %: fine
        sub({ student_id: 3, score: 9, total: 10, created_at: daysAgo(30) }),
      ],
      progress: [
        { user_id: 1, last_activity_date: dayString(1) },
        { user_id: 2, last_activity_date: dayString(1) }, // active
        { user_id: 3, last_activity_date: dayString(30) }, // quiet
      ],
      users: [1, 2, 3].map((id) => ({
        id,
        name: `S${id}`,
        email: `s${id}@x.com`,
      })),
    });
    const r = await service.getTeacherAnalytics(1);
    expect(r.strugglingStudents.map((s) => [s.name, s.score])).toEqual([
      ['S1', 10],
      ['S3', 90],
    ]);
    expect(r.strugglingStudents[1].lastActiveDate).toBe(dayString(30));
  });

  it('reports a student who never did anything with null score and date', async () => {
    const { service } = build({
      classes: [{ id: 1, name: 'Class A' }],
      enrollments: [{ class_id: 1, student_id: 5, joined_at: daysAgo(3) }],
      users: [{ id: 5, name: 'New', email: 'new@x.com' }],
    });
    const r = await service.getTeacherAnalytics(1);
    expect(r.strugglingStudents).toEqual([
      {
        id: 5,
        name: 'New',
        class: 'Class A',
        score: null,
        quizzes: 0,
        lastActiveDate: null,
      },
    ]);
  });

  it('averages exam sections across the teacher’s students, per class', async () => {
    const { service } = build({
      classes: [{ id: 1, name: 'Class A' }],
      enrollments: [1, 2].map((id) => ({
        class_id: 1,
        student_id: id,
        joined_at: daysAgo(10),
      })),
      exams: [
        {
          user_id: 1,
          breakdown: [{ section: 'Reading', correct: 3, total: 4 }],
        },
        {
          user_id: 2,
          breakdown: [{ section: 'Reading', correct: 1, total: 4 }],
        },
      ],
    });
    const r = await service.getTeacherAnalytics(1);
    expect(r.skillsData).toEqual([
      {
        name: 'Reading',
        avgScore: 50,
        attempts: 2,
        classes: [{ name: 'Class A', score: 50 }],
      },
    ]);
  });
  it('groups exam parts such as "Listening Part 1" under their skill', async () => {
    const { service } = build({
      classes: [{ id: 1, name: 'Class A' }],
      enrollments: [{ class_id: 1, student_id: 1, joined_at: daysAgo(10) }],
      exams: [
        {
          user_id: 1,
          breakdown: [
            { section: 'Listening Part 1', correct: 1, total: 4 },
            { section: 'Listening Part 2', correct: 3, total: 4 },
            { section: 'Reading', correct: 2, total: 4 },
          ],
        },
      ],
    });
    const r = await service.getTeacherAnalytics(1);
    // one exam is one attempt of a skill, however many parts of it there are
    expect(r.skillsData.map((s) => [s.name, s.avgScore, s.attempts])).toEqual([
      ['Listening', 50, 1],
      ['Reading', 50, 1],
    ]);
  });

  describe('only students who joined the class are analysed', () => {
    const base = {
      classes: [
        { id: 1, name: 'Class A' },
        { id: 2, name: 'Class B' },
      ],
      enrollments: [
        { class_id: 1, student_id: 1, joined_at: daysAgo(20) },
        { class_id: 2, student_id: 2, joined_at: daysAgo(20) },
      ],
      users: [
        { id: 1, name: 'An', email: 'an@x.com' },
        { id: 2, name: 'Binh', email: 'binh@x.com' },
        { id: 3, name: 'Left', email: 'left@x.com' },
      ],
    };

    it('ignores results of students who left the class or never joined it', async () => {
      const { service } = build({
        ...base,
        submissions: [
          sub({ student_id: 1, class_id: 1, score: 4, total: 4 }), // joined
          sub({ student_id: 3, class_id: 1, score: 4, total: 4 }), // left class 1 (no enrolment)
          sub({ student_id: 1, class_id: 2, score: 4, total: 4 }), // not a member of class 2
        ],
      });
      const r = await service.getTeacherAnalytics(1);

      expect(r.kpiData.week.quizzes).toBe(1);
      expect(r.topStudents.map((s) => s.name)).toEqual(['An']);
      expect(r.testScores[0].count).toBe(1);
      expect(r.students.map((s) => s.name)).toEqual(['An', 'Binh']);
      expect(r.studentsTotal).toBe(2);
    });

    it('does not count practice of students who are not enrolled', async () => {
      const { service } = build({
        ...base,
        sessions: [
          { user_id: 1, created_at: daysAgo(1), accuracy: 80, total_items: 10 },
          {
            user_id: 3,
            created_at: daysAgo(1),
            accuracy: 100,
            total_items: 50,
          },
        ],
      });
      const r = await service.getTeacherAnalytics(1);
      expect(r.kpiData.week.students).toBe(1);
      expect(r.students.find((s) => s.id === 3)).toBeUndefined();
    });

    it('narrows everything to one class when a class is chosen', async () => {
      const { service } = build({
        ...base,
        submissions: [
          sub({ student_id: 1, class_id: 1, score: 4, total: 4 }),
          sub({ student_id: 2, class_id: 2, score: 2, total: 4 }),
        ],
      });
      const r = await service.getTeacherAnalytics(1, 2);

      expect(r.selectedClassId).toBe(2);
      expect(r.kpiData.week.quizzes).toBe(1);
      expect(r.kpiData.week.avgScore).toBe(50);
      expect(r.classScores.map((c) => c.name)).toEqual(['Class B']);
      expect(r.students.map((s) => s.name)).toEqual(['Binh']);
      // the selector still lists every class of the teacher
      expect(r.classes.map((c) => [c.id, c.students])).toEqual([
        [1, 1],
        [2, 1],
      ]);
    });

    it('refuses a class that belongs to another teacher (403)', async () => {
      const { service } = build(base);
      await expect(service.getTeacherAnalytics(1, 99)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('gives each joined student a progress row with tests, practice and level', async () => {
      const { service } = build({
        ...base,
        submissions: [sub({ student_id: 1, class_id: 1, score: 3, total: 4 })],
        sessions: [
          { user_id: 1, created_at: daysAgo(2), accuracy: 60, total_items: 10 },
          { user_id: 1, created_at: daysAgo(3), accuracy: 80, total_items: 5 },
          {
            user_id: 1,
            created_at: daysAgo(90),
            accuracy: 10,
            total_items: 99,
          }, // too old for the 30-day window
        ],
        progress: [{ user_id: 1, last_activity_date: dayString(2) }],
      });
      const r = await service.getTeacherAnalytics(1);
      const an = r.students.find((s) => s.id === 1)!;

      expect(an).toMatchObject({
        name: 'An',
        classes: ['Class A'],
        tests: 1,
        avgScore: 75,
        sessions: 2,
        words: 15,
        accuracy: 70,
        needsAttention: false,
      });
      const binh = r.students.find((s) => s.id === 2)!;
      expect(binh).toMatchObject({
        tests: 0,
        avgScore: null,
        sessions: 0,
        accuracy: null,
        needsAttention: true,
      });
    });
  });
});
