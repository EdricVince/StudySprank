import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/utils/api', () => ({ api: { getTeacherAnalytics: vi.fn() } }))

import AnalyticsPage from './AnalyticsPage.vue'
import { api } from '@/utils/api'

const getAnalytics = api.getTeacherAnalytics as unknown as ReturnType<typeof vi.fn>
const i18n = createI18n({ legacy: false, locale: 'en', messages: { en }, missingWarn: false, fallbackWarn: false })
const mountPage = () => mount(AnalyticsPage, { global: { plugins: [i18n], stubs: { TeacherPageHeader: { template: '<div><slot name="actions" /></div>' } } } })

const kpi = (over: Record<string, unknown> = {}) => ({ students: 0, quizzes: 0, avgScore: 0, trends: [null, null, null], ...over })
const day = (date: string, value: number) => ({ date, value })
const analytics = (over: Record<string, unknown> = {}) => ({
  classes: [],
  selectedClassId: null,
  students: [],
  studentsTotal: 0,
  kpiData: { week: kpi(), month: kpi(), year: kpi() },
  activityDataMap: { week: [], month: [], year: [] },
  classScores: [],
  topStudents: [],
  testScores: [],
  strugglingStudents: [],
  skillsData: [],
  ...over,
})

describe('Teacher AnalyticsPage — never a page of empty boxes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows one onboarding card with a way forward for a teacher without classes', async () => {
    getAnalytics.mockResolvedValue(analytics())
    const w = mountPage()
    await flushPromises()

    const card = w.find('[data-test="analytics-onboarding"]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('Create your first class')
    expect(w.text()).not.toContain('Students Needing Attention')

    await card.find('button').trigger('click')
    expect(push).toHaveBeenCalledWith('/teacher/classes')
  })

  it('does not claim students are doing well when no student has joined yet', async () => {
    getAnalytics.mockResolvedValue(analytics({ classes: [{ id: 1, name: 'A1', students: 0 }], classScores: [{ name: 'A1', score: null, students: 0 }] }))
    const w = mountPage()
    await flushPromises()

    expect(w.find('[data-test="analytics-onboarding"]').exists()).toBe(false)
    expect(w.text()).toContain('No students have joined your classes yet.')
    expect(w.text()).not.toContain('All students are performing well!')
  })

  it('says all students are doing well only when there are students', async () => {
    getAnalytics.mockResolvedValue(analytics({ classes: [{ id: 1, name: 'A1', students: 3 }], classScores: [{ name: 'A1', score: 80, students: 3 }] }))
    const w = mountPage()
    await flushPromises()
    expect(w.text()).toContain('All students are performing well!')
  })

  it('opens on the month when this week is empty but the month has activity, and draws every day of the chart', async () => {
    getAnalytics.mockResolvedValue(
      analytics({
        classes: [{ id: 1, name: 'A1', students: 2 }],
        classScores: [{ name: 'A1', score: 70, students: 2 }],
        kpiData: { week: kpi(), month: kpi({ students: 2, quizzes: 4 }), year: kpi({ students: 2, quizzes: 4 }) },
        activityDataMap: {
          week: [day('2026-11-01', 0)],
          month: [day('2026-10-20', 0), day('2026-10-21', 3), day('2026-10-22', 0)],
          year: [],
        },
      }),
    )
    const w = mountPage()
    await flushPromises()

    const chart = w.find('[data-test="activity-chart"]')
    expect(chart.exists()).toBe(true)
    // 3 days → 3 bars; the empty days keep a visible baseline instead of vanishing
    const bars = chart.findAll('.rounded-t-lg')
    expect(bars).toHaveLength(3)
    expect(bars[0]!.attributes('style')).toContain('3px')
    expect(bars[1]!.attributes('style')).toContain('100%')
  })
})

describe('Teacher AnalyticsPage — one class, and the progress of the students who joined it', () => {
  beforeEach(() => vi.clearAllMocks())

  const student = (over: Record<string, unknown> = {}) => ({
    id: 1, name: 'An', email: 'an@x.com', classes: ['A1'], level: 3, xp: 250, streak: 4,
    lastActiveDate: '2026-11-05', tests: 2, avgScore: 75, sessions: 5, words: 60, accuracy: 82,
    needsAttention: false, ...over,
  })
  const withStudents = (over: Record<string, unknown> = {}) =>
    analytics({
      classes: [{ id: 1, name: 'A1', students: 2 }, { id: 2, name: 'B2', students: 0 }],
      classScores: [{ name: 'A1', score: 70, students: 2 }, { name: 'B2', score: null, students: 0 }],
      students: [student(), student({ id: 2, name: 'Binh', email: 'binh@x.com', tests: 0, avgScore: null, sessions: 0, words: 0, accuracy: null, lastActiveDate: null, needsAttention: true })],
      studentsTotal: 2,
      ...over,
    })

  it('lists each joined student with tests, practice and status', async () => {
    getAnalytics.mockResolvedValue(withStudents())
    const w = mountPage()
    await flushPromises()

    const rows = w.findAll('[data-test="roster-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('An')
    expect(rows[0]!.text()).toContain('2 · 75%')
    expect(rows[0]!.text()).toContain('82%')
    expect(rows[0]!.text()).toContain('On track')
    // a student who never did anything shows dashes and is flagged
    expect(rows[1]!.text()).toContain('Needs attention')
    expect(rows[1]!.text()).not.toContain('NaN')
  })

  it('states that only students who joined are counted', async () => {
    getAnalytics.mockResolvedValue(withStudents())
    const w = mountPage()
    await flushPromises()
    expect(w.find('[data-test="scope-note"]').text()).toContain('Only students who have joined')
  })

  it('reloads the dashboard for exactly one class when it is chosen in the filter', async () => {
    getAnalytics.mockResolvedValue(withStudents())
    const w = mountPage()
    await flushPromises()
    expect(getAnalytics).toHaveBeenLastCalledWith(null)

    getAnalytics.mockResolvedValue(withStudents({ selectedClassId: 2, students: [], studentsTotal: 0 }))
    await w.find('[data-test="class-filter"]').setValue(2)
    await flushPromises()

    expect(getAnalytics).toHaveBeenLastCalledWith(2)
    expect(w.find('[data-test="scope-note"]').text()).toContain('"B2"')
    expect(w.text()).toContain('Nobody has joined this class yet')
  })
})
