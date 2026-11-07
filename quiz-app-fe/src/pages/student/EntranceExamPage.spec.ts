import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }), useRoute: () => ({ query: {} }) }))

vi.mock('@/utils/api', () => ({
  api: { getExamFormat: vi.fn(), getExamHistory: vi.fn() },
  apiRequest: vi.fn(),
}))

import EntranceExamPage from './EntranceExamPage.vue'
import { api, apiRequest } from '@/utils/api'

const getFormat = api.getExamFormat as unknown as ReturnType<typeof vi.fn>
const getHistory = api.getExamHistory as unknown as ReturnType<typeof vi.fn>
const aiStatus = apiRequest as unknown as ReturnType<typeof vi.fn>

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en }, missingWarn: false, fallbackWarn: false })
const mountPage = () => mount(EntranceExamPage, { global: { plugins: [i18n] } })

const format = {
  listening: { parts: 4, questions: 30, minutes: 30 },
  reading: { passages: 3, questions: 30, minutes: 60 },
  writing: { tasks: 2, minutes: 60 },
  total_questions: 60,
  total_minutes: 150,
}
const sitting = (over: Record<string, unknown> = {}) => ({
  attempt_id: 1, paper_id: 1, theme: 'Environment & Ecology — climate', score_percent: 70, estimated_band: '6.5',
  overall_band: 6.5, level: 'B2', correct: 42, total: 60, submitted_at: '2026-11-05T10:00:00.000Z', ...over,
})

describe('EntranceExamPage — IELTS mock test hub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFormat.mockResolvedValue(format)
    getHistory.mockResolvedValue([])
    aiStatus.mockResolvedValue({ ai_enabled: true })
  })

  it('starts the target band at 0.0 and cannot be set by hand', async () => {
    const w = mountPage()
    await flushPromises()
    expect(w.find('[data-test="target-band"]').text()).toBe('0.0')
    expect(w.find('[data-test="target-source"]').text()).toContain('Take a mock test')
    expect(w.find('[data-test="target-panel"] input').exists()).toBe(false) // no slider any more
  })

  it('shows the overall band of the latest mock test as the target band', async () => {
    getHistory.mockResolvedValue([sitting({ attempt_id: 2, overall_band: 7 }), sitting({ attempt_id: 1, overall_band: 5.5 })])
    const w = mountPage()
    await flushPromises()
    expect(w.find('[data-test="target-band"]').text()).toBe('7.0')
    expect(w.find('[data-test="target-source"]').text()).toContain('latest mock test')
    expect(w.find('[data-test="target-panel"]').text()).toContain('C1')
  })

  it('reads the band of older sittings that only stored a range', async () => {
    getHistory.mockResolvedValue([sitting({ overall_band: null, estimated_band: '6.0–6.5' })])
    const w = mountPage()
    await flushPromises()
    expect(w.find('[data-test="target-band"]').text()).toBe('6.5')
  })

  it('takes the questions and minutes from the server format, not from the page', async () => {
    const w = mountPage()
    await flushPromises()
    const text = w.text()
    expect(text).toContain('60') // total questions
    expect(text).toContain('150 min')
    expect(text).toContain('4 parts · 30 questions · 30 min')
    expect(text).toContain('3 passages · 30 questions · 60 min')
    expect(text).toContain('2 tasks · 60 min')
  })

  it('starts a test without any chosen target band, and re-sits a stored paper', async () => {
    getHistory.mockResolvedValue([sitting({ paper_id: 5 })])
    const w = mountPage()
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Start IELTS Test'))!.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'ExamSession' })

    await w.findAll('button').find((b) => b.text().includes('Retake this paper'))!.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'ExamSession', query: { paper: '5' } })
  })

  it('shows each past sitting with its overall band', async () => {
    getHistory.mockResolvedValue([sitting({ overall_band: 6.5 })])
    const w = mountPage()
    await flushPromises()
    expect(w.text()).toContain('Environment & Ecology')
    expect(w.text()).toContain('42/60')
    expect(w.text()).toContain('6.5')
  })

  it('cannot start while the AI is off, and says why', async () => {
    aiStatus.mockResolvedValue({ ai_enabled: false })
    const w = mountPage()
    await flushPromises()
    expect(w.text()).toContain('AI Not Configured')
    const start = w.findAll('button').find((b) => b.text().includes('AI unavailable'))!
    expect(start.attributes('disabled')).toBeDefined()
  })
})
