import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/utils/api', () => ({
  api: { getWritingPrompt: vi.fn(), submitWriting: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import WritingPage from './WritingPage.vue'
import { api } from '@/utils/api'

const m = api as unknown as Record<'getWritingPrompt' | 'submitWriting', ReturnType<typeof vi.fn>>

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
    const w = mount(WritingPage)

    await w.findAll('button')[0]!.trigger('click') // pick IELTS Task 2
    await flushPromises()
    await w.find('textarea').setValue('Remote work has clear benefits for many employees.')
    const submit = w.findAll('button').find((b) => b.text() === 'Submit')!
    await submit.trigger('click')
    await flushPromises()

    expect(w.text()).toContain('6.5')
    const badge = w.find('[data-test="ai-generated-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('AI-generated')
    w.unmount()
  })

  it('stops the exam clock when going back to the topic list', async () => {
    vi.useFakeTimers()
    const w = mount(WritingPage)
    await w.findAll('button')[0]!.trigger('click')
    await flushPromises()
    await w.find('.back-btn').trigger('click') // Topics
    vi.advanceTimersByTime(2401 * 1000)
    await flushPromises()
    expect(m.submitWriting).not.toHaveBeenCalled()
    vi.useRealTimers()
    w.unmount()
  })
})
