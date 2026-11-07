import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'
import ExamResult from './ExamResult.vue'
import type { ExamResultView } from '@/types/content'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en }, missingWarn: false, fallbackWarn: false })

const result = (over: Partial<ExamResultView> = {}): ExamResultView => ({
  total: 60,
  correct: 48,
  score_percent: 80,
  estimated_band: '7.0',
  level: 'C1 — Advanced',
  overall_band: 7,
  skills: [
    { skill: 'Listening', correct: 25, total: 30, band: 7 },
    { skill: 'Reading', correct: 23, total: 30, band: 7 },
    { skill: 'Writing', correct: null, total: null, band: 6.5 },
  ],
  breakdown: [
    { section: 'Listening Part 1', correct: 7, total: 8 },
    { section: 'Reading Passage 2', correct: 6, total: 10 },
  ],
  recommendations: ['Practise timed reading'],
  weak_areas: ['Reading Passage 2'],
  ...over,
})

const mountResult = (r: ExamResultView = result()) =>
  mount(ExamResult, { props: { result: r, examType: 'ielts' }, global: { plugins: [i18n] } })

describe('ExamResult (component)', () => {
  it('shows the overall band, the level and a band for each skill', () => {
    const w = mountResult()
    expect(w.find('[data-test="overall-band"]').text()).toBe('7.0')
    expect(w.text()).toContain('C1 — Advanced')
    expect(w.text()).toContain('IELTS')
    const bands = w.find('[data-test="skill-bands"]').text()
    expect(bands).toContain('Listening')
    expect(bands).toContain('25/30 correct')
    expect(bands).toContain('6.5') // Writing
  })

  it('names each part of the breakdown and lists a recommendation', () => {
    const w = mountResult()
    expect(w.text()).toContain('Listening · Part 1')
    expect(w.text()).toContain('Reading · Passage 2')
    expect(w.text()).toContain('Practise timed reading')
  })

  it('labels the AI-estimated mock-exam result as AI-generated', () => {
    const w = mountResult()
    expect(w.find('[data-test="ai-generated-badge"]').exists()).toBe(true)
    expect(w.text()).toContain('not a final grade')
    expect(w.text()).toContain('official IELTS conversion tables')
  })

  it('still shows older results that only have a band range', () => {
    const w = mountResult(result({ overall_band: undefined, skills: undefined, estimated_band: '6.0–6.5' }))
    expect(w.find('[data-test="overall-band"]').text()).toBe('6.0–6.5')
    expect(w.find('[data-test="skill-bands"]').text()).toBe('')
  })

  it('shows the examiner-style feedback of each Writing task, Task Response for Task 2', () => {
    const w = mountResult(
      result({
        writing_feedback: [
          {
            task: 'writing-task1', band: 6, words: 160,
            criteria: [{ key: 'task_achievement', band: 6, comment: 'Overview is clear.' }],
            strengths: ['Good overview'], improvements: ['Compare more'],
          },
          {
            task: 'writing-task2', band: 7, words: 270,
            criteria: [{ key: 'task_achievement', band: 7, comment: 'Fully addressed.' }],
            strengths: [], improvements: [],
          },
        ],
      }),
    )
    const fb1 = w.find('[data-test="feedback-writing-task1"]').text()
    expect(fb1).toContain('Task Achievement')
    expect(fb1).toContain('Overview is clear.')
    expect(fb1).toContain('160 words')
    expect(fb1).toContain('Good overview')
    expect(fb1).toContain('Compare more')
    expect(w.find('[data-test="feedback-writing-task2"]').text()).toContain('Task Response')
  })

  it('says so when the Writing could not be marked, instead of inventing a band', () => {
    const w = mountResult(result({ writing_responses: [{ task: 'writing-task1', question: 'q', text: 'some words here' }] }))
    expect(w.find('[data-test="writing-not-marked"]').exists()).toBe(true)
    expect(w.find('[data-test="writing-feedback"]').exists()).toBe(false)
  })

  it('reviews option answers and typed answers', async () => {
    const w = mountResult(
      result({
        review: [
          { question_id: 1, section: 'Listening Part 1', type: 'form-completion', question: 'Name: ______', options: [], selected: null, written: 'Jon', is_correct: false, correct_answer: -1, accepted_answers: ['John'], explanation: 'Spelled out.' },
          { question_id: 2, section: 'Reading Passage 1', type: 'multiple-choice', question: 'Why?', options: ['a', 'b', 'c'], selected: 0, written: null, is_correct: false, correct_answer: 2, accepted_answers: [], explanation: '' },
        ],
      }),
    )
    await w.find('button[aria-expanded]').trigger('click')
    const text = w.text()
    expect(text).toContain('Jon')
    expect(text).toContain('John')
    expect(text).toContain('Spelled out.')
    expect(text).toContain('Why?')
  })

  it('emits retry / schedule from the action buttons', async () => {
    const w = mountResult()
    const buttons = w.findAll('button').filter((b) => !b.attributes('aria-expanded'))
    await buttons[0]?.trigger('click')
    await buttons[1]?.trigger('click')
    expect(w.emitted('retry')).toBeTruthy()
    expect(w.emitted('schedule')).toBeTruthy()
  })
})
