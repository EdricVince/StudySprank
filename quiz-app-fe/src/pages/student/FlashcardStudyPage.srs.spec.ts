import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'

// Deck study route (spaced-repetition mode)
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'FlashcardStudy', params: { id: '7' }, query: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('hammerjs', () => ({
  default: class Hammer {
    static DIRECTION_HORIZONTAL = 2
    get() { return { set() {} } }
    on() {}
    destroy() {}
  },
}))

vi.mock('@/utils/api', () => ({
  api: { getFlashcardDeck: vi.fn(), getDueCards: vi.fn(), reviewCard: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import FlashcardStudyPage from './FlashcardStudyPage.vue'
import { api } from '@/utils/api'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} } })
const mountPage = () => mount(FlashcardStudyPage, { global: { plugins: [createPinia(), i18n] } })
const m = api as unknown as Record<'getFlashcardDeck' | 'getDueCards' | 'reviewCard', ReturnType<typeof vi.fn>>

const deck = {
  id: 7, owner_id: 1, title: 'Fruits', description: '', category: 'General', is_public: true,
  created_at: '', updated_at: '',
  cards: [{ term: 'Apple', definition: 'táo' }, { term: 'Book', definition: 'sách' }, { term: 'Cat', definition: 'mèo' }],
}

describe('FlashcardStudyPage — spaced repetition (deck mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.getFlashcardDeck.mockResolvedValue(deck)
    m.reviewCard.mockResolvedValue({})
  })

  it('studies only the due + new cards and shows the due count and the reason', async () => {
    m.getDueCards.mockResolvedValue({
      deck_id: 7, total_cards: 3, due_count: 1, new_count: 1, next_due_at: null,
      cards: [
        { term: 'Book', definition: 'sách', card_key: 'book', reason: 'due', due_at: new Date().toISOString(), interval_days: 1, repetitions: 0, last_quality: 1, last_reviewed_at: null },
        { term: 'Cat', definition: 'mèo', card_key: 'cat', reason: 'new', due_at: null, interval_days: 0, repetitions: 0, last_quality: null, last_reviewed_at: null },
      ],
    })
    const w = mountPage()
    await flushPromises()

    expect(m.getDueCards).toHaveBeenCalledWith(7)
    expect(w.find('[data-test="due-count"]').text()).toContain('1 due · 1 new')
    expect(w.text()).toContain('of 2') // only the scheduled cards, not all 3
    expect(w.find('[data-test="srs-reason"]').text()).toContain('missed this card')
  })

  it('sends Known as quality 4 and Don\'t know as quality 1', async () => {
    m.getDueCards.mockResolvedValue({
      deck_id: 7, total_cards: 3, due_count: 0, new_count: 3, next_due_at: null,
      cards: deck.cards.map((c) => ({ ...c, card_key: c.term.toLowerCase(), reason: 'new', due_at: null, interval_days: 0, repetitions: 0, last_quality: null, last_reviewed_at: null })),
    })
    const w = mountPage()
    await flushPromises()

    const [unknownBtn, , knownBtn] = w.findAll('.mt-8 button')
    await knownBtn!.trigger('click')
    expect(m.reviewCard).toHaveBeenCalledWith(7, 'apple', 4)

    await unknownBtn!.trigger('click') // still on the first card (swipe animation pending)
    expect(m.reviewCard).toHaveBeenLastCalledWith(7, 'apple', 1)
  })
})
