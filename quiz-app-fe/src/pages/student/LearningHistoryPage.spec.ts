import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

const push = vi.fn()
const replace = vi.fn()
const route = vi.hoisted(() => ({ query: {} as Record<string, string> }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push, replace }),
  useRoute: () => route,
}))

vi.mock('@/utils/api', () => ({
  api: {
    getLearningSessions: vi.fn(),
    getLearningSession: vi.fn(),
    deleteLearningSession: vi.fn(),
    getLearningVocabulary: vi.fn(),
  },
}))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

import LearningHistoryPage from './LearningHistoryPage.vue'
import { api } from '@/utils/api'

const getSessions = api.getLearningSessions as unknown as ReturnType<typeof vi.fn>
const getSession = api.getLearningSession as unknown as ReturnType<typeof vi.fn>
const deleteSession = api.deleteLearningSession as unknown as ReturnType<typeof vi.fn>
const getVocabulary = api.getLearningVocabulary as unknown as ReturnType<typeof vi.fn>

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en }, missingWarn: false, fallbackWarn: false })
const mountPage = (kind: 'flashcard' | 'quiz') =>
  mount(LearningHistoryPage, {
    props: { kind },
    global: { plugins: [i18n], stubs: { Teleport: true, Transition: false } },
  })

const session = (over: Record<string, unknown> = {}) => ({
  id: 1, kind: 'quiz', mode_id: 'multiple-choice', mode_name: 'Multiple Choice', source: 'builtin',
  title: 'Multiple Choice', deck_id: null, vocab_set_id: null, learning_lang: 'en', meaning_lang: 'vi',
  total_items: 10, correct_items: 7, accuracy: 70, score: 700, xp_earned: 12, duration_seconds: 95,
  created_at: '2026-11-05T10:00:00.000Z', ...over,
})
const detail = (over: Record<string, unknown> = {}) => ({
  ...session(),
  words: [
    { id: 1, position: 1, term: 'door', meaning: 'cửa', example: null, is_correct: true },
    { id: 2, position: 2, term: 'cat', meaning: 'con mèo', example: 'The cat sleeps.', is_correct: false },
  ],
  ...over,
})

describe('LearningHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
  })

  it('lists the learner’s saved games with the translated mode name and accuracy', async () => {
    getSessions.mockResolvedValue({ items: [session(), session({ id: 2, mode_id: 'word-scramble', accuracy: 40 })], total: 2 })
    const w = mountPage('quiz')
    await flushPromises()

    expect(getSessions).toHaveBeenCalledWith({ kind: 'quiz', limit: 20, offset: 0 })
    const rows = w.findAll('[data-test="history-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Multiple Choice')
    expect(rows[0]!.text()).toContain('70%')
    expect(rows[1]!.text()).toContain('Word Scramble')
  })

  it('shows the empty state with a way back when nothing was played yet', async () => {
    getSessions.mockResolvedValue({ items: [], total: 0 })
    const w = mountPage('flashcard')
    await flushPromises()

    expect(w.find('[data-test="history-empty"]').exists()).toBe(true)
    expect(w.text()).toContain('No flashcard sessions yet')
  })

  it('shows an error with a retry when the history cannot be loaded', async () => {
    getSessions.mockRejectedValueOnce(new Error('boom'))
    const w = mountPage('quiz')
    await flushPromises()
    expect(w.find('[data-test="history-error"]').exists()).toBe(true)

    getSessions.mockResolvedValueOnce({ items: [session()], total: 1 })
    await w.find('[data-test="history-error"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-test="history-row"]')).toHaveLength(1)
  })

  it('opens a session to show every word, and can study the words again or only the missed ones', async () => {
    getSessions.mockResolvedValue({ items: [session()], total: 1 })
    getSession.mockResolvedValue(detail())
    const w = mountPage('quiz')
    await flushPromises()

    await w.find('[data-test="history-row"]').trigger('click')
    await flushPromises()

    expect(getSession).toHaveBeenCalledWith(1)
    const modal = w.find('[data-test="history-detail"]')
    expect(modal.text()).toContain('door')
    expect(modal.text()).toContain('cửa')
    expect(modal.text()).toContain('The cat sleeps.')

    const buttons = modal.findAll('button')
    const again = buttons.find((b) => b.text().includes('Study these words again'))!
    await again.trigger('click')
    expect(push).toHaveBeenCalledWith({ path: '/flashcards/history/1/study', query: {} })

    const missed = buttons.find((b) => b.text().includes('Practise 1 missed words'))!
    await missed.trigger('click')
    expect(push).toHaveBeenLastCalledWith({ path: '/flashcards/history/1/study', query: { only: 'missed' } })
  })

  it('opens the session named in the link (?session=ID) straight away', async () => {
    route.query = { session: '5' }
    getSessions.mockResolvedValue({ items: [session({ id: 5 })], total: 1 })
    getSession.mockResolvedValue(detail({ id: 5 }))
    const w = mountPage('quiz')
    await flushPromises()

    expect(getSession).toHaveBeenCalledWith(5)
    expect(w.find('[data-test="history-detail"]').exists()).toBe(true)
  })

  it('deletes a session after confirming and removes it from the list', async () => {
    getSessions.mockResolvedValue({ items: [session()], total: 1 })
    getSession.mockResolvedValue(detail())
    deleteSession.mockResolvedValue(undefined)
    const w = mountPage('quiz')
    await flushPromises()
    await w.find('[data-test="history-row"]').trigger('click')
    await flushPromises()

    const del = w.find('[data-test="history-detail"]').findAll('button').find((b) => b.text() === 'Delete')!
    await del.trigger('click')
    const confirm = w.findAll('button').filter((b) => b.text() === 'Delete').pop()!
    await confirm.trigger('click')
    await flushPromises()

    expect(deleteSession).toHaveBeenCalledWith(1)
    expect(w.findAll('[data-test="history-row"]')).toHaveLength(0)
    expect(toast.success).toHaveBeenCalled()
  })
})

