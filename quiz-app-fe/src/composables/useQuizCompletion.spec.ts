import { describe, it, expect, beforeEach, vi } from 'vitest'

const progress = vi.hoisted(() => ({ logQuizCompletion: vi.fn() }))
vi.mock('@/stores/progress.store', () => ({ useProgressStore: () => progress }))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/composables/useMeaningLanguage', () => ({
  useMeaningLanguage: () => ({ meaningLang: { value: 'vi' }, learningLang: { value: 'en' } }),
}))

vi.mock('@/utils/api', () => ({ api: { saveLearningSession: vi.fn() } }))

import { useQuizCompletion, wordsFromAnswers } from './useQuizCompletion'
import { api } from '@/utils/api'

const save = api.saveLearningSession as unknown as ReturnType<typeof vi.fn>

describe('wordsFromAnswers', () => {
  it('maps a game’s per-question results to history words', () => {
    expect(wordsFromAnswers([{ termDisplay: 'door', meaningDisplay: 'cửa', isCorrect: true }])).toEqual([
      { term: 'door', meaning: 'cửa', isCorrect: true },
    ])
  })
})

describe('useQuizCompletion — saving the game to the history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    progress.logQuizCompletion.mockResolvedValue({ xp_gained: 15 })
    save.mockResolvedValue({ id: 1 })
  })

  const game = {
    modeId: 'multiple-choice', modeName: 'Multiple Choice', score: 300, accuracy: 66.7, questionCount: 3,
    words: [{ term: 'door', meaning: 'cửa', isCorrect: true }],
  }

  it('saves the words with the languages, score and the XP the server really awarded', async () => {
    const { finishQuiz, xpEarned } = useQuizCompletion()
    await finishQuiz({ ...game, durationSeconds: 40 })

    expect(progress.logQuizCompletion).toHaveBeenCalledWith(67, 3)
    expect(xpEarned.value).toBe(15)
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'quiz', modeId: 'multiple-choice', source: 'builtin', learningLang: 'en', meaningLang: 'vi',
        score: 300, xpEarned: 15, durationSeconds: 40, words: game.words,
      }),
    )
  })

  it('keeps the source of the words (e.g. AI)', async () => {
    await useQuizCompletion().finishQuiz({ ...game, source: 'ai' })
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ source: 'ai' }))
  })

  it('saves nothing for a game that has no words', async () => {
    await useQuizCompletion().finishQuiz({ ...game, words: [] })
    expect(save).not.toHaveBeenCalled()
  })

  it('tells the learner when the history could not be saved, without failing the game', async () => {
    save.mockRejectedValueOnce(new Error('offline'))
    await expect(useQuizCompletion().finishQuiz(game)).resolves.toBeDefined()
    await Promise.resolve()
    await Promise.resolve()
    expect(toast.warning).toHaveBeenCalledWith('history.saveFailed')
  })
})
