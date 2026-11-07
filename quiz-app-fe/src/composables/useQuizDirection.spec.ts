import { describe, it, expect, beforeEach } from 'vitest'
import { useQuizDirection, directionOfQuestion } from './useQuizDirection'

describe('directionOfQuestion', () => {
  it('uses a fixed direction as it is', () => {
    expect(directionOfQuestion('meaning')).toBe('meaning')
    expect(directionOfQuestion('term')).toBe('term')
  })

  it('flips a coin for mixed', () => {
    expect(directionOfQuestion('mixed', () => 0.1)).toBe('meaning')
    expect(directionOfQuestion('mixed', () => 0.9)).toBe('term')
  })
})

describe('useQuizDirection', () => {
  beforeEach(() => localStorage.clear())

  it('remembers the choice', () => {
    const { setDirection, direction } = useQuizDirection()
    setDirection('term')
    expect(direction.value).toBe('term')
    expect(localStorage.getItem('studyspark-quiz-direction')).toBe('term')
  })
})
