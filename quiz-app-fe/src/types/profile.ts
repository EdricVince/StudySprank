import type { Component } from 'vue'

export interface SocialLink {
  platform: string
  url: string
}

export interface ProfileData {
  avatar: string
  fullName: string
  username: string
  email: string
  phone: string
  title: string
  location: string
  bio: string
  socialLinks: SocialLink[]
}

export interface ProfileStats {
  courses: number
  streak: number
  xp: number
}

export interface ProfileEditForm {
  fullName: string
  username: string
  email: string
  phone: string
  title: string
  location: string
  bio: string
}

export interface Achievement {
  id: number
  name: string
  icon: Component
  earned: boolean
}

// Enhanced Achievement types
export type AchievementCategory = 'learning' | 'streak' | 'social' | 'mastery'
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface EnhancedAchievement {
  id: string
  name: string
  description: string
  icon: Component
  category: AchievementCategory
  rarity: AchievementRarity
  earned: boolean
  earnedAt?: Date
  progress?: number
  target?: number
}

export interface SocialLinkForm {
  platform: string
  url: string
}

// Statistics types
export interface DailyActivity {
  day: string
  flashcards: number
  quizzes: number
  vocabulary: number
}

export interface LearningSummary {
  totalVocabulary: number
  flashcardsReviewed: number
  quizzesCompleted: number
  totalTimeMinutes: number
}

export interface WeeklyProgress {
  current: number
  target: number
  percentage: number
}

export interface StreakDay {
  date: Date
  completed: boolean
}

export interface ProfileStatistics {
  weeklyActivity: DailyActivity[]
  learningSummary: LearningSummary
  weeklyProgress: WeeklyProgress
  currentStreak: number
  longestStreak: number
  streakDays: StreakDay[]
}

// Goals types
export interface DailyGoal {
  id: string
  type: 'vocabulary' | 'flashcard' | 'quiz' | 'time'
  label: string
  current: number
  target: number
  unit: string
}

export interface WeeklyChallenge {
  id: string
  title: string
  description: string
  current: number
  target: number
  completed: boolean
  expiresAt: Date
}

export interface Milestone {
  id: string
  title: string
  description: string
  target: number
  current: number
  completed: boolean
  icon: Component
}
