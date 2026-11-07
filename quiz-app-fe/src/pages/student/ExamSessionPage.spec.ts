import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

const push = vi.fn()
const route = vi.hoisted(() => ({ query: {} as Record<string, string> }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => route,
}))

vi.mock('@/utils/api', () => ({
  api: { generateExam: vi.fn(), submitExam: vi.fn(), getExamAttempt: vi.fn() },
}))

import ExamSessionPage from './ExamSessionPage.vue'
import { api } from '@/utils/api'

const generate = api.generateExam as unknown as ReturnType<typeof vi.fn>
const submit = api.submitExam as unknown as ReturnType<typeof vi.fn>
const getAttempt = api.getExamAttempt as unknown as ReturnType<typeof vi.fn>

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en }, missingWarn: false, fallbackWarn: false })

// The timer shows the seconds it was given and ends its skill when clicked.
const ExamTimerStub = {
  props: ['totalSeconds'],
  emits: ['timeout'],
  template: '<button data-test="skill-timer" :data-seconds="totalSeconds" @click="$emit(\'timeout\')">timer</button>',
}
const ListeningPlayerStub = { props: ['script', 'label'], template: '<div data-test="listening-player">{{ script }}</div>' }

const mountPage = () =>
  mount(ExamSessionPage, {
    global: {
      plugins: [i18n],
      stubs: { ExamTimer: ExamTimerStub, ListeningPlayer: ListeningPlayerStub, Teleport: true },
    },
  })

const chart = JSON.stringify({ type: 'bar-grouped', title: 'Chart', yLabel: '%', yMax: 100, categories: ['a', 'b', 'c'], series: [{ name: 's', color: '#111', values: [1, 2, 3] }] })
const paper = {
  session_id: '41',
  paper_id: 9,
  theme: 'Environment & Ecology',
  variant: 1,
  exam_type: 'ielts',
  time_limit: 150,
  skill_minutes: { Listening: 30, Reading: 60, Writing: 60 },
  questions: [
    { id: 1, section: 'Listening Part 1', type: 'form-completion', passage: 'Anna: Hello there', instruction: 'Complete the form.', question: 'Name: ______', options: [] },
    { id: 2, section: 'Listening Part 1', type: 'form-completion', passage: null, instruction: 'Complete the form.', question: 'Date: ______', options: [] },
    { id: 3, section: 'Listening Part 2', type: 'multiple-choice', passage: 'Welcome everyone', instruction: 'Choose.', question: 'Where is the cafe?', options: ['Left', 'Right', 'Upstairs'] },
    { id: 4, section: 'Reading Passage 1', type: 'true-false-not-given', passage: 'The first passage text.', instruction: 'Agree?', question: 'Bees fly.', options: ['True', 'False', 'Not Given'] },
    { id: 5, section: 'Reading Passage 1', type: 'sentence-completion', passage: null, instruction: 'Complete.', question: 'Honey is ______.', options: [] },
    { id: 6, section: 'Writing', type: 'writing-task1', passage: chart, question: 'You should spend about 20 minutes.\n\nThe chart shows data.', options: [] },
    { id: 7, section: 'Writing', type: 'writing-task2', passage: null, question: 'Write about the topic.', options: [] },
  ],
}

const resultView = {
  total: 5, correct: 3, score_percent: 60, estimated_band: '5.5', overall_band: 5.5, level: 'B2 — Upper-Intermediate',
  skills: [{ skill: 'Listening', correct: 2, total: 3, band: 6 }, { skill: 'Reading', correct: 1, total: 2, band: 5 }],
  breakdown: [{ section: 'Listening Part 1', correct: 2, total: 2 }], recommendations: ['Read more'], weak_areas: [],
}

const click = async (w: ReturnType<typeof mountPage>, sel: string) => { await w.find(sel).trigger('click'); await flushPromises() }

