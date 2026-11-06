import { computed } from 'vue'
import { useLearningLanguage } from './useLearningLanguage'
import { useLocale } from './useLocale'
import { resolveMeaningLang } from '@/utils/meaningLanguage'

/** The language word meanings are shown in right now (see resolveMeaningLang). */
export function useMeaningLanguage() {
  const { current: learningLang } = useLearningLanguage()
  const { locale } = useLocale()
  const meaningLang = computed(() => resolveMeaningLang(locale.value as string, learningLang.value))
  return { meaningLang, learningLang }
}
