export type StatPeriod = 'week' | 'month' | 'year'

/** One bar of the activity chart: a day (week / month) or a calendar month (year). */
export interface StatActivityBucket {
  /** ISO date of the bucket's first day. */
  date: string
  /** Words reviewed in flashcard sessions. */
  flashcards: number
  /** Words practised in quiz games. */
  quizzes: number
  sessions: number
  accuracy: number | null
}

/** A student's own learning statistics, as the API computes them from their real activity. */
export interface MyStatistics {
  period: StatPeriod
  summary: {
    sessions: number
    flashcardSessions: number
    quizGames: number
    words: number
    accuracy: number | null
    minutes: number
    xpEarned: number
  }
  /** Change against the period before; null when there was nothing to compare with. */
  trends: {
    sessions: number | null
    words: number | null
    minutes: number | null
    /** In percentage points. */
    accuracy: number | null
  }
  activity: StatActivityBucket[]
  byMode: { modeId: string; sessions: number; words: number; accuracy: number | null }[]
  vocabulary: {
    learned: number
    practised: number
    weakWords: { term: string; meaning: string; missed: number; seen: number }[]
  }
  tests: {
    taken: number
    average: number | null
    recent: { title: string; score: number; total: number; at: string }[]
  }
  skills: { name: string; avgScore: number; attempts: number }[]
  /** ISO dates, within the last 28 days, on which the student studied. */
  activeDays: string[]
  hasHistory: boolean
}
