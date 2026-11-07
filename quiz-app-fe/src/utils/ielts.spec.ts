import { describe, it, expect } from 'vitest'
import {
  bandLabelKey,
  cefrKey,
  countWords,
  hasSharedOptions,
  isTyped,
  optionLabel,
  overallBandOf,
  partNumber,
  partsOf,
  runsOf,
  skillOfSection,
} from './ielts'
import type { ExamQuestionView } from '@/types/content'

const q = (id: number, section: string, type: string, over: Partial<ExamQuestionView> = {}): ExamQuestionView => ({
  id, section, type, question: `Q${id}`, options: [], ...over,
})

describe('IELTS helpers', () => {
  it('finds the skill and the number of a section', () => {
    expect(skillOfSection('Listening Part 3')).toBe('Listening')
    expect(skillOfSection('Reading Passage 2')).toBe('Reading')
    expect(skillOfSection('Reading')).toBe('Reading')
    expect(skillOfSection('Writing')).toBe('Writing')
    expect(skillOfSection('Speaking')).toBeNull()
    expect(partNumber('Listening Part 3')).toBe(3)
    expect(partNumber('Reading')).toBe(1)
  })

  it('groups questions into parts, the script on the first question of each', () => {
    const parts = partsOf([
      q(1, 'Listening Part 1', 'form-completion', { passage: 'Anna: Hello' }),
      q(2, 'Listening Part 1', 'form-completion'),
      q(3, 'Listening Part 2', 'multiple-choice', { options: ['a', 'b', 'c'], passage: 'Welcome to' }),
      q(4, 'Writing', 'writing-task1', { passage: '{"type":"pie"}' }),
      q(5, 'Writing', 'writing-task2'),
    ])
    expect(parts.map((p) => [p.section, p.skill, p.number, p.questions.length])).toEqual([
      ['Listening Part 1', 'Listening', 1, 2],
      ['Listening Part 2', 'Listening', 2, 1],
      ['Writing', 'Writing', 1, 2],
    ])
    expect(parts[0]!.text).toBe('Anna: Hello')
    expect(parts[2]!.text).toBeNull() // the chart is not a script
  })

  it('treats a question without options as a typed answer, except in Writing', () => {
    expect(isTyped(q(1, 'Listening Part 1', 'form-completion'))).toBe(true)
    expect(isTyped(q(2, 'Reading', 'note-completion', { options: ['a', 'b', 'c', 'd'] }))).toBe(false) // older papers
    expect(isTyped(q(3, 'Writing', 'writing-task1'))).toBe(false)
  })

  it('makes runs of the same type and rubric, numbered from the given numbers', () => {
    const numbers = new Map([[1, 1], [2, 2], [3, 3], [4, 4]])
    const runs = runsOf(
      [
        q(1, 'Reading Passage 1', 'true-false-not-given', { instruction: 'Do the statements agree?' }),
        q(2, 'Reading Passage 1', 'true-false-not-given', { instruction: 'Do the statements agree?' }),
        q(3, 'Reading Passage 1', 'sentence-completion', { instruction: 'Complete.' }),
        q(4, 'Reading Passage 1', 'sentence-completion', { instruction: 'Complete.' }),
      ],
      (id) => numbers.get(id)!,
    )
    expect(runs.map((r) => [r.type, r.from, r.to, r.questions.length])).toEqual([
      ['true-false-not-given', 1, 2, 2],
      ['sentence-completion', 3, 4, 2],
    ])
    expect(runs[0]!.instruction).toBe('Do the statements agree?')
  })

  it('labels options with letters, or numerals for the list of headings', () => {
    expect(optionLabel('multiple-choice', 0)).toBe('A')
    expect(optionLabel('matching', 5)).toBe('F')
    expect(optionLabel('matching-headings', 0)).toBe('i')
    expect(optionLabel('matching-headings', 3)).toBe('iv')
    expect(hasSharedOptions('matching')).toBe(true)
    expect(hasSharedOptions('matching-headings')).toBe(true)
    expect(hasSharedOptions('multiple-choice')).toBe(false)
  })

  it('counts words', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('  one  two\nthree ')).toBe(3)
  })

  it('reads the overall band of a sitting, also from the old range text', () => {
    expect(overallBandOf({ overall_band: 6.5, estimated_band: '6.0–6.5' })).toBe(6.5)
    expect(overallBandOf({ overall_band: null, estimated_band: '6.0–6.5' })).toBe(6.5)
    expect(overallBandOf({ overall_band: null, estimated_band: '8.0–9.0' })).toBe(8.5)
    expect(overallBandOf({ overall_band: null, estimated_band: '1.0–2.5' })).toBe(2)
    expect(overallBandOf({ overall_band: null, estimated_band: '7.0' })).toBe(7)
    expect(overallBandOf({ overall_band: null, estimated_band: null })).toBeNull()
  })

  it('maps a band to a label and a CEFR level', () => {
    expect(bandLabelKey(9)).toBe('expert')
    expect(bandLabelKey(6.5)).toBe('good')
    expect(bandLabelKey(0)).toBe('beginner')
    expect(cefrKey(8)).toBe('C2')
    expect(cefrKey(7)).toBe('C1')
    expect(cefrKey(5.5)).toBe('B2')
    expect(cefrKey(4)).toBe('B1')
    expect(cefrKey(0)).toBe('A1')
  })
})
