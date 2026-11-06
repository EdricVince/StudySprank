import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProgressStore } from '@/stores/progress.store'
import { useToast } from '@/composables/useToast'
import { useMeaningLanguage } from '@/composables/useMeaningLanguage'
import { api } from '@/utils/api'
import type { SessionSource, SessionWord } from '@/types/learning'

export interface QuizCompletion {
  modeId: string
  modeName: string
  score: number
  /** 0–100; clamped before it is sent (the API rejects anything else). */
  accuracy: number
  questionCount: number
  /** Every word / question of the game; saved with it so the learner can review them later. */
  words?: SessionWord[]
  /** Where the words came from (defaults to the built-in list). */
  source?: SessionSource
  /** Language the meanings are written in when it is fixed by the game (idioms, battle questions). */
  meaningLang?: string
  durationSeconds?: number
}

/** Turn a game's per-question results into the words stored in the learning history. */
export function wordsFromAnswers(
  answers: { termDisplay: string; meaningDisplay: string; isCorrect: boolean }[],
): SessionWord[] {
  return answers.map((a) => ({ term: a.termDisplay, meaning: a.meaningDisplay, isCorrect: a.isCorrect }))
}

/**
 * Shared "quiz finished" flow for every quiz mode: log the completion to the
 * server (XP / streak), save the game and its words to the learner's history, and toast the result.
 * `xpEarned` holds the XP the server actually awarded, so result screens show
 * the real number instead of a client-side estimate.
 */
export function useQuizCompletion() {
  const progressStore = useProgressStore()
  const toast = useToast()
  const { t } = useI18n()
  const { meaningLang, learningLang } = useMeaningLanguage()
  const xpEarned = ref(0)

  async function finishQuiz(game: QuizCompletion) {
    const accuracy = Math.min(100, Math.max(0, Math.round(game.accuracy || 0)))
    xpEarned.value = 0
    const result = await progressStore.logQuizCompletion(accuracy, game.questionCount)
    xpEarned.value = result?.xp_gained ?? 0
    if (game.words?.length) {
      api
        .saveLearningSession({
          kind: 'quiz',
          modeId: game.modeId,
          modeName: game.modeName,
          source: game.source ?? 'builtin',
          title: game.modeName,
          learningLang: learningLang.value,
          meaningLang: game.meaningLang ?? meaningLang.value,
          score: Math.max(0, Math.round(game.score)),
          xpEarned: xpEarned.value,
          durationSeconds: game.durationSeconds,
          words: game.words,
        })
        .catch(() => toast.warning(t('history.saveFailed')))
    }
    if (result?.throttled) toast.warning(t('quizPlay.throttled'))
    else if (result?.level_up) toast.success(t('quizPlay.levelUp', { level: result.new_level }))
    else if (result?.xp_gained) toast.success(t('quizPlay.xpToast', { xp: result.xp_gained }))
    else if (result?.capped) toast.info(t('quizPlay.capped'))
    return result
  }

  return { finishQuiz, xpEarned }
}
