import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

// ── Mocks for the page's external dependencies ───────────────────────────────
const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

vi.mock('@/utils/api', () => ({
  api: { getTests: vi.fn(), getAssignments: vi.fn(), getLearningSessions: vi.fn() },
}))

vi.mock('@/stores/progress.store', () => ({
  useProgressStore: () => ({
    streakCount: 3, xp: 120, totalQuizzesCompleted: 5,
    longestStreak: 4, totalCardsStudied: 20, leaderboard: [],
  }),
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ currentUser: { id: 1 } }) }))

import QuizzesPage from './QuizzesPage.vue'
import { api } from '@/utils/api'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missingWarn: false, fallbackWarn: false })
const mountPage = () =>
  mount(QuizzesPage, {
    global: { plugins: [i18n], stubs: { QuizModeCard: true } },
  })
const getTests = api.getTests as unknown as ReturnType<typeof vi.fn>
const getAssignments = api.getAssignments as unknown as ReturnType<typeof vi.fn>

const tests = [
  { id: 1, title: 'Reading Comprehension', description: 'Unit 1', question_count: 8, time_limit: 15, my_score: null, my_total: null },
  { id: 2, title: 'Grammar Check', description: 'Tenses', question_count: 10, my_score: 7, my_total: 10 },
]
const docs = [
  { id: 3, title: 'Handout: Irregular Verbs', description: 'Read before class', attachment: null },
]

describe('QuizzesPage — question direction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lets the learner choose word → meaning, meaning → word or mixed', async () => {
    getTests.mockResolvedValue([])
    getAssignments.mockResolvedValue([])
    const w = mountPage()
    await flushPromises()

    await w.find('[data-test="direction-term"]').trigger('click')
    expect(localStorage.getItem('studyspark-quiz-direction')).toBe('term')
    await w.find('[data-test="direction-meaning"]').trigger('click')
    expect(localStorage.getItem('studyspark-quiz-direction')).toBe('meaning')
  })
})

describe('QuizzesPage — assignments from teacher', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders assigned tests and document handouts from the API', async () => {
    getTests.mockResolvedValue(tests)
    getAssignments.mockResolvedValue(docs)
    const w = mountPage()
    await flushPromises()

    expect(getTests).toHaveBeenCalled()
    expect(getAssignments).toHaveBeenCalled()
    expect(w.text()).toContain('Reading Comprehension')
    expect(w.text()).toContain('Grammar Check')
    expect(w.text()).toContain('Handout: Irregular Verbs')
    // graded test surfaces its score
    expect(w.text()).toContain('7/10')
  })

  it('shows the empty state when no teacher content is assigned', async () => {
    getTests.mockResolvedValue([])
    getAssignments.mockResolvedValue([])
    const w = mountPage()
    await flushPromises()

    expect(w.text()).toContain('quizzesPage.noAssignmentsYet')
  })

  it('navigates to the test runner when an assigned test is clicked', async () => {
    getTests.mockResolvedValue(tests)
    getAssignments.mockResolvedValue([])
    const w = mountPage()
    await flushPromises()

    const testButton = w.findAll('button').find(b => b.text().includes('Reading Comprehension'))
    await testButton!.trigger('click')
    expect(push).toHaveBeenCalledWith('/quizzes/test/1')
  })

  it('stays resilient when the assignments API fails', async () => {
    getTests.mockRejectedValue(new Error('offline'))
    getAssignments.mockRejectedValue(new Error('offline'))
    const w = mountPage()
    await flushPromises()

    // The section still renders its empty state rather than crashing.
    expect(w.text()).toContain('quizzesPage.noAssignmentsYet')
  })
})
