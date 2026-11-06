import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { vocabulary } from '@/data/vocabulary'

// The learner's UI language — mocked (and switchable per test) so the composable is
// deterministic without a mounted i18n instance.
const ui = vi.hoisted(() => ({ locale: 'vi' }))
vi.mock('@/composables/useLocale', () => ({
  useLocale: () => ({ locale: { get value() { return ui.locale } } }),
}))

import { useVocabulary } from './useVocabulary'
import { useLearningLanguage } from './useLearningLanguage'

const englishWords = new Set(vocabulary.map((w) => w.en))
const vietnameseMeanings = new Set(vocabulary.map((w) => w.vi))

describe('useVocabulary', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    ui.locale = 'vi'
    useLearningLanguage().setLanguage('en') // study English terms
  })

  it('generateMCQuestions builds N questions whose options include the correct answer', () => {
    const { generateMCQuestions } = useVocabulary()
    const qs = generateMCQuestions(5)
    expect(qs).toHaveLength(5)
    for (const q of qs) {
      expect(q.options).toContain(q.correctAnswer)
      expect(q.options).toHaveLength(4) // correct + 3 distractors
      expect(new Set(q.options).size).toBe(4) // no duplicate options
      expect(q.question).toContain(q.termDisplay)
    }
  })

  it('generateTFQuestions explains the true meaning regardless of the shown statement', () => {
    const { generateTFQuestions } = useVocabulary()
    const qs = generateTFQuestions(6)
    expect(qs).toHaveLength(6)
    for (const q of qs) {
      expect(typeof q.isTrue).toBe('boolean')
      expect(q.statement).toContain(q.termDisplay)
      expect(q.explanation).toContain(q.meaningDisplay) // always the correct meaning
    }
  })

  it('generateMatchingPairs returns term/definition pairs tied to a vocab word', () => {
    const { generateMatchingPairs } = useVocabulary()
    const pairs = generateMatchingPairs(8)
    expect(pairs).toHaveLength(8)
    for (const p of pairs) {
      expect(p.term.length).toBeGreaterThan(0)
      expect(p.definition.length).toBeGreaterThan(0)
      expect(p.vocabWord).toBeDefined()
    }
  })

  it('getRandomWords does not repeat within a single batch', () => {
    const { getRandomWords } = useVocabulary()
    const words = getRandomWords(12)
    const ids = words.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('useVocabulary — the answers are never in the language of the question', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useLearningLanguage().setLanguage('en')
  })

  it('an English interface learning English still gets Vietnamese meanings as the options', () => {
    ui.locale = 'en'
    const { generateMCQuestions, meaningLang } = useVocabulary()
    expect(meaningLang.value).toBe('vi')
    const qs = generateMCQuestions(8)
    for (const q of qs) {
      expect(englishWords.has(q.termDisplay)).toBe(true) // the question word is English…
      expect(q.correctAnswer).toBe(q.vocabWord.vi) // …its answer is the Vietnamese meaning…
      for (const option of q.options) expect(vietnameseMeanings.has(option)).toBe(true) // …and so are all the options
      expect(q.question).toBe(`What does "${q.termDisplay}" mean?`) // question text follows the interface
    }
  })

  it('a Vietnamese interface keeps Vietnamese options and a Vietnamese question', () => {
    ui.locale = 'vi'
    const { generateMCQuestions } = useVocabulary()
    const q = generateMCQuestions(1)[0]!
    expect(q.question).toBe(`Từ "${q.termDisplay}" nghĩa là gì?`)
    expect(q.correctAnswer).toBe(q.vocabWord.vi)
  })

  it('a Chinese interface shows Chinese meanings', () => {
    ui.locale = 'zh'
    const { generateMCQuestions } = useVocabulary()
    const q = generateMCQuestions(1)[0]!
    expect(q.correctAnswer).toMatch(/[一-鿿]/)
  })

  it('matching pairs and true/false follow the same rule', () => {
    ui.locale = 'en'
    const { generateMatchingPairs, generateTFQuestions } = useVocabulary()
    for (const p of generateMatchingPairs(8)) expect(p.definition).toBe(p.vocabWord.vi)
    for (const q of generateTFQuestions(6)) expect(q.meaningDisplay).toBe(q.vocabWord.vi)
  })

  it('learning Chinese with an English interface shows English meanings', () => {
    ui.locale = 'en'
    useLearningLanguage().setLanguage('zh')
    const { generateMCQuestions } = useVocabulary()
    const q = generateMCQuestions(1)[0]!
    expect(q.correctAnswer).toBe(q.vocabWord.en)
    expect(q.termDisplay).toMatch(/[一-鿿]/)
  })
})
