export type SessionKind = 'flashcard' | 'quiz'
/** Where the practised words came from. */
export type SessionSource = 'deck' | 'vocab_set' | 'ai' | 'builtin' | 'review'

/** One word practised in a session. `isCorrect` is null when it was not rated. */
export interface SessionWord {
  term: string
  meaning: string
  example?: string | null
  isCorrect?: boolean | null
}

/** What the app sends when a flashcard session or quiz game ends. */
export interface NewLearningSession {
  kind: SessionKind
  modeId: string
  modeName: string
  source: SessionSource
  title: string
  deckId?: number
  vocabSetId?: number
  learningLang: string
  meaningLang: string
  score?: number
  xpEarned?: number
  durationSeconds?: number
  words: SessionWord[]
}

/** A saved session as the API returns it (snake_case, words only on the detail call). */
export interface LearningSessionData {
  id: number
  kind: SessionKind
  mode_id: string
  mode_name: string
  source: SessionSource
  title: string
  deck_id: number | null
  vocab_set_id: number | null
  learning_lang: string
  meaning_lang: string
  total_items: number
  correct_items: number
  accuracy: number
  score: number
  xp_earned: number
  duration_seconds: number
  created_at: string
  words?: {
    id: number
    position: number
    term: string
    meaning: string
    example: string | null
    is_correct: boolean | null
  }[]
}

export interface LearningSessionPageData {
  items: LearningSessionData[]
  total: number
}

export type VocabularyStatus = 'learned' | 'weak'

/** One word the student has practised, merged over every time it came up. */
export interface VocabularyEntryData {
  term: string
  meaning: string
  example: string | null
  seen: number
  correct: number
  missed: number
  last_seen_at: string
  status: 'weak' | 'learned' | 'unrated'
}

export interface VocabularyPageData {
  items: VocabularyEntryData[]
  /** Matches of the current filter and search. */
  total: number
  /** Size of the whole list, whatever the filter. */
  summary: { total: number; learned: number; weak: number }
}
