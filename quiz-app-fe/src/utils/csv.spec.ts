import { describe, it, expect } from 'vitest'
import { cardsToCsv, parseCardsCsv, parseCsv, parseQuestionsCsv, questionsCsvTemplate } from './csv'

describe('flashcard CSV', () => {
  it('reads a comma file with a header and a BOM', () => {
    const cards = parseCardsCsv('\uFEFFTerm,Definition\nhello,xin chào\ncat,con mèo\n')
    expect(cards).toEqual([
      { term: 'hello', definition: 'xin chào', example: undefined, image: undefined, audio: undefined },
      { term: 'cat', definition: 'con mèo', example: undefined, image: undefined, audio: undefined },
    ])
  })

  it('detects semicolon separators (Excel in many locales)', () => {
    expect(parseCardsCsv('apple;quả táo;I eat an apple')[0]).toMatchObject({
      term: 'apple', definition: 'quả táo', example: 'I eat an apple',
    })
  })

  it('handles quoted cells with commas, quotes and line breaks', () => {
    expect(parseCsv('"a, b","say ""hi""","line1\nline2"\r\nx,y,z')).toEqual([
      ['a, b', 'say "hi"', 'line1\nline2'],
      ['x', 'y', 'z'],
    ])
  })

  it('skips empty rows and rows without a term', () => {
    expect(parseCardsCsv('dog,chó\n\n,no term\n')).toHaveLength(1)
  })

  it('round-trips export → import', () => {
    const cards = [{ term: 'quote "x"', definition: 'a, b', example: 'ví dụ' }]
    expect(parseCardsCsv(cardsToCsv(cards))[0]).toMatchObject(cards[0]!)
  })
})

describe('test question CSV', () => {
  it('reads questions with a letter, a number or the option text as the correct answer', () => {
    const { questions, skipped } = parseQuestionsCsv(
      'Question,Option A,Option B,Option C,Option D,Correct,Points\n' +
      'Past of go?,goed,went,gone,going,B,2\n' +
      'Noun?,quickly,happy,table,run,3,\n' +
      'Capital of France?,Paris,Rome,,,Paris,1\n',
    )
    expect(skipped).toBe(0)
    expect(questions).toEqual([
      { question: 'Past of go?', options: ['goed', 'went', 'gone', 'going'], correct: 1, points: 2 },
      { question: 'Noun?', options: ['quickly', 'happy', 'table', 'run'], correct: 2, points: 1 },
      { question: 'Capital of France?', options: ['Paris', 'Rome'], correct: 0, points: 1 },
    ])
  })

  it('counts unusable rows instead of importing them', () => {
    const { questions, skipped } = parseQuestionsCsv(
      'Only one option?,yes,,,,A\n' + 'Unknown answer?,a,b,,,Z\n' + ',a,b,,,A\n' + 'Fine?,a,b,,,b\n',
    )
    expect(questions.map((q) => q.question)).toEqual(['Fine?'])
    expect(skipped).toBe(3)
  })

  it('keeps the right answer when a blank option column comes before it', () => {
    const { questions } = parseQuestionsCsv('Q?,a,,c,,C\n')
    expect(questions[0]).toMatchObject({ options: ['a', 'c'], correct: 1 })
  })

  it('the template can be read back by the importer', () => {
    const { questions, skipped } = parseQuestionsCsv(questionsCsvTemplate())
    expect(skipped).toBe(0)
    expect(questions).toHaveLength(2)
    expect(questions[0]).toMatchObject({ correct: 1 })
  })
})
