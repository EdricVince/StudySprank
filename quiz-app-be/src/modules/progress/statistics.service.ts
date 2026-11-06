import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { skillOf } from '../entrance-exam/skill-of';

const DAY_MS = 24 * 60 * 60 * 1000;

export const STAT_PERIODS = ['week', 'month', 'year'] as const;
export type StatPeriod = (typeof STAT_PERIODS)[number];
const PERIOD_DAYS: Record<StatPeriod, number> = {
  week: 7,
  month: 30,
  year: 365,
};
const YEAR_BUCKETS = 12;
const STREAK_CALENDAR_DAYS = 28;
const MAX_WEAK_WORDS = 8;
const MAX_RECENT_TESTS = 5;

interface SessionRow {
  kind: 'flashcard' | 'quiz';
  mode_id: string;
  total_items: number;
  accuracy: number;
  duration_seconds: number;
  created_at: Date;
}

export interface ActivityBucket {
  /** ISO date of the bucket's first day (the client formats it for the user's language). */
  date: string;
  /** Words reviewed in flashcard sessions. */
  flashcards: number;
  /** Words practised in quiz games. */
  quizzes: number;
  sessions: number;
  /** Average accuracy of the bucket's sessions, null when there was none. */
  accuracy: number | null;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayStart = (ms: number) => Date.parse(`${isoDay(ms)}T00:00:00Z`);
const at = (row: SessionRow) => new Date(row.created_at).getTime();

/** Accuracy of a set of sessions, each weighted by how many words it had. */
export function weightedAccuracy(
  rows: { accuracy: number; total_items: number }[],
): number | null {
  const words = rows.reduce((sum, r) => sum + r.total_items, 0);
  if (!words) return null;
  return Math.round(
    rows.reduce((sum, r) => sum + r.accuracy * r.total_items, 0) / words,
  );
}

/** Relative change in percent, or null when there is nothing before to compare with. */
const relativeChange = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

/** The chart's buckets: days for a week / month, calendar months for a year (UTC). */
export function bucketsFor(
  period: StatPeriod,
  now: number,
): { date: string; from: number; to: number }[] {
  if (period === 'year') {
    const ref = new Date(now);
    return Array.from({ length: YEAR_BUCKETS }, (_, i) => {
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
      return { date: isoDay(from), from, to };
    });
  }
  const days = PERIOD_DAYS[period];
  return Array.from({ length: days }, (_, i) => {
    const from = dayStart(now - (days - 1 - i) * DAY_MS);
    return { date: isoDay(from), from, to: from + DAY_MS };
  });
}

/**
 * A student's own learning statistics, computed only from what they really did: their flashcard
 * sessions and quiz games (word by word), class tests and IELTS mock exams. Nothing is estimated;
 * a trend with nothing to compare against is null.
 */
@Injectable()
export class StatisticsService {
  constructor(private readonly db: DataSource) {}

