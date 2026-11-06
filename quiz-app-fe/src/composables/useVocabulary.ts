import { vocabulary, getWordInLang, type VocabWord } from '@/data/vocabulary'
import { useMeaningLanguage } from './useMeaningLanguage'
import { useLocale, type SupportedLocale } from './useLocale'
import { useQuizStore } from '@/stores/quiz.store'
import { api } from '@/utils/api'
import i18n from '@/i18n'
import type { MultipleChoiceQuestion, WordScrambleQuestion, MatchingPair, TrueFalseQuestion } from '@/types/quiz'

// A readable, sentence-style clue the learner reads before guessing the word. The sentence follows
// the app language; the meaning inside it is written in the meaning language.
function buildDescriptiveHint(word: VocabWord, ui: SupportedLocale, meaningLang: string): string {
  const { t, te } = i18n.global
  const key = `quizPlay.categories.${word.category}`
  const topic = te(key, ui) ? t(key, {}, { locale: ui }) : word.category
  return t('quizPlay.q.hint', { topic, meaning: getWordInLang(word, meaningLang) }, { locale: ui })
}

// Extended interfaces with vocab reference for results screen
export interface VocabMCQuestion extends MultipleChoiceQuestion {
  vocabWord: VocabWord
  termDisplay: string
  meaningDisplay: string
}

export interface VocabTFQuestion extends TrueFalseQuestion {
  vocabWord: VocabWord
  termDisplay: string
  meaningDisplay: string
}

export interface VocabScrambleQuestion extends WordScrambleQuestion {
  vocabWord: VocabWord
  termDisplay: string
  meaningDisplay: string
}

