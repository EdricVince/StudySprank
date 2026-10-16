import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

vi.mock('@/utils/api', () => ({
  api: { getWritingPrompt: vi.fn(), submitWriting: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import WritingPage from './WritingPage.vue'
import { api } from '@/utils/api'

const m = api as unknown as Record<'getWritingPrompt' | 'submitWriting', ReturnType<typeof vi.fn>>
const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

describe('WritingPage — AI evaluation result', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.getWritingPrompt.mockResolvedValue({ prompt: 'Discuss remote work.', word_target: '250+', time_limit_seconds: 2400, tips: [] })
    m.submitWriting.mockResolvedValue({
      overall_band: '6.5', summary: 'Solid argument.', scores: { task_response: 6.5 },
      word_count: 260, time_taken_seconds: 1200, strengths: ['Clear thesis'], improvements: ['Vary sentences'],
    })
  })

  it('shows the AI-generated badge next to the band score', async () => {
    const w = mount(WritingPage, { global: { plugins: [i18n] } })

    await w.findAll('button')[0]!.trigger('click') // pick IELTS Task 2
    await flushPromises()
    const submit = w.findAll('button').find((b) => b.text() === 'Submit')!
    await submit.trigger('click')
    await flushPromises()

    expect(w.text()).toContain('6.5')
    const badge = w.find('[data-test="ai-generated-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('AI-generated')
    w.unmount()
  })
})
