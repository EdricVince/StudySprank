import type { LearningLanguage } from '@/composables/useLearningLanguage'

const KNOWN: readonly LearningLanguage[] = ['en', 'vi', 'zh']

/**
 * Tried in order when the app language is the very language being learned (an English interface
 * while learning English has nothing to translate into): the first one that is not the learning
 * language wins, so English is explained in Vietnamese, and Vietnamese in English.
 */
export const MEANING_FALLBACKS: readonly LearningLanguage[] = ['vi', 'en', 'zh']

/**
 * The language a word's meaning is shown in. It is the app language, except that it can never be
 * the language being learned — otherwise a question like `What does "door" mean?` would be
 * answered with other English words and the learner would have nothing to translate.
 */
export function resolveMeaningLang(ui: string, learning: LearningLanguage): LearningLanguage {
  const uiLang = KNOWN.find((l) => l === ui)
  if (uiLang && uiLang !== learning) return uiLang
  return MEANING_FALLBACKS.find((l) => l !== learning) ?? 'en'
}
