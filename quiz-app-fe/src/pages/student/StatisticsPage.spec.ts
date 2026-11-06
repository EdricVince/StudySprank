import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/utils/api', () => ({ api: { getMyStatistics: vi.fn() } }))

const progress = vi.hoisted(() => ({
  xp: 120, level: 2, xpToNextLevel: 80, xpProgressPercent: 60, streakCount: 3, longestStreak: 5,
  totalCardsStudied: 10, totalQuizzesCompleted: 4, fetchProgress: vi.fn(),
}))
vi.mock('@/stores/progress.store', () => ({ useProgressStore: () => progress }))

import StatisticsPage from './StatisticsPage.vue'
import { api } from '@/utils/api'

const getStats = api.getMyStatistics as unknown as ReturnType<typeof vi.fn>
const i18n = createI18n({ legacy: false, locale: 'en', messages: { en }, missingWarn: false, fallbackWarn: false })
const mountPage = () => mount(StatisticsPage, { global: { plugins: [i18n] } })

const today = new Date().toISOString().slice(0, 10)
const stats = (over: Record<string, unknown> = {}) => ({
  period: 'week',
  summary: { sessions: 4, flashcardSessions: 1, quizGames: 3, words: 45, accuracy: 72, minutes: 75, xpEarned: 30 },
  trends: { sessions: 100, words: 50, minutes: -20, accuracy: null },
  activity: [
    { date: '2026-11-04', flashcards: 0, quizzes: 0, sessions: 0, accuracy: null },
    { date: '2026-11-05', flashcards: 20, quizzes: 25, sessions: 4, accuracy: 72 },
  ],
  byMode: [
    { modeId: 'multiple-choice', sessions: 2, words: 20, accuracy: 85 },
    { modeId: 'word-scramble', sessions: 1, words: 10, accuracy: null },
  ],
  vocabulary: { learned: 31, practised: 40, weakWords: [{ term: 'door', meaning: 'cửa', missed: 3, seen: 4 }] },
  tests: { taken: 2, average: 70, recent: [{ title: 'Unit 1', score: 3, total: 4, at: '2026-11-03T10:00:00Z' }] },
  skills: [{ name: 'Reading', avgScore: 55, attempts: 2 }],
  activeDays: [today],
  hasHistory: true,
  ...over,
})
const emptyStats = () =>
  stats({
    summary: { sessions: 0, flashcardSessions: 0, quizGames: 0, words: 0, accuracy: null, minutes: 0, xpEarned: 0 },
    trends: { sessions: null, words: null, minutes: null, accuracy: null },
    activity: [{ date: '2026-11-05', flashcards: 0, quizzes: 0, sessions: 0, accuracy: null }],
    byMode: [], vocabulary: { learned: 0, practised: 0, weakWords: [] },
    tests: { taken: 0, average: null, recent: [] }, skills: [], activeDays: [], hasHistory: false,
  })

describe('Student StatisticsPage — the learner’s own progress, from real data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    progress.totalCardsStudied = 10
    progress.totalQuizzesCompleted = 4
  })

  it('shows this period’s figures with real trends, and nothing for a trend that has no comparison', async () => {
    getStats.mockResolvedValue(stats())
    const w = mountPage()
    await flushPromises()

    expect(getStats).toHaveBeenCalledWith('week')
    const kpis = w.find('[data-test="period-kpis"]').text()
    expect(kpis).toContain('45')
    expect(kpis).toContain('72%')
    expect(kpis).toContain('1 h 15 min')
    expect(kpis).toContain('+100% vs last week')
    expect(kpis).toContain('-20% vs last week')
    expect(kpis).not.toContain('pts vs') // accuracy had no previous period → no invented trend
    expect(w.find('[data-test="lifetime-kpis"]').text()).toContain('31')
  })

  it('reloads for the chosen period', async () => {
    getStats.mockResolvedValue(stats())
    const w = mountPage()
    await flushPromises()

    await w.find('[data-test="period-month"]').trigger('click')
    await flushPromises()
    expect(getStats).toHaveBeenLastCalledWith('month')
  })

  it('lists the words still to practise, accuracy per game, recent tests, IELTS skills and the studied days', async () => {
    getStats.mockResolvedValue(stats())
    const w = mountPage()
    await flushPromises()

    expect(w.find('[data-test="weak-words"]').text()).toContain('door')
    expect(w.find('[data-test="weak-words"]').text()).toContain('missed 3 of 4')
    const modes = w.find('[data-test="mode-list"]').text()
    expect(modes).toContain('Multiple Choice')
    expect(modes).toContain('85%')
    expect(w.find('[data-test="recent-tests"]').text()).toContain('3/4')
    expect(w.find('[data-test="skill-list"]').text()).toContain('55%')
    // 28 calendar days; today is filled
    const cells = w.find('[data-test="streak-calendar"]').findAll('div')
    expect(cells).toHaveLength(28)
    expect(cells[27]!.classes()).toContain('bg-primary')
    expect(cells[0]!.classes()).toContain('bg-secondary')
    expect(w.find('[data-test="activity-chart"]').exists()).toBe(true)
  })

  it('shows one onboarding card, not a page of zeros, for a student who has not studied yet', async () => {
    progress.totalCardsStudied = 0
    progress.totalQuizzesCompleted = 0
    getStats.mockResolvedValue(emptyStats())
    const w = mountPage()
    await flushPromises()

    expect(w.find('[data-test="stats-empty"]').exists()).toBe(true)
    expect(w.find('[data-test="period-kpis"]').exists()).toBe(false)
    await w.find('[data-test="stats-empty"] button').trigger('click')
    expect(push).toHaveBeenCalledWith('/flashcards')
  })

  it('still shows the page when this period is empty but the student has studied before', async () => {
    getStats.mockResolvedValue({ ...emptyStats(), hasHistory: true })
    const w = mountPage()
    await flushPromises()

    expect(w.find('[data-test="stats-empty"]').exists()).toBe(false)
    expect(w.find('[data-test="period-kpis"]').exists()).toBe(true)
    expect(w.text()).toContain('Nothing practised in this period yet.')
  })

  it('shows an error with a retry', async () => {
    getStats.mockRejectedValueOnce(new Error('boom'))
    const w = mountPage()
    await flushPromises()
    expect(w.find('[data-test="stats-error"]').exists()).toBe(true)

    getStats.mockResolvedValueOnce(stats())
    await w.find('[data-test="stats-error"] button').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="period-kpis"]').exists()).toBe(true)
  })
})
