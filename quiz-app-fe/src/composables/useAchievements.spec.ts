import { describe, it, expect, vi } from 'vitest'

const progress = { totalCardsStudied: 0, totalQuizzesCompleted: 12, streakCount: 0 }
vi.mock('@/stores/progress.store', () => ({ useProgressStore: () => progress }))

import { useAchievements } from './useAchievements'

describe('useAchievements — rarity is consistent with difficulty', () => {
  const byName = (name: string) =>
    useAchievements().achievementsData.value.achievements.find((a) => a.name === name)!

  it('the easier quiz badge (10 quizzes) is rarer-or-equal to the harder one (50)', () => {
    const rank = { common: 0, rare: 1, epic: 2, legendary: 3 }
    const veteran = byName('Quiz Veteran') // 10 quizzes
    const master = byName('Quiz Master') // 50 quizzes
    expect(veteran.target).toBeLessThan(master.target!)
    expect(rank[veteran.rarity]).toBeLessThan(rank[master.rarity])
  })

  it('awards Quiz Veteran at 12 quizzes but not Quiz Master', () => {
    expect(byName('Quiz Veteran').earned).toBe(true)
    expect(byName('Quiz Master').earned).toBe(false)
  })
})
