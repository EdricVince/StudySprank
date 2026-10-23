// Shared types for teacher-authored content (lessons + vocabulary sets).

export interface VocabWordData {
  term: string
  definition: string
  example: string
}

export interface LessonContentData {
  reading?: string
  vocabulary: VocabWordData[]
  quiz: { question: string; options: string[]; correct: number; explanation: string }[]
  comprehension: { question: string; answer: string }[]
}

export interface LessonData {
  id: number
  teacher_id: number
  class_id: number | null
  title: string
  description: string | null
  category: string
  difficulty: string
  content?: LessonContentData
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface VocabSetData {
  id: number
  teacher_id: number
  class_id: number | null
  name: string
  language: string
  level: string
  words: VocabWordData[]
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface TeacherClassData {
  id: number
  name: string
  class_code: string
  student_count?: number
}

// Student-created flashcard decks (shareable to everyone via is_public).
export interface DeckCardData {
  term: string
  definition: string
  example?: string
  image?: string
  audio?: string
}

export interface FlashcardDeckData {
  id: number
  owner_id: number
  owner_role?: number // 1=student, 2=teacher, 3=admin (from the list endpoint)
  owner_name?: string | null
  title: string
  description: string | null
  category: string
  cards: DeckCardData[]
  is_public: boolean
  created_at: string
  updated_at: string
}

// Spaced repetition (SM-2) — GET /flashcard-decks/:id/due
export interface DueCardData extends DeckCardData {
  card_key: string
  reason: 'new' | 'due'
  due_at: string | null
  interval_days: number
  repetitions: number
  last_quality: number | null
  last_reviewed_at: string | null
}

export interface DueCardsData {
  deck_id: number
  total_cards: number
  due_count: number
  new_count: number
  next_due_at: string | null
  cards: DueCardData[]
}

// Teacher tests (assignments) + student submissions
export interface TestQuestionData {
  question: string
  options: string[]
  correct?: number // stripped when a student fetches the test to take it
  points: number
}

export interface TestData {
  id: number
  teacher_id?: number
  class_id: number | null
  title: string
  description: string | null
  questions: TestQuestionData[]
  time_limit: number | null
  is_published: boolean
  created_at: string
  updated_at?: string
  // teacher-list extras
  question_count?: number
  submission_count?: number
  avg_score?: number
  // student-list extras
  my_score?: number | null
  my_total?: number | null
}

export interface TestSubmissionData {
  id: number
  student_id: number
  student_name: string
  student_email?: string
  score: number
  total: number
  submitted_at: string
}

export interface GeneratedTestData {
  title: string
  questions: { question: string; options: string[]; correct: number; points: number }[]
}

// Document assignments: a prompt/handout the teacher posts (optionally with an
// attached image/file as a base64 data URL). Graded work uses TestData instead.
export interface AssignmentData {
  id: number
  teacher_id?: number
  class_id: number | null
  title: string
  description: string | null
  attachment: string | null
  attachment_name: string | null
  is_published: boolean
  created_at: string
  updated_at?: string
}

// AI generation payloads
export interface GeneratedLessonData {
  title: string
  description: string
  category: string
  difficulty: string
  content: LessonContentData
}

export interface GeneratedVocabSetData {
  name: string
  words: VocabWordData[]
}

/** One past IELTS mock-test sitting, as stored by the backend. */
export interface ExamHistoryItem {
  attempt_id: number
  paper_id: number
  theme: string
  score_percent: number | null
  estimated_band: string | null
  level: string | null
  correct: number | null
  total: number | null
  submitted_at: string | null
}
