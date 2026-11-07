import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'
import QuestionRun from './QuestionRun.vue'
import { runsOf } from '@/utils/ielts'
import type { ExamQuestionView } from '@/types/content'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en }, missingWarn: false, fallbackWarn: false })

const q = (id: number, type: string, over: Partial<ExamQuestionView> = {}): ExamQuestionView => ({
  id, section: 'Listening Part 1', type, question: `Q${id}`, options: [], instruction: 'Rubric text.', ...over,
})

const mountRun = (questions: ExamQuestionView[], selected: Record<number, number> = {}, written: Record<number, string> = {}) => {
  const [run] = runsOf(questions, (id) => id)
  return mount(QuestionRun, {
    props: { run: run!, numberOf: (id: number) => id, selected, written },
    global: { plugins: [i18n] },
  })
}

describe('QuestionRun', () => {
  it('shows the range, the type and the rubric of the run', () => {
    const w = mountRun([q(1, 'form-completion', { question: 'Name: ______' }), q(2, 'form-completion', { question: 'Date: ______' })])
    expect(w.text()).toContain('Questions 1–2')
    expect(w.text()).toContain('Form completion')
    expect(w.text()).toContain('Rubric text.')
  })

  it('puts a text box in the gap of a typed question and reports what is typed', async () => {
    const w = mountRun([q(1, 'form-completion', { question: 'Name of the tour: ______ Gardens' })], {}, { 1: 'Kew' })
    const input = w.find('[data-test="answer-1"]')
    expect((input.element as HTMLInputElement).value).toBe('Kew')
    expect(w.text()).toContain('Name of the tour:')
    expect(w.text()).toContain('Gardens')
    await input.setValue('Royal')
    expect(w.emitted('write')?.[0]).toEqual([1, 'Royal'])
  })

  it('still gives a typed question without a gap a text box', () => {
    const w = mountRun([q(1, 'short-answer', { question: 'What is the fee?' })])
    expect(w.find('[data-test="answer-1"]').exists()).toBe(true)
  })

  it('lets the student pick one option of a multiple-choice question', async () => {
    const w = mountRun([q(1, 'multiple-choice', { options: ['one', 'two', 'three'] })], { 1: 1 })
    const buttons = w.findAll('[data-test^="option-1-"]')
    expect(buttons.map((b) => b.text())).toEqual(['Aone', 'Btwo', 'Cthree'])
    expect(buttons[1]!.attributes('aria-pressed')).toBe('true')
    await buttons[2]!.trigger('click')
    expect(w.emitted('select')?.[0]).toEqual([1, 2])
  })

  it('offers True / False / Not Given as three buttons', async () => {
    const w = mountRun([q(1, 'true-false-not-given', { options: ['True', 'False', 'Not Given'] })])
    const buttons = w.findAll('[data-test^="option-1-"]')
    expect(buttons.map((b) => b.text())).toEqual(['True', 'False', 'Not Given'])
    await buttons[2]!.trigger('click')
    expect(w.emitted('select')?.[0]).toEqual([1, 2])
  })

  it('shows a matching list once and a drop-down per question with its letters', async () => {
    const list = ['Library', 'Gym', 'Cafe', 'Pool']
    const w = mountRun([q(1, 'matching', { options: list }), q(2, 'matching', { options: list })])
    expect(w.find('[data-test="shared-1"]').text()).toContain('Library')
    expect(w.find('[data-test="shared-1"]').text()).toContain('D')
    const select = w.find('select[data-test="answer-2"]')
    expect(select.findAll('option').map((o) => o.text())).toEqual(['—', 'A', 'B', 'C', 'D'])
    await select.setValue('3')
    expect(w.emitted('select')?.[0]).toEqual([2, 3])
  })

  it('numbers the list of headings with roman numerals', () => {
    const headings = ['Origins', 'Growth', 'Decline']
    const w = mountRun([q(1, 'matching-headings', { question: 'Paragraph A', options: headings })])
    const shared = w.find('[data-test="shared-1"]').text()
    expect(shared).toContain('i')
    expect(shared).toContain('Origins')
    expect(shared).toContain('List of headings')
    expect(w.find('select[data-test="answer-1"]').findAll('option').map((o) => o.text())).toEqual(['—', 'i', 'ii', 'iii'])
  })
})