describe('LearningHistoryPage — my vocabulary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    route.query = {}
    getSessions.mockResolvedValue({ items: [], total: 0 })
  })

  const word = (over: Record<string, unknown> = {}) => ({
    term: 'door', meaning: 'cửa', example: null, seen: 3, correct: 2, missed: 1,
    last_seen_at: '2026-11-05T10:00:00.000Z', status: 'learned', ...over,
  })
  const vocabPage = (items: unknown[], summary = { total: 2, learned: 1, weak: 1 }) => ({ items, total: items.length, summary })

  it('lists every practised word with how it went, in the Vocabulary tab', async () => {
    getVocabulary.mockResolvedValue(vocabPage([word(), word({ term: 'cat', meaning: 'con mèo', correct: 0, missed: 2, seen: 2, status: 'weak' })]))
    const w = mountPage('quiz')
    await flushPromises()
    await w.find('[data-test="tab-words"]').trigger('click')
    await flushPromises()

    const rows = w.findAll('[data-test="vocab-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('door')
    expect(rows[0]!.text()).toContain('cửa')
    expect(rows[0]!.text()).toContain('seen 3 times')
    expect(rows[1]!.text()).toContain('To practise')
    expect(w.find('[data-test="vocab-filter-weak"]').text()).toContain('1')
  })

  it('opens straight on the words that need practice when linked from the statistics (?tab=words&status=weak)', async () => {
    route.query = { tab: 'words', status: 'weak' }
    getVocabulary.mockResolvedValue(vocabPage([word({ status: 'weak' })]))
    mountPage('flashcard')
    await flushPromises()
    expect(getVocabulary).toHaveBeenCalledWith(expect.objectContaining({ status: 'weak', offset: 0 }))
  })

  it('reloads for the chosen filter and for a search (after a short pause)', async () => {
    getVocabulary.mockResolvedValue(vocabPage([word()]))
    const w = mountPage('quiz')
    await flushPromises()
    await w.find('[data-test="tab-words"]').trigger('click')
    await flushPromises()

    await w.find('[data-test="vocab-filter-learned"]').trigger('click')
    await flushPromises()
    expect(getVocabulary).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'learned' }))

    vi.useFakeTimers()
    await w.find('[data-test="vocab-search"]').setValue('doo')
    await w.find('[data-test="vocab-search"]').setValue('door')
    vi.advanceTimersByTime(400)
    vi.useRealTimers()
    await flushPromises()
    const searches = getVocabulary.mock.calls.filter((c) => c[0].search === 'door')
    expect(searches).toHaveLength(1) // typing twice quickly asks once
  })

  it('starts a study round with the words the filter shows', async () => {
    getVocabulary.mockResolvedValue(vocabPage([word({ status: 'weak' })]))
    const w = mountPage('quiz')
    await flushPromises()
    await w.find('[data-test="tab-words"]').trigger('click')
    await flushPromises()
    await w.find('[data-test="vocab-filter-weak"]').trigger('click')
    await flushPromises()

    await w.find('[data-test="vocab-study"]').trigger('click')
    expect(push).toHaveBeenCalledWith({ path: '/flashcards/history/words/study', query: { status: 'weak' } })
  })

  it('shows a friendly empty state before anything was practised, and an error with a retry', async () => {
    getVocabulary.mockResolvedValue(vocabPage([], { total: 0, learned: 0, weak: 0 }))
    const w = mountPage('quiz')
    await flushPromises()
    await w.find('[data-test="tab-words"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="vocab-empty"]').exists()).toBe(true)

    getVocabulary.mockRejectedValueOnce(new Error('boom'))
    await w.find('[data-test="vocab-filter-weak"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="vocab-error"]').exists()).toBe(true)
  })
})