describe('ExamSessionPage — the IELTS test, one skill at a time', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = {}
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
    generate.mockResolvedValue(paper)
    submit.mockResolvedValue(resultView)
  })

  it('starts with Listening: its audio, its parts and a 30-minute timer — nothing from Reading', async () => {
    const w = mountPage()
    await flushPromises()

    expect(generate).toHaveBeenCalledWith({ variant: expect.any(Number) })
    expect(w.find('[data-test="skill-timer"]').attributes('data-seconds')).toBe(String(30 * 60))
    expect(w.find('[data-test="listening-player"]').text()).toContain('Anna: Hello there')
    expect(w.findAll('[data-test="part-tabs"] button')).toHaveLength(2)
    expect(w.text()).toContain('Questions 1–2')
    expect(w.text()).not.toContain('The first passage text.')
    expect(w.find('[data-test="skill-steps"]').text()).toContain('Writing')
  })

  it('keeps what is typed and picked, and counts answered questions per part', async () => {
    const w = mountPage()
    await flushPromises()
    await w.find('[data-test="answer-1"]').setValue('Kew')
    expect(w.findAll('[data-test="part-tabs"] button')[0]!.text()).toContain('1/2')

    await click(w, '[data-test="next-part"]')
    expect(w.text()).toContain('Where is the cafe?')
    await click(w, '[data-test="option-3-1"]')
    expect(w.find('[data-test="option-3-1"]').attributes('aria-pressed')).toBe('true')
    // back to part 1: the typed answer is still there
    await w.findAll('[data-test="part-tabs"] button')[0]!.trigger('click')
    expect((w.find('[data-test="answer-1"]').element as HTMLInputElement).value).toBe('Kew')
  })

  it('asks before leaving a skill, says how many questions are unanswered, and does not allow going back', async () => {
    const w = mountPage()
    await flushPromises()
    await w.find('[data-test="answer-1"]').setValue('Kew')
    await click(w, '[data-test="next-part"]')
    await click(w, '[data-test="finish-skill"]')

    expect(w.find('[data-test="finish-dialog"]').exists()).toBe(true)
    expect(w.find('[data-test="unanswered"]').text()).toContain('2 unanswered') // Q2 and Q3

    await click(w, '[data-test="confirm-finish"]')
    // Reading now: its passage and its own 60-minute timer; Listening is gone
    expect(w.find('[data-test="reading-passage"]').text()).toContain('The first passage text.')
    expect(w.find('[data-test="skill-timer"]').attributes('data-seconds')).toBe(String(60 * 60))
    expect(w.find('[data-test="listening-player"]').exists()).toBe(false)
    expect(w.find('[data-test="skill-steps"]').text()).toContain('✓')
    expect(w.find('[data-test="finish-dialog"]').exists()).toBe(false)
  })

  it('moves on by itself when the timer of a skill runs out', async () => {
    const w = mountPage()
    await flushPromises()
    await click(w, '[data-test="skill-timer"]') // Listening time is up
    expect(w.find('[data-test="reading-passage"]').exists()).toBe(true)
    await click(w, '[data-test="skill-timer"]') // Reading time is up
    expect(w.find('[data-test="writing-task-1"]').exists()).toBe(true)
    expect(submit).not.toHaveBeenCalled()
    await click(w, '[data-test="skill-timer"]') // Writing time is up: the test is handed in
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('shows the Task 1 chart and counts the words of each Writing task', async () => {
    const w = mountPage()
    await flushPromises()
    await click(w, '[data-test="skill-timer"]')
    await click(w, '[data-test="skill-timer"]')

    expect(w.find('[data-test="writing-task-1"]').text()).toContain('The chart shows data.')
    expect(w.find('svg').exists()).toBe(true)
    await w.find('[data-test="writing-input-1"]').setValue('one two three')
    expect(w.find('[data-test="word-count-1"]').text()).toBe('3 words')
    await click(w, '[data-test="task-tab-2"]')
    expect(w.find('[data-test="writing-task-2"]').text()).toContain('Write about the topic.')
  })

  it('submits typed, chosen and written answers with the question ids and the app language, then shows the result', async () => {
    const w = mountPage()
    await flushPromises()
    await w.find('[data-test="answer-1"]').setValue('Kew')
    await click(w, '[data-test="next-part"]')
    await click(w, '[data-test="option-3-2"]')
    await click(w, '[data-test="skill-timer"]') // → Reading
    await click(w, '[data-test="option-4-1"]')
    await w.find('[data-test="answer-5"]').setValue('sweet')
    await click(w, '[data-test="finish-skill"]')
    await click(w, '[data-test="confirm-finish"]') // → Writing
    await w.find('[data-test="writing-input-1"]').setValue('My description of the chart')
    await click(w, '[data-test="finish-skill"]')
    await click(w, '[data-test="confirm-finish"]')

    expect(submit).toHaveBeenCalledTimes(1)
    const body = submit.mock.calls[0]![0]
    expect(body.session_id).toBe('41')
    expect(body.language).toBe('en')
    expect(body.answers).toEqual(
      expect.arrayContaining([
        { question_id: 3, selected: 2 },
        { question_id: 4, selected: 1 },
        { question_id: 1, written: 'Kew' },
        { question_id: 5, written: 'sweet' },
        { question_id: 6, written: 'My description of the chart' },
      ]),
    )
    expect(body.answers).toHaveLength(5)
    expect(w.text()).toContain('IELTS Results')
    expect(w.find('[data-test="overall-band"]').text()).toBe('5.5')
  })

  it('keeps the answers and lets the student try again when submitting fails', async () => {
    submit.mockRejectedValueOnce(new Error('network'))
    const w = mountPage()
    await flushPromises()
    await click(w, '[data-test="skill-timer"]')
    await click(w, '[data-test="skill-timer"]')
    await w.find('[data-test="writing-input-1"]').setValue('my text')
    await click(w, '[data-test="skill-timer"]') // submit fails

    expect(w.find('[data-test="submit-error"]').exists()).toBe(true)
    expect((w.find('[data-test="writing-input-1"]').element as HTMLTextAreaElement).value).toBe('my text')

    await click(w, '[data-test="finish-skill"]')
    await click(w, '[data-test="confirm-finish"]')
    expect(submit).toHaveBeenCalledTimes(2)
    expect(submit.mock.calls[1]![0].answers).toEqual([{ question_id: 6, written: 'my text' }])
    expect(w.find('[data-test="overall-band"]').exists()).toBe(true)
  })

  it('re-sits a stored paper without asking for a new one', async () => {
    route.query = { paper: '9' }
    mountPage()
    await flushPromises()
    expect(generate).toHaveBeenCalledWith({ paper_id: 9 })
  })

  it('opens the saved result of a past sitting', async () => {
    route.query = { attempt: '12' }
    getAttempt.mockResolvedValue(resultView)
    const w = mountPage()
    await flushPromises()
    expect(getAttempt).toHaveBeenCalledWith(12)
    expect(generate).not.toHaveBeenCalled()
    expect(w.find('[data-test="overall-band"]').text()).toBe('5.5')
  })

  it('offers a retry when the paper cannot be generated', async () => {
    generate.mockRejectedValueOnce(new Error('503'))
    const w = mountPage()
    await flushPromises()
    expect(w.text()).toContain('Failed to Generate Exam')
    await w.find('button.bg-indigo-600').trigger('click')
    await flushPromises()
    expect(generate).toHaveBeenCalledTimes(2)
    expect(w.find('[data-test="skill-steps"]').exists()).toBe(true)
  })
})
