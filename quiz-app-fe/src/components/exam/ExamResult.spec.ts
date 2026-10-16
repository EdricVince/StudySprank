import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ExamResult from './ExamResult.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      exam: {
        estimatedBand: 'Estimated band', breakdown: 'Breakdown', weakAreas: 'Weak areas',
        recommendations: 'Recommendations', retry: 'Retry', goSchedule: 'Study schedule',
      },
    },
  },
})

const result = {
  total: 40,
  correct: 32,
  score_percent: 80,
  estimated_band: '7.0',
  level: 'B2',
  breakdown: [
    { section: 'Listening', correct: 16, total: 20 },
    { section: 'Reading', correct: 16, total: 20 },
  ],
  recommendations: ['Practise timed reading'],
  weak_areas: ['Speaking fluency'],
}

const mountResult = () =>
  mount(ExamResult, { props: { result, examType: 'ielts' }, global: { plugins: [i18n] } })

describe('ExamResult (component)', () => {
  it('renders the estimated band, level and score', () => {
    const w = mountResult()
    expect(w.text()).toContain('7.0') // estimated band
    expect(w.text()).toContain('80')  // score percent
    expect(w.text()).toContain('B2')  // CEFR level
    expect(w.text()).toContain('IELTS') // examType upper-cased
  })

  it('lists each breakdown section and a recommendation', () => {
    const w = mountResult()
    expect(w.text()).toContain('Listening')
    expect(w.text()).toContain('Reading')
    expect(w.text()).toContain('Practise timed reading')
  })

  it('labels the AI-estimated mock-exam result as AI-generated', () => {
    const w = mountResult()
    expect(w.find('[data-test="ai-generated-badge"]').exists()).toBe(true)
    expect(w.text()).toContain('not a final grade')
  })

  it('emits retry / schedule from the action buttons', async () => {
    const w = mountResult()
    const buttons = w.findAll('button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(w.emitted('retry')).toBeTruthy()
    expect(w.emitted('schedule')).toBeTruthy()
  })
})
