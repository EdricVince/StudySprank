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
