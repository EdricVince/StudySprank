import {
  StatisticsService,
  bucketsFor,
  weightedAccuracy,
} from './statistics.service';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-06T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * DAY);

interface Fixture {
  sessions?: Record<string, unknown>[];
  daily?: Record<string, unknown>[];
  vocab?: Record<string, unknown>[];
  weak?: Record<string, unknown>[];
  tests?: Record<string, unknown>[];
  exams?: Record<string, unknown>[];
}

const build = (f: Fixture = {}) => {
  const query = jest.fn((sql: string) => {
    if (
      sql.includes(
        'FROM learning_sessions\n          WHERE user_id = $1 AND created_at',
      )
    )
      return Promise.resolve(f.sessions ?? []);
    if (sql.includes('daily_activities')) return Promise.resolve(f.daily ?? []);
    if (sql.includes('HAVING')) return Promise.resolve(f.weak ?? []);
    if (sql.includes('AS learned'))
      return Promise.resolve(
        f.vocab ?? [{ learned: 0, practised: 0, sessions: 0 }],
      );
    if (sql.includes('test_submissions')) return Promise.resolve(f.tests ?? []);
    return Promise.resolve(f.exams ?? []);
  });
  return { service: new StatisticsService({ query } as never), query };
};

const session = (over: Record<string, unknown> = {}) => ({
  kind: 'quiz',
  mode_id: 'multiple-choice',
  total_items: 10,
  accuracy: 80,
  duration_seconds: 120,
  created_at: daysAgo(1),
  ...over,
});

describe('weightedAccuracy', () => {
  it('weights each session by its number of words and is null without words', () => {
    expect(
      weightedAccuracy([
        { accuracy: 100, total_items: 10 },
        { accuracy: 50, total_items: 30 },
      ]),
    ).toBe(63);
    expect(weightedAccuracy([])).toBeNull();
  });
});

describe('bucketsFor', () => {
  it('has one bucket per day for a week / month and per month for a year, oldest first', () => {
    const week = bucketsFor('week', NOW);
    expect(week).toHaveLength(7);
    expect(week[6].date).toBe('2026-11-06');
    expect(week[0].date).toBe('2026-10-31');
    expect(bucketsFor('month', NOW)).toHaveLength(30);
    const year = bucketsFor('year', NOW);
    expect(year).toHaveLength(12);
    expect(year[11].date).toBe('2026-11-01');
    expect(year[0].date).toBe('2025-12-01');
  });
});

describe('StatisticsService', () => {
  it('returns zeros and nulls (never invented numbers) for a student who has done nothing', async () => {
    const { service } = build();
    const r = await service.getMyStatistics(1, 'week', NOW);

    expect(r.summary).toMatchObject({
      sessions: 0,
      words: 0,
      accuracy: null,
      minutes: 0,
    });
    expect(r.trends).toEqual({
      sessions: null,
      words: null,
      minutes: null,
      accuracy: null,
    });
    expect(r.activity).toHaveLength(7);
    expect(
      r.activity.every((b) => b.sessions === 0 && b.accuracy === null),
    ).toBe(true);
    expect(r.byMode).toEqual([]);
    expect(r.tests).toEqual({ taken: 0, average: null, recent: [] });
    expect(r.skills).toEqual([]);
    expect(r.hasHistory).toBe(false);
  });

  it('adds up the period, compares it with the one before and splits words by flashcards / quizzes', async () => {
    const { service } = build({
      sessions: [
        session({
          kind: 'flashcard',
          mode_id: 'flashcards',
          total_items: 20,
          accuracy: 90,
          duration_seconds: 300,
          created_at: daysAgo(1),
        }),
        session({
          total_items: 10,
          accuracy: 50,
          duration_seconds: 120,
          created_at: daysAgo(1),
        }),
        session({
          total_items: 10,
          accuracy: 40,
          duration_seconds: 60,
          created_at: daysAgo(10),
        }), // the week before
      ],
    });
    const r = await service.getMyStatistics(1, 'week', NOW);

    expect(r.summary).toMatchObject({
      sessions: 2,
      flashcardSessions: 1,
      quizGames: 1,
      words: 30,
      minutes: 7,
    });
    expect(r.summary.accuracy).toBe(77); // (90·20 + 50·10) / 30
    // before: 1 session, 10 words, 1 minute, 40 % → +100 %, +200 %, +600 %, +37 points
    expect(r.trends).toEqual({
      sessions: 100,
      words: 200,
      minutes: 600,
      accuracy: 37,
    });

    const today = r.activity.find((b) => b.date === '2026-11-05')!;
    expect(today).toMatchObject({
      flashcards: 20,
      quizzes: 10,
      sessions: 2,
      accuracy: 77,
    });
  });

  it('groups the period by game mode, most played first', async () => {
    const { service } = build({
      sessions: [
        session({ mode_id: 'word-scramble', accuracy: 60 }),
        session({ mode_id: 'multiple-choice', accuracy: 100 }),
        session({ mode_id: 'multiple-choice', accuracy: 80 }),
      ],
    });
    const r = await service.getMyStatistics(1, 'week', NOW);
    expect(r.byMode.map((m) => [m.modeId, m.sessions, m.accuracy])).toEqual([
      ['multiple-choice', 2, 90],
      ['word-scramble', 1, 60],
    ]);
  });

  it('reports vocabulary, words to practise, class tests and exam skills', async () => {
    const { service } = build({
      sessions: [session()],
      vocab: [{ learned: 12, practised: 20, sessions: 3 }],
      weak: [{ term: 'door', meaning: 'cửa', missed: 3, seen: 4 }],
      tests: [
        { title: 'Unit 1', score: 3, total: 4, created_at: daysAgo(2) },
        { title: 'Unit 2', score: 1, total: 4, created_at: daysAgo(5) },
      ],
      exams: [
        {
          breakdown: [
            { section: 'Reading', correct: 3, total: 4 },
            { section: 'Listening Part 1', correct: 1, total: 4 },
          ],
        },
        { breakdown: [{ section: 'Reading', correct: 1, total: 4 }] },
      ],
    });
    const r = await service.getMyStatistics(1, 'week', NOW);

    expect(r.vocabulary).toEqual({
      learned: 12,
      practised: 20,
      weakWords: [{ term: 'door', meaning: 'cửa', missed: 3, seen: 4 }],
    });
    expect(r.tests.taken).toBe(2);
    expect(r.tests.average).toBe(50);
    expect(r.tests.recent[0].title).toBe('Unit 1');
    expect(r.skills).toEqual([
      { name: 'Reading', avgScore: 50, attempts: 2 },
      { name: 'Listening', avgScore: 25, attempts: 1 },
    ]);
    expect(r.hasHistory).toBe(true);
  });

  it('marks the days with any learning, from daily activity and from saved sessions', async () => {
    const { service } = build({
      sessions: [session({ created_at: daysAgo(1) })],
      daily: [
        { activity_date: '2026-11-03', xp_earned: 10, active: true },
        { activity_date: '2026-11-02', xp_earned: 0, active: false },
      ],
    });
    const r = await service.getMyStatistics(1, 'week', NOW);
    expect(r.activeDays).toEqual(['2026-11-03', '2026-11-05']);
  });
});
