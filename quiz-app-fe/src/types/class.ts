export interface Class {
  id: number
  name: string
  description?: string
  subject?: string
  class_code: string
  student_limit: number
  teacher_id: number
  is_active: boolean
  created_at: string
  updated_at?: string
  student_count?: number
}

export interface ClassStudent {
  id: number
  class_id: number
  student_id: number
  student_email: string
  student_name?: string
  joined_at: string
}

/** One student of a class with their progress (teacher view of the class hub). */
export interface ClassHubStudent {
  id: number
  name: string
  email: string
  joined_at: string
  xp: number
  level: number
  streak_count: number
  tests_taken: number
  avg_score: number
}

export interface ClassHubTest {
  id: number; title: string; description: string | null; time_limit: number | null
  is_published: boolean; created_at: string; question_count: number
}
export interface ClassHubAssignment {
  id: number; title: string; description: string | null; attachment_name: string | null
  has_attachment: boolean; is_published: boolean; created_at: string
}
export interface ClassHubLesson {
  id: number; title: string; description: string | null; category: string; difficulty: string
  is_published: boolean; created_at: string
}
export interface ClassHubVocabSet {
  id: number; name: string; language: string; level: string
  is_published: boolean; created_at: string; word_count: number
}
export interface ClassHubDeck {
  id: number; title: string; description: string | null; category: string
  created_at: string; card_count: number
}

/** GET /classes/:id/hub — a class and everything that belongs to it. */
export interface ClassHub {
  class: {
    id: number; name: string; subject: string | null; description: string | null
    class_code: string | null // only the teacher sees the code
    student_limit: number; is_active: boolean; student_count: number
  }
  teacher_name: string
  tests: ClassHubTest[]
  assignments: ClassHubAssignment[]
  lessons: ClassHubLesson[]
  vocab_sets: ClassHubVocabSet[]
  decks: ClassHubDeck[]
  students: ClassHubStudent[] | null // null for students
}
