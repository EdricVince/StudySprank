import type { Component } from 'vue'

export type QuizDifficulty = 'easy' | 'medium' | 'hard'
export type QuizStatus = 'idle' | 'playing' | 'paused' | 'finished'

export interface QuizMode {
  id: string
  title: string
  description: string
  icon: Component
  difficulty: QuizDifficulty
  estimatedTime: string
  questionsCount: number
  color: string
}

export interface QuizQuestion {
  id: number
  question: string
  options?: string[]
  correctAnswer: string | string[]
  explanation?: string
  imageUrl?: string
  audioUrl?: string
}

export interface MultipleChoiceQuestion extends QuizQuestion {
  options: string[]
  correctAnswer: string
}

export interface WordScrambleQuestion {
  id: number
  word: string
  hint: string
  scrambled: string[]
  /** Optional example sentence shown under the descriptive hint. */
  example?: string
}

export interface MatchingPair {
  id: number
  term: string
  definition: string
}

export interface TrueFalseQuestion {
  id: number
  statement: string
  isTrue: boolean
  explanation: string
}

export interface QuizResult {
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  score: number
  timeSpent: number
  xpEarned: number
  accuracy: number
  streakBonus: number
}

export interface QuizState {
  status: QuizStatus
  currentQuestion: number
  score: number
  correctCount: number
  wrongCount: number
  streak: number
  timeRemaining: number
  answers: QuizAnswer[]
}

export interface QuizAnswer {
  questionId: number
  userAnswer: string | string[]
  isCorrect: boolean
  timeSpent: number
}
