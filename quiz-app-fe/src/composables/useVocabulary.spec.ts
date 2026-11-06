import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { vocabulary } from '@/data/vocabulary'

// The learner's UI language — mocked (and switchable per test) so the composable is
// deterministic without a mounted i18n instance.
const ui = vi.hoisted(() => ({ locale: 'vi' }))
vi.mock('@/composables/useLocale', () => ({
  useLocale: () => ({ locale: { get value() { return ui.locale } } }),
}))

vi.mock('@/utils/api', () => ({ api: { generateVocabulary: vi.fn() } }))

import { useVocabulary, sourceOfWords } from './useVocabulary'
import { api } from '@/utils/api'
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

const generateVocabulary = api.generateVocabulary as unknown as ReturnType<typeof vi.fn>
const aiItems = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    term: `aiword${i}`,
    meaning: `nghĩa ${i}`,
    explanation: 'e',
    example: 'x',
  }))

describe('useVocabulary — rounds prepared by the AI', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    ui.locale = 'en'
    useLearningLanguage().setLanguage('en')
    generateVocabulary.mockReset()
  })

  it('builds a multiple-choice round from the AI words: English terms, Vietnamese answers', async () => {
    generateVocabulary.mockResolvedValue(aiItems(12))
    const { generateMCQuestionsAi } = useVocabulary()
    const qs = await generateMCQuestionsAi(5)

    expect(generateVocabulary).toHaveBeenCalledWith(
      expect.objectContaining({ learningLang: 'en', uiLang: 'vi' }), // meanings are asked in the meaning language
    )
    expect(qs).toHaveLength(5)
    for (const q of qs) {
      expect(q.termDisplay).toMatch(/^aiword\d+$/)
      expect(q.correctAnswer).toMatch(/^nghĩa \d+$/)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options).toContain(q.correctAnswer)
      expect(q.question).toBe(`What does "${q.termDisplay}" mean?`)
    }
    expect(sourceOfWords(qs.map((q) => q.vocabWord))).toBe('ai')
  })

  it('plays with the built-in words when the AI is not available', async () => {
    generateVocabulary.mockRejectedValue(new Error('503'))
    const { generateMCQuestionsAi } = useVocabulary()
    const qs = await generateMCQuestionsAi(5)

    expect(qs).toHaveLength(5)
    expect(englishWords.has(qs[0]!.termDisplay)).toBe(true)
    expect(sourceOfWords(qs.map((q) => q.vocabWord))).toBe('builtin')
  })

  it('does not trust an AI answer with too few usable words', async () => {
    generateVocabulary.mockResolvedValue([...aiItems(2), { term: '', meaning: 'x' }, { term: 'noMeaning', meaning: ' ' }])
    const { generateMCQuestionsAi } = useVocabulary()
    const qs = await generateMCQuestionsAi(5)
    expect(sourceOfWords(qs.map((q) => q.vocabWord))).toBe('builtin')
  })

  it('tops a short AI answer up with built-in words so the round still has every question', async () => {
    generateVocabulary.mockResolvedValue(aiItems(5))
    const { generateMatchingPairsAi } = useVocabulary()
    const pairs = await generateMatchingPairsAi(8)

    expect(pairs).toHaveLength(8)
    expect(pairs.filter((p) => p.vocabWord.id < 0)).toHaveLength(5)
    expect(pairs.filter((p) => p.vocabWord.id > 0)).toHaveLength(3)
    expect(new Set(pairs.map((p) => p.term)).size).toBe(8)
  })

  it('drops duplicate AI words and asks the AI not to repeat the words of earlier rounds', async () => {
    generateVocabulary.mockResolvedValue([...aiItems(6), { term: 'AIWORD0', meaning: 'trùng' }])
    const { generateTFQuestionsAi } = useVocabulary()
    const first = await generateTFQuestionsAi(6)
    expect(new Set(first.map((q) => q.termDisplay.toLowerCase())).size).toBe(6)

    await generateTFQuestionsAi(6)
    const secondCall = generateVocabulary.mock.calls[1]![0] as { exclude: string[] }
    expect(secondCall.exclude).toContain('aiword0')
  })

  it('true/false shows a meaning taken from the same round when the statement is false', async () => {
    generateVocabulary.mockResolvedValue(aiItems(10))
    const { generateTFQuestionsAi } = useVocabulary()
    const qs = await generateTFQuestionsAi(10)
    for (const q of qs) {
      expect(q.explanation).toContain(q.meaningDisplay)
      expect(q.statement).toMatch(/nghĩa \d+/)
    }
  })

  it('speed round uses the same AI preparation', async () => {
    generateVocabulary.mockResolvedValue(aiItems(15))
    const { generateSpeedQuestionsAi } = useVocabulary()
    const qs = await generateSpeedQuestionsAi(8)
    expect(qs).toHaveLength(8)
    expect(sourceOfWords(qs.map((q) => q.vocabWord))).toBe('ai')
  })
})
