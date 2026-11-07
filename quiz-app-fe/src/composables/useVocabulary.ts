import { vocabulary, getWordInLang, type VocabWord } from '@/data/vocabulary'
import { useMeaningLanguage } from './useMeaningLanguage'
import { useLocale, type SupportedLocale } from './useLocale'
import { useQuizDirection, directionOfQuestion } from './useQuizDirection'
import { useQuizStore } from '@/stores/quiz.store'
import { api } from '@/utils/api'
import i18n from '@/i18n'
import type { MultipleChoiceQuestion, WordScrambleQuestion, MatchingPair, TrueFalseQuestion } from '@/types/quiz'
import type { SessionSource } from '@/types/learning'

/** How long a game waits for the AI before it plays with the built-in words instead. */
const AI_TIMEOUT_MS = 15000
/** Fewest AI words a round needs (a multiple-choice question needs the right answer and three others). */
const MIN_AI_WORDS = 4

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) },
    )
  })
}

/** 'ai' when any word of the round was made by the AI (those have negative ids), else 'builtin'. */
export function sourceOfWords(words: ({ id: number } | undefined)[]): SessionSource {
  return words.some((w) => w && w.id < 0) ? 'ai' : 'builtin'
}

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
  const { direction } = useQuizDirection()
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

  function generateMCQuestions(count = 10, pool?: VocabWord[]): VocabMCQuestion[] {
    // Need at least 4 words for wrong answers
    const words = pool ?? getRandomWords(Math.max(count, 4))
    return words.slice(0, count).map((word, i) => {
      const term = getWordInLang(word, learningLang.value)
      const meaning = getWordInLang(word, meaningLang.value)
      // 'meaning': show the word, pick its meaning. 'term': show the meaning, pick the word.
      const toTerm = directionOfQuestion(direction.value) === 'term'
      const lang = toTerm ? learningLang.value : meaningLang.value
      const correct = toTerm ? term : meaning
      const others = words.filter(w => w.id !== word.id)
      const wrongs = [...new Set(shuffleArray(others).map(w => getWordInLang(w, lang)))]
        .filter(m => m && m !== correct)
        .slice(0, 3)
      // Two words of a round can share a meaning: complete the options from the built-in list.
      for (const w of shuffleArray(vocabulary)) {
        if (wrongs.length >= 3) break
        const m = getWordInLang(w, lang)
        if (m !== correct && !wrongs.includes(m)) wrongs.push(m)
      }
      const options = shuffleArray([correct, ...wrongs])
      return {
        id: i + 1,
        question: toTerm ? say('quizPlay.q.whichWord', { meaning }) : say('quizPlay.q.whatMeans', { term }),
        options,
        correctAnswer: correct,
        explanation: say('quizPlay.q.means', { term, meaning }),
        vocabWord: word,
        termDisplay: term,
        meaningDisplay: meaning,
      }
    })
  }

  function generateTFQuestions(count = 10, pool?: VocabWord[]): VocabTFQuestion[] {
    const words = pool ?? getRandomWords(Math.max(count, 4))
    return words.slice(0, count).map((word, i) => {
      const term = getWordInLang(word, learningLang.value)
      const correctMeaning = getWordInLang(word, meaningLang.value)
      const isTrue = Math.random() > 0.5
      let shownMeaning = correctMeaning
      if (!isTrue) {
        const others = words.filter(w => w.id !== word.id && getWordInLang(w, meaningLang.value) !== correctMeaning)
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

  function generateMatchingPairs(count = 8, pool?: VocabWord[]): VocabMatchingPair[] {
    const words = pool ?? getRandomWords(count)
    return words.map((word, i) => ({
      id: i + 1,
      term: getWordInLang(word, learningLang.value),
      definition: getWordInLang(word, meaningLang.value),
      vocabWord: word,
    }))
  }

  function generateSpeedQuestions(count = 15, pool?: VocabWord[]): VocabMCQuestion[] {
    return generateMCQuestions(count, pool)
  }

  // ── Rounds made by the AI ──────────────────────────────────────────────────
  // Fresh words every round (the API rotates topics and skips the words asked recently). When the AI
  // is not configured, is slow or fails, the round is played with the built-in words instead.
  async function loadAiWords(count: number): Promise<VocabWord[]> {
    try {
      const items = await withTimeout(
        api.generateVocabulary({
          learningLang: learningLang.value,
          uiLang: meaningLang.value,
          count: Math.min(count + 2, 30), // a little extra: duplicates and unusable items are dropped
          exclude: quizStore.getRecentAiTerms(),
        }),
        AI_TIMEOUT_MS,
      )
      const learning = learningLang.value
      const meaning = meaningLang.value
      const seen = new Set<string>()
      const words: VocabWord[] = []
      for (const item of items ?? []) {
        const term = item?.term?.trim()
        const meaningText = item?.meaning?.trim()
        if (!term || !meaningText || seen.has(term.toLowerCase())) continue
        seen.add(term.toLowerCase())
        words.push({ id: -(words.length + 1), category: 'daily', en: '', vi: '', zh: '', [learning]: term, [meaning]: meaningText } as VocabWord)
      }
      quizStore.rememberAiTerms(words.map((w) => getWordInLang(w, learning)))
      return words
    } catch {
      return []
    }
  }

  async function preparePool(needed: number): Promise<VocabWord[]> {
    const ai = await loadAiWords(needed)
    if (ai.length < MIN_AI_WORDS) return getRandomWords(needed)
    return ai.length >= needed ? ai.slice(0, needed) : [...ai, ...getRandomWords(needed - ai.length)]
  }

  const generateMCQuestionsAi = async (count = 10) =>
    generateMCQuestions(count, await preparePool(Math.max(count, MIN_AI_WORDS)))
  const generateTFQuestionsAi = async (count = 10) =>
    generateTFQuestions(count, await preparePool(Math.max(count, MIN_AI_WORDS)))
  const generateSpeedQuestionsAi = async (count = 15) =>
    generateSpeedQuestions(count, await preparePool(Math.max(count, MIN_AI_WORDS)))
  const generateMatchingPairsAi = async (count = 8) =>
    generateMatchingPairs(count, await preparePool(count))

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
    generateMCQuestionsAi,
    generateTFQuestionsAi,
    generateSpeedQuestionsAi,
    generateMatchingPairsAi,
    getWordInLang: (word: VocabWord, lang: string) => getWordInLang(word, lang),
  }
}
