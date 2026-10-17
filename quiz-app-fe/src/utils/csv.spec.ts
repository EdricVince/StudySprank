import { describe, it, expect } from 'vitest'
import { cardsToCsv, parseCardsCsv, parseCsv } from './csv'

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
