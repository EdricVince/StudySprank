import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Class } from './entities/class.entity';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { UserProgress } from '../progress/entities/user-progress.entity';
import { User } from '../users/entities/user.entity';
import { skillOf } from '../entrance-exam/skill-of';

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = { week: 7, month: 30, year: 365 } as const;
type Period = keyof typeof PERIOD_DAYS;
const PERIODS = Object.keys(PERIOD_DAYS) as Period[];

/** A student with no activity for this long, or averaging below the pass mark, needs attention. */
const INACTIVE_AFTER_DAYS = 14;
const STRUGGLING_BELOW_PERCENT = 50;
const MAX_TOP_STUDENTS = 5;
const MAX_STRUGGLING_STUDENTS = 6;
const MAX_TESTS_LISTED = 6;
const MONTH_BUCKETS = 5;
/** How far back the learning-activity figures of the student roster look. */
const ROSTER_WINDOW_DAYS = 30;
const MAX_ROSTER = 200;
const YEAR_BUCKETS = 12;

interface SubmissionRow {
  student_id: number;
  test_id: number;
  title: string;
  class_id: number | null;
  score: number;
  total: number;
  created_at: Date;
}

/** A flashcard session or quiz game of a student (what they practised, not what the teacher set). */
interface SessionRow {
  user_id: number;
  created_at: Date;
  accuracy: number;
  total_items: number;
}

interface ExamRow {
  user_id: number;
  breakdown: { section: string; correct: number; total: number }[] | null;
}

export interface Bucket {
  /** ISO date of the bucket's first day (the client formats it for the user's language). */
  date: string;
  value: number;
}

const percent = (score: number, total: number) =>
  total > 0 ? (score / total) * 100 : 0;

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Relative change in percent, or null when there is nothing to compare with. */
const relativeChange = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