export interface VocabMatchingPair extends MatchingPair {
  vocabWord: VocabWord
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function scrambleWord(word: string): string[] {
  const letters = word.split('')
  // Ensure the scrambled version differs from the original
  let shuffled = shuffleArray(letters)
  let attempts = 0
  while (shuffled.join('') === word && attempts < 10) {
    shuffled = shuffleArray(letters)
    attempts++
  }
  return shuffled
}

export function useVocabulary() {
  // The question shows the term in the language being learned; the answers are its meaning in the
  // meaning language, which is never the learning language (see resolveMeaningLang).
  const { meaningLang, learningLang } = useMeaningLanguage()
  const { locale: uiLang } = useLocale()
  const quizStore = useQuizStore()
  const say = (key: string, params: Record<string, unknown> = {}) =>
    i18n.global.t(key, params, { locale: uiLang.value as SupportedLocale })

  // Pick words that haven't been seen recently; wraps around when all are seen
  function getRandomWords(count: number): VocabWord[] {
    const seenIds = quizStore.getSeenWordIds()
    const unseen = vocabulary.filter(w => !seenIds.has(w.id))
    const seenWords = vocabulary.filter(w => seenIds.has(w.id))

    let pool: VocabWord[]
    if (unseen.length >= count) {
      pool = unseen
    } else {
      // Not enough unseen words — mix in seen ones to fill up
      pool = [...unseen, ...seenWords]
    }

    const selected = shuffleArray(pool).slice(0, Math.min(count, vocabulary.length))
    quizStore.markWordsAsSeen(selected.map(w => w.id), vocabulary.length)
    return selected
  }

  function generateMCQuestions(count = 10): VocabMCQuestion[] {
    // Need at least 4 words for wrong answers
    const words = getRandomWords(Math.max(count, 4))
    return words.slice(0, count).map((word, i) => {
      const term = getWordInLang(word, learningLang.value)
      const correct = getWordInLang(word, meaningLang.value)
      const others = words.filter(w => w.id !== word.id)
      const wrongs = shuffleArray(others).slice(0, 3).map(w => getWordInLang(w, meaningLang.value))
      const options = shuffleArray([correct, ...wrongs])
      return {
        id: i + 1,
        question: say('quizPlay.q.whatMeans', { term }),
        options,
        correctAnswer: correct,
        explanation: say('quizPlay.q.means', { term, meaning: correct }),
        vocabWord: word,
        termDisplay: term,
        meaningDisplay: correct,
      }
    })
  }

  function generateTFQuestions(count = 10): VocabTFQuestion[] {
    const words = getRandomWords(Math.max(count, 4))
    return words.slice(0, count).map((word, i) => {
      const term = getWordInLang(word, learningLang.value)
      const correctMeaning = getWordInLang(word, meaningLang.value)
      const isTrue = Math.random() > 0.5
      let shownMeaning = correctMeaning
      if (!isTrue) {
        const others = vocabulary.filter(w => w.id !== word.id)
        const wrong = others[Math.floor(Math.random() * others.length)]
        if (wrong) shownMeaning = getWordInLang(wrong, meaningLang.value)
      }
      return {
        id: i + 1,
        statement: say('quizPlay.q.means', { term, meaning: shownMeaning }),
        isTrue,
        explanation: say('quizPlay.q.means', { term, meaning: correctMeaning }),
        vocabWord: word,
        termDisplay: term,
        meaningDisplay: correctMeaning,
      }
    })
  }

  function generateScrambleQuestions(count = 10): VocabScrambleQuestion[] {
    const words = getRandomWords(count)
    return words.map((word, i) => {
      const term = getWordInLang(word, learningLang.value)
      const meaning = getWordInLang(word, meaningLang.value)
      const canScramble = /^[a-zA-Z\s]+$/.test(term) && term.length > 2
      const scrambled = canScramble ? scrambleWord(term) : term.split('')
      return {
        id: i + 1,
        word: term,
        // A descriptive clue sentence to read and guess from — not the bare translation.
        hint: buildDescriptiveHint(word, uiLang.value as SupportedLocale, meaningLang.value),
        scrambled,
        vocabWord: word,
        termDisplay: term,
        meaningDisplay: meaning,
      }
    })
  }

  // AI batch: each word comes with a natural one-sentence explanation used as the
  // descriptive hint (and an example sentence). Falls back to [] on any error so the
  // caller can top up with the local generator.
  async function generateAiScrambleQuestions(count = 10, exclude: string[] = []): Promise<VocabScrambleQuestion[]> {
    try {
      const items = await api.generateVocabulary({
        learningLang: learningLang.value,
        uiLang: meaningLang.value,
        count: count + 5, // over-fetch: some terms won't be scrambleable single words
        exclude,
      })
      const usable = (items ?? []).filter((it) => it?.term && /^[a-zA-Z]{3,14}$/.test(it.term))
      return usable.slice(0, count).map((it, i) => {
        const word = it.term.toLowerCase()
        return {
          id: i + 1,
          word,
          hint: it.explanation?.trim() || it.meaning,
          example: it.example?.trim() || undefined,
          scrambled: scrambleWord(word),
          // Synthetic vocab word so the results table still has term/meaning to show.
          vocabWord: { id: -(i + 1), category: 'daily', en: word, vi: it.meaning, zh: it.meaning },
          termDisplay: word,
          meaningDisplay: it.meaning,
        }
      })
    } catch {
      return []
    }
  }

  function generateMatchingPairs(count = 8): VocabMatchingPair[] {
    const words = getRandomWords(count)
    return words.map((word, i) => ({
      id: i + 1,
      term: getWordInLang(word, learningLang.value),
      definition: getWordInLang(word, meaningLang.value),
      vocabWord: word,
    }))
  }

  function generateSpeedQuestions(count = 15): VocabMCQuestion[] {
    return generateMCQuestions(count)
  }

  return {
    meaningLang,
    learningLang,
    getRandomWords,
    generateMCQuestions,
    generateTFQuestions,
    generateScrambleQuestions,
    generateAiScrambleQuestions,
    generateMatchingPairs,
    generateSpeedQuestions,
    getWordInLang: (word: VocabWord, lang: string) => getWordInLang(word, lang),
  }
}
