export interface Course {
  id: number
  title: string
  description: string
  category: string
  difficulty: string
  progress: number
  completedLessons: number
  totalLessons: number
  lastAccessed: string
  estimatedHours: number
}

export interface FilterTab {
  value: string
  label: string
  icon: unknown
  count: number
}
