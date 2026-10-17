import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'

// ── Mocks for the page's external dependencies ───────────────────────────────
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'FlashcardVocabPractice', params: {}, query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}))

// hammerjs touches DOM gesture APIs that jsdom lacks — stub it out.
vi.mock('hammerjs', () => ({
  default: class Hammer {
    static DIRECTION_HORIZONTAL = 2
    get() { return { set() {} } }
    on() {}
    destroy() {}
  },
}))

vi.mock('@/utils/api', () => ({
  api: { generateVocabulary: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import FlashcardStudyPage from './FlashcardStudyPage.vue'
import { api } from '@/utils/api'

const mountPage = () => mount(FlashcardStudyPage, { global: { plugins: [createPinia()] } })
const mockGen = api.generateVocabulary as unknown as ReturnType<typeof vi.fn>

describe('FlashcardStudyPage — vocabulary practice', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('requests an AI batch and renders the first word on the card front', async () => {
    mockGen.mockResolvedValue([
      { term: 'meander', meaning: 'đi lang thang', explanation: 'di chuyển không theo hướng cố định', example: 'The river meanders.' },
      { term: 'savor', meaning: 'thưởng thức', explanation: 'tận hưởng từ từ', example: 'Savor it.' },
    ])
    const w = mountPage()
    await flushPromises()

    expect(mockGen).toHaveBeenCalledWith(expect.objectContaining({ learningLang: 'en', count: 15 }))
    expect(w.text()).toContain('meander')       // front term of the first card
    expect(w.text()).toContain('of 2')          // "Card 1 of 2" — batch size from AI
    expect(w.text()).not.toContain('Generating fresh vocabulary') // loading finished
  })

  it('flips the card via rotateY so the meaning side turns forward (regression guard)', async () => {
    mockGen.mockResolvedValue([
      { term: 'savor', meaning: 'thưởng thức', explanation: 'tận hưởng', example: 'Savor it.' },
    ])
    const w = mountPage()
    await flushPromises()

    // Front-facing: the inline transform must NOT contain a Y rotation yet.
    expect(w.find('.card-inner').attributes('style') ?? '').not.toContain('rotateY')

    await w.find('.perspective-1000').trigger('click') // flip

    // The flip lives in the SAME inline transform as the swipe offset — if a bare
    // CSS class were used it would be overridden and the card would never flip.
    expect(w.find('.card-inner').attributes('style')).toContain('rotateY(180deg)')
  })

  it('falls back to the local word list when the AI endpoint fails', async () => {
    mockGen.mockRejectedValue(new Error('AI unavailable'))
    const w = mountPage()
    await flushPromises()

    expect(w.find('.perspective-1000').exists()).toBe(true)
    expect(w.text()).toContain('of 15') // local fallback batch is 15 words
    expect(w.text()).not.toContain('Generating fresh vocabulary')
  })
})
