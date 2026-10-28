import { describe, it, expect } from 'vitest'
import { parseCardLines, cardsToLines } from './deckText'

describe('parseCardLines', () => {
  it('reads one card per line with | as the usual separator', () => {
    expect(parseCardLines('apple | quả táo\nbook | sách')).toEqual([
      { term: 'apple', definition: 'quả táo' },
      { term: 'book', definition: 'sách' },
    ])
  })

  it('also accepts a tab, a dash or a colon, using the first separator on the line', () => {
    expect(parseCardLines('cat\tcon mèo')).toEqual([{ term: 'cat', definition: 'con mèo' }])
    expect(parseCardLines('dog - con chó')).toEqual([{ term: 'dog', definition: 'con chó' }])
    expect(parseCardLines('run: chạy - đi nhanh')).toEqual([{ term: 'run', definition: 'chạy - đi nhanh' }])
  })

  it('keeps hyphenated terms intact and skips blank or definition-less lines', () => {
    expect(parseCardLines('well-known | nổi tiếng\n\nlonely\n  \n| nothing')).toEqual([
      { term: 'well-known', definition: 'nổi tiếng' },
    ])
  })

  it('round-trips through cardsToLines', () => {
    const cards = [{ term: 'sun', definition: 'mặt trời' }]
    expect(parseCardLines(cardsToLines(cards))).toEqual(cards)
  })
})

describe('cards with an example sentence', () => {
  it('reads a third |-separated column as the example', () => {
    expect(parseCardLines('apple | quả táo | I ate an apple.')).toEqual([
      { term: 'apple', definition: 'quả táo', example: 'I ate an apple.' },
    ])
  })

  it('round-trips cards that have an example', () => {
    const cards = [{ term: 'sun', definition: 'mặt trời', example: 'The sun is bright.' }]
    expect(parseCardLines(cardsToLines(cards))).toEqual(cards)
  })

  it('a pipe inside the term-less separators does not invent an example', () => {
    expect(parseCardLines('run: chạy | bộ')).toEqual([{ term: 'run', definition: 'chạy | bộ' }])
  })
})
