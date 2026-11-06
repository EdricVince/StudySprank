export type SessionKind = 'flashcard' | 'quiz'
/** Where the practised words came from. */
export type SessionSource = 'deck' | 'vocab_set' | 'ai' | 'builtin'

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