/**
 * Teacher analytics, computed only from data that really exists: the submissions of the teacher's
 * own tests, the students' progress records and their submitted IELTS mock exams. Anything the
 * database cannot tell us (e.g. a trend with no previous period) is returned as null, never guessed.
 *
 * Only students who are *currently enrolled* in the teacher's classes count: someone who left a class,
 * or never joined it, does not appear in any figure. With a `classId` the whole dashboard narrows
 * to that one class (and to the students who joined it).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Class) private classRepo: Repository<Class>,
    @InjectRepository(ClassEnrollment)
    private enrollRepo: Repository<ClassEnrollment>,
    @InjectRepository(UserProgress)
    private progressRepo: Repository<UserProgress>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  /** How many different students are enrolled in the teacher's classes (one student in two classes counts once). */
  async countDistinctStudents(teacherId: number): Promise<number> {
    const rows = await this.enrollRepo.query<{ total: number }[]>(
      `SELECT COUNT(DISTINCT e.student_id)::int AS total
         FROM class_enrollments e
         JOIN classes c ON c.id = e.class_id
        WHERE c.teacher_id = $1`,
      [teacherId],
    );
    return rows[0]?.total ?? 0;
  }

  async getTeacherAnalytics(teacherId: number, classId?: number) {
    const now = Date.now();
    const classes = await this.classRepo.find({
      where: { teacher_id: teacherId },
    });
    if (classId !== undefined && !classes.some((c) => c.id === classId)) {
      throw new ForbiddenException('Not your class');
    }
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const scope =
      classId === undefined ? classes : classes.filter((c) => c.id === classId);
    const scopeIds = scope.map((c) => c.id);

    const allEnrollments: ClassEnrollment[] = classes.length
      ? await this.enrollRepo.find({
          where: { class_id: In(classes.map((c) => c.id)) },
        })
      : [];
    // The students who joined the class(es) being looked at — nobody else is analysed.
    const enrollments = allEnrollments.filter((e) =>
      scopeIds.includes(e.class_id),
    );
    const classesOfStudent = new Map<number, number[]>();
    for (const e of enrollments) {
      classesOfStudent.set(e.student_id, [
        ...(classesOfStudent.get(e.student_id) ?? []),
        e.class_id,
      ]);
    }
    const enrolledIds = [...classesOfStudent.keys()];

    const joined = new Set(
      enrollments.map((e) => `${e.class_id}:${e.student_id}`),
    );
    const enrolledSet = new Set(enrolledIds);
    const allSubmissions = await this.classRepo.query<SubmissionRow[]>(
      `SELECT s.student_id, s.test_id, t.title, t.class_id, s.score, s.total, s.created_at
         FROM test_submissions s
         JOIN tests t ON t.id = s.test_id
        WHERE t.teacher_id = $1`,
      [teacherId],
    );
    // A result counts only while its student is in the class the test belongs to
    // (a test for no particular class counts for any student who joined one of the classes looked at).
    const submissions = allSubmissions.filter((s) =>
      s.class_id === null
        ? enrolledSet.has(s.student_id)
        : joined.has(`${s.class_id}:${s.student_id}`),
    );
    const at = (s: SubmissionRow) => new Date(s.created_at).getTime();

    // What the enrolled students practised themselves: flashcard sessions and quiz games.
    const sessionRows: SessionRow[] = enrolledIds.length
      ? await this.classRepo.query<SessionRow[]>(
          `SELECT user_id, created_at, accuracy, total_items
             FROM learning_sessions
            WHERE user_id = ANY($1::int[]) AND created_at >= now() - interval '365 days'`,
          [enrolledIds],
        )
      : [];
    const sessions = sessionRows.filter((r) => enrolledSet.has(r.user_id));
    const sessionsByStudent = new Map<number, SessionRow[]>();
    for (const row of sessions) {
      sessionsByStudent.set(row.user_id, [
        ...(sessionsByStudent.get(row.user_id) ?? []),
        row,
      ]);
    }
    const sessionAt = (row: SessionRow) => new Date(row.created_at).getTime();

    // Only the students who joined are analysed.
    const poolIds = enrolledIds;
    const progressList: UserProgress[] = poolIds.length
      ? await this.progressRepo.find({ where: { user_id: In(poolIds) } })
      : [];
    const users: User[] = poolIds.length
      ? await this.userRepo.find({ where: { id: In(poolIds) } })
      : [];
    const progressMap = new Map(progressList.map((p) => [p.user_id, p]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const nameOf = (id: number) =>
      userMap.get(id)?.name ?? userMap.get(id)?.email ?? `#${id}`;
    // A student's latest sign of life: their progress record or their most recent test submission.
    const lastActivity = (id: number): string | null => {
      const days = [
        progressMap.get(id)?.last_activity_date ?? null,
        ...(submissionsByStudent.get(id) ?? []).map((s) => isoDay(at(s))),
        ...(sessionsByStudent.get(id) ?? []).map((r) => isoDay(sessionAt(r))),
      ].filter((d): d is string => d !== null);
      return days.length ? days.reduce((a, b) => (a > b ? a : b)) : null;
    };

    // The class a student joined most recently (shown next to their name).
    const latestClassName = (studentId: number): string | null => {
      const joined = enrollments
        .filter((e) => e.student_id === studentId)
        .sort(
          (a, b) =>
            new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime(),
        )[0];
      return joined ? (classMap.get(joined.class_id)?.name ?? null) : null;
    };

    const submissionsByStudent = new Map<number, SubmissionRow[]>();
    for (const s of submissions) {
      submissionsByStudent.set(s.student_id, [
        ...(submissionsByStudent.get(s.student_id) ?? []),
        s,
      ]);
    }
    const averageOf = (rows: SubmissionRow[]) =>
      mean(rows.map((s) => percent(s.score, s.total)));

    // ── Activity: distinct students who took a test, practised or were last active in each bucket ──
    const activeBetween = (fromMs: number, toMs: number) => {
      const active = new Set<number>();
      for (const s of submissions) {
        if (at(s) >= fromMs && at(s) < toMs) active.add(s.student_id);
      }
      for (const r of sessions) {
        if (sessionAt(r) >= fromMs && sessionAt(r) < toMs)
          active.add(r.user_id);
      }
      for (const id of poolIds) {
        const last = lastActivity(id);
        const lastMs = last ? Date.parse(`${last}T00:00:00Z`) : NaN;
        if (lastMs >= fromMs && lastMs < toMs) active.add(id);
      }
      return active.size;
    };

    // ── KPIs per period, with a real comparison against the period before ────
    const kpiData = {} as Record<
      Period,
      {
        students: number;
        quizzes: number;
        avgScore: number;
        trends: (number | null)[];
      }
    >;
    for (const period of PERIODS) {
      const span = PERIOD_DAYS[period] * DAY_MS;
      const current = submissions.filter((s) => at(s) >= now - span);
      const previous = submissions.filter(
        (s) => at(s) >= now - 2 * span && at(s) < now - span,
      );
      const avgNow = averageOf(current);
      kpiData[period] = {
        // Progress only keeps each student's latest activity day, so there is no history to compare.
        students: activeBetween(now - span, now + DAY_MS),
        quizzes: current.length,
        avgScore: Math.round(avgNow),
        trends: [
          null,
          relativeChange(current.length, previous.length),
          current.length && previous.length
            ? Math.round(avgNow - averageOf(previous))
            : null,
        ],
      };
    }

    const dayStart = (ms: number) => Date.parse(`${isoDay(ms)}T00:00:00Z`);
    const activityDataMap: Record<Period, Bucket[]> = {
      week: Array.from({ length: 7 }, (_, i) => {
        const from = dayStart(now - (6 - i) * DAY_MS);
        return {
          date: isoDay(from),
          value: activeBetween(from, from + DAY_MS),
        };
      }),
      month: Array.from({ length: MONTH_BUCKETS }, (_, i) => {
        const from = dayStart(now) - (MONTH_BUCKETS - 1 - i) * 7 * DAY_MS;
        return {
          date: isoDay(from),
          value: activeBetween(from, from + 7 * DAY_MS),
        };
      }),
      year: Array.from({ length: YEAR_BUCKETS }, (_, i) => {
        const ref = new Date(now);
        const from = Date.UTC(
          ref.getUTCFullYear(),
          ref.getUTCMonth() - (YEAR_BUCKETS - 1 - i),
          1,
        );
        const to = Date.UTC(
          ref.getUTCFullYear(),
          ref.getUTCMonth() - (YEAR_BUCKETS - 2 - i),
          1,
        );
        return { date: isoDay(from), value: activeBetween(from, to) };
      }),
    };

    // ── Average test score per class (null while a class has no submissions) ──
    const classScores = scope.map((cls) => {
      const rows = submissions.filter((s) => s.class_id === cls.id);
      return {
        name: cls.name,
        score: rows.length ? Math.round(averageOf(rows)) : null,
        students: enrolments(enrollments, cls.id),
      };
    });

    // ── Top students by their average test score ──────────────────────────────
    const topStudents = [...submissionsByStudent.entries()]
      .map(([id, rows]) => ({
        id,
        name: nameOf(id),
        class: latestClassName(id),
        score: Math.round(averageOf(rows)),
        quizzes: rows.length,
      }))
      .sort((a, b) => b.score - a.score || b.quizzes - a.quizzes)
      .slice(0, MAX_TOP_STUDENTS);

    // ── How each test is doing ────────────────────────────────────────────────
    const byTest = new Map<number, SubmissionRow[]>();
    for (const s of submissions) {
      byTest.set(s.test_id, [...(byTest.get(s.test_id) ?? []), s]);
    }
    const testScores = [...byTest.entries()]
      .map(([id, rows]) => ({
        id,
        title: rows[0].title,
        class: rows[0].class_id
          ? (classMap.get(rows[0].class_id)?.name ?? null)
          : null,
        avg: Math.round(averageOf(rows)),
        count: rows.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_TESTS_LISTED);

    // ── Students needing attention: a low test average or gone quiet ──────────
    const quietSince = isoDay(now - INACTIVE_AFTER_DAYS * DAY_MS);
    const needsAttention = (id: number) => {
      const rows = submissionsByStudent.get(id) ?? [];
      const avg = rows.length ? Math.round(averageOf(rows)) : null;
      const last = lastActivity(id);
      const isQuiet = !last || last < quietSince;
      const isLow = avg !== null && avg < STRUGGLING_BELOW_PERCENT;
      return { avg, last, flagged: isQuiet || isLow, rows };
    };
    const strugglingStudents = enrolledIds
      .map((id) => {
        const { avg, last, flagged, rows } = needsAttention(id);
        if (!flagged) return null;
        return {
          id,
          name: nameOf(id),
          class: latestClassName(id),
          score: avg,
          quizzes: rows.length,
          lastActiveDate: last,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => (a.score ?? 101) - (b.score ?? 101))
      .slice(0, MAX_STRUGGLING_STUDENTS);

    // ── Skills: section results of the students' submitted IELTS mock exams ───
    const exams: ExamRow[] = enrolledIds.length
      ? await this.classRepo.query<ExamRow[]>(
          `SELECT user_id, result->'breakdown' AS breakdown
             FROM exam_attempts
            WHERE status = 'submitted' AND result IS NOT NULL AND user_id = ANY($1::int[])`,
          [enrolledIds],
        )
      : [];
    const skills = new Map<
      string,
      {
        correct: number;
        total: number;
        attempts: number;
        perClass: Map<number, { correct: number; total: number }>;
      }
    >();
    for (const exam of exams) {
      for (const part of exam.breakdown ?? []) {
        const skill = skills.get(skillOf(part.section)) ?? {
          correct: 0,
          total: 0,
          attempts: 0,
          perClass: new Map<number, { correct: number; total: number }>(),
        };
        skill.correct += part.correct;
        skill.total += part.total;
        skill.attempts += 1;
        for (const classId of classesOfStudent.get(exam.user_id) ?? []) {
          const cell = skill.perClass.get(classId) ?? { correct: 0, total: 0 };
          cell.correct += part.correct;
          cell.total += part.total;
          skill.perClass.set(classId, cell);
        }
        skills.set(skillOf(part.section), skill);
      }
    }
    const skillsData = [...skills.entries()].map(([name, skill]) => ({
      name,
      avgScore: Math.round(percent(skill.correct, skill.total)),
      attempts: skill.attempts,
      classes: [...skill.perClass.entries()].map(([classId, cell]) => ({
        name: classMap.get(classId)?.name ?? `#${classId}`,
        score: Math.round(percent(cell.correct, cell.total)),
      })),
    }));

    // ── Progress of every student who joined: what they did, how they scored, when they were last seen ──
    const windowStart = now - ROSTER_WINDOW_DAYS * DAY_MS;
    const roster = enrolledIds
      .map((id) => {
        const { avg, last, flagged, rows } = needsAttention(id);
        const recent = (sessionsByStudent.get(id) ?? []).filter(
          (r) => sessionAt(r) >= windowStart,
        );
        const progress = progressMap.get(id);
        return {
          id,
          name: nameOf(id),
          email: userMap.get(id)?.email ?? '',
          classes: (classesOfStudent.get(id) ?? [])
            .map((cid) => classMap.get(cid)?.name)
            .filter((n): n is string => !!n),
          level: progress?.level ?? 1,
          xp: progress?.xp ?? 0,
          streak: progress?.streak_count ?? 0,
          lastActiveDate: last,
          tests: rows.length,
          avgScore: avg,
          sessions: recent.length,
          words: recent.reduce((sum, r) => sum + r.total_items, 0),
          accuracy: recent.length
            ? Math.round(mean(recent.map((r) => r.accuracy)))
            : null,
          needsAttention: flagged,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_ROSTER);

    return {
      selectedClassId: classId ?? null,
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        students: enrolments(allEnrollments, c.id),
      })),
      kpiData,
      activityDataMap,
      classScores,
      topStudents,
      testScores,
      strugglingStudents,
      skillsData,
      students: roster,
      studentsTotal: enrolledIds.length,
    };
  }
}

const enrolments = (all: ClassEnrollment[], classId: number) =>
  all.filter((e) => e.class_id === classId).length;