  async getMyStatistics(
    userId: number,
    period: StatPeriod,
    now: number = Date.now(),
  ) {
    const span = PERIOD_DAYS[period] * DAY_MS;
    const since = new Date(now - 2 * span);
    const streakSince = isoDay(now - (STREAK_CALENDAR_DAYS - 1) * DAY_MS);

    const [sessions, daily, vocab, weak, tests, exams] = await Promise.all([
      this.db.query<SessionRow[]>(
        `SELECT kind, mode_id, total_items, accuracy, duration_seconds, created_at
           FROM learning_sessions
          WHERE user_id = $1 AND created_at >= $2`,
        [userId, since],
      ),
      this.db.query<
        { activity_date: string; xp_earned: number; active: boolean }[]
      >(
        `SELECT activity_date, xp_earned,
                (xp_earned > 0 OR cards_studied > 0 OR quizzes_completed > 0) AS active
           FROM daily_activities
          WHERE user_id = $1 AND activity_date >= $2`,
        [userId, isoDay(now - 2 * span)],
      ),
      this.db.query<{ learned: number; practised: number; sessions: number }[]>(
        `SELECT (SELECT COUNT(*)::int FROM learning_sessions WHERE user_id = $1) AS sessions,
                COUNT(DISTINCT lower(w.term)) FILTER (WHERE w.is_correct = true)::int AS learned,
                COUNT(DISTINCT lower(w.term))::int AS practised
           FROM learning_session_words w
           JOIN learning_sessions s ON s.id = w.session_id
          WHERE s.user_id = $1 AND s.mode_id <> 'battle'`,
        [userId],
      ),
      // Words that were missed more often than known: still worth practising.
      this.db.query<
        { term: string; meaning: string; missed: number; seen: number }[]
      >(
        `SELECT lower(w.term) AS term, max(w.meaning) AS meaning,
                COUNT(*) FILTER (WHERE w.is_correct = false)::int AS missed,
                COUNT(*)::int AS seen
           FROM learning_session_words w
           JOIN learning_sessions s ON s.id = w.session_id
          WHERE s.user_id = $1 AND s.mode_id <> 'battle'
          GROUP BY lower(w.term)
         HAVING COUNT(*) FILTER (WHERE w.is_correct = false) > COUNT(*) FILTER (WHERE w.is_correct = true)
          ORDER BY missed DESC, seen DESC, term
          LIMIT ${MAX_WEAK_WORDS}`,
        [userId],
      ),
      this.db.query<
        { title: string; score: number; total: number; created_at: Date }[]
      >(
        `SELECT t.title, s.score, s.total, s.created_at
           FROM test_submissions s
           JOIN tests t ON t.id = s.test_id
          WHERE s.student_id = $1
          ORDER BY s.created_at DESC`,
        [userId],
      ),
      this.db.query<
        {
          breakdown:
            | { section: string; correct: number; total: number }[]
            | null;
        }[]
      >(
        `SELECT result->'breakdown' AS breakdown
           FROM exam_attempts
          WHERE user_id = $1 AND status = 'submitted' AND result IS NOT NULL`,
        [userId],
      ),
    ]);

    // ── This period against the one before it ────────────────────────────────
    const current = sessions.filter((r) => at(r) >= now - span);
    const previous = sessions.filter(
      (r) => at(r) >= now - 2 * span && at(r) < now - span,
    );
    const totals = (rows: SessionRow[]) => ({
      sessions: rows.length,
      words: rows.reduce((sum, r) => sum + r.total_items, 0),
      accuracy: weightedAccuracy(rows),
      minutes: Math.round(
        rows.reduce((sum, r) => sum + r.duration_seconds, 0) / 60,
      ),
    });
    const now_ = totals(current);
    const before = totals(previous);

    // ── Activity chart ───────────────────────────────────────────────────────
    const activity: ActivityBucket[] = bucketsFor(period, now).map((b) => {
      const rows = sessions.filter((r) => at(r) >= b.from && at(r) < b.to);
      const words = (kind: SessionRow['kind']) =>
        rows
          .filter((r) => r.kind === kind)
          .reduce((sum, r) => sum + r.total_items, 0);
      return {
        date: b.date,
        flashcards: words('flashcard'),
        quizzes: words('quiz'),
        sessions: rows.length,
        accuracy: weightedAccuracy(rows),
      };
    });

    // ── Accuracy by game / study mode ────────────────────────────────────────
    const byModeMap = new Map<string, SessionRow[]>();
    for (const r of current) {
      byModeMap.set(r.mode_id, [...(byModeMap.get(r.mode_id) ?? []), r]);
    }
    const byMode = [...byModeMap.entries()]
      .map(([modeId, rows]) => ({
        modeId,
        sessions: rows.length,
        words: rows.reduce((sum, r) => sum + r.total_items, 0),
        accuracy: weightedAccuracy(rows),
      }))
      .sort(
        (a, b) => b.sessions - a.sessions || a.modeId.localeCompare(b.modeId),
      );

    // ── Class tests ──────────────────────────────────────────────────────────
    const pct = (t: { score: number; total: number }) =>
      t.total > 0 ? (t.score / t.total) * 100 : 0;

    // ── IELTS mock exams, by skill ───────────────────────────────────────────
    const skills = new Map<
      string,
      { correct: number; total: number; attempts: number }
    >();
    for (const exam of exams) {
      for (const part of exam.breakdown ?? []) {
        const key = skillOf(part.section);
        const cell = skills.get(key) ?? { correct: 0, total: 0, attempts: 0 };
        cell.correct += part.correct;
        cell.total += part.total;
        cell.attempts += 1;
        skills.set(key, cell);
      }
    }

    // ── Days with any learning (streak calendar) ─────────────────────────────
    const activeDays = new Set<string>(
      daily
        .filter((d) => d.active && d.activity_date >= streakSince)
        .map((d) => d.activity_date),
    );
    for (const r of sessions) {
      if (isoDay(at(r)) >= streakSince) activeDays.add(isoDay(at(r)));
    }

    const lifetime = vocab[0] ?? { learned: 0, practised: 0, sessions: 0 };
    return {
      period,
      summary: {
        sessions: now_.sessions,
        flashcardSessions: current.filter((r) => r.kind === 'flashcard').length,
        quizGames: current.filter((r) => r.kind === 'quiz').length,
        words: now_.words,
        accuracy: now_.accuracy,
        minutes: now_.minutes,
        xpEarned: daily
          .filter((d) => d.activity_date >= isoDay(now - span))
          .reduce((sum, d) => sum + d.xp_earned, 0),
      },
      trends: {
        sessions: relativeChange(now_.sessions, before.sessions),
        words: relativeChange(now_.words, before.words),
        minutes: relativeChange(now_.minutes, before.minutes),
        accuracy:
          now_.accuracy !== null && before.accuracy !== null
            ? now_.accuracy - before.accuracy
            : null,
      },
      activity,
      byMode,
      vocabulary: {
        learned: lifetime.learned,
        practised: lifetime.practised,
        weakWords: weak,
      },
      tests: {
        taken: tests.length,
        average: tests.length
          ? Math.round(tests.reduce((sum, t) => sum + pct(t), 0) / tests.length)
          : null,
        recent: tests.slice(0, MAX_RECENT_TESTS).map((t) => ({
          title: t.title,
          score: t.score,
          total: t.total,
          at: new Date(t.created_at).toISOString(),
        })),
      },
      skills: [...skills.entries()].map(([name, c]) => ({
        name,
        avgScore: c.total ? Math.round((c.correct / c.total) * 100) : 0,
        attempts: c.attempts,
      })),
      activeDays: [...activeDays].sort(),
      hasHistory: lifetime.sessions > 0,
    };
  }
}
