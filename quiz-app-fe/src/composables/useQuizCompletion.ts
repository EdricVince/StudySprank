import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProgressStore } from '@/stores/progress.store'
import { useQuizStore } from '@/stores/quiz.store'
import { useToast } from '@/composables/useToast'

export interface QuizCompletion {
  modeId: string
  modeName: string
  score: number
  /** 0–100; clamped before it is sent (the API rejects anything else). */
  accuracy: number
  questionCount: number
}

/**
 * Shared "quiz finished" flow for every quiz mode: log the completion to the
 * server (XP / streak), record it in the local history, and toast the result.
 * `xpEarned` holds the XP the server actually awarded, so result screens show
 * the real number instead of a client-side estimate.
 */
export function useQuizCompletion() {
  const progressStore = useProgressStore()
  const quizStore = useQuizStore()
  const toast = useToast()
  const { t } = useI18n()
  const xpEarned = ref(0)

  async function finishQuiz(game: QuizCompletion) {
    const accuracy = Math.min(100, Math.max(0, Math.round(game.accuracy || 0)))
    xpEarned.value = 0
    const result = await progressStore.logQuizCompletion(accuracy, game.questionCount)
    xpEarned.value = result?.xp_gained ?? 0
    quizStore.addGame({ ...game, accuracy, xpEarned: xpEarned.value })
    if (result?.throttled) toast.warning(t('quizPlay.throttled'))
    else if (result?.level_up) toast.success(t('quizPlay.levelUp', { level: result.new_level }))
    else if (result?.xp_gained) toast.success(t('quizPlay.xpToast', { xp: result.xp_gained }))
    else if (result?.capped) toast.info(t('quizPlay.capped'))
    return result
  }

  return { finishQuiz, xpEarned }
}
