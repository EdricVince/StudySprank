import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useQuizStore } from './quiz.store'

describe('quiz.store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('tracks seen word ids and wraps around once every word is seen', () => {
    const store = useQuizStore()
    store.markWordsAsSeen([1, 2], 5)
    expect([...store.getSeenWordIds()].sort()).toEqual([1, 2])

    store.markWordsAsSeen([3, 4, 5], 5) // 5 seen ≥ total 5 → reset
    expect(store.getSeenWordIds().size).toBe(0)
    expect(localStorage.getItem('studyspark-seen-words')).toBeNull()
  })

  it('remembers the latest AI words (without duplicates, newest last) so they are not asked again', () => {
    const store = useQuizStore()
    store.rememberAiTerms(['door', 'cat'])
    store.rememberAiTerms(['cat', 'sun'])
    expect(store.getRecentAiTerms()).toEqual(['door', 'cat', 'sun'])

    store.rememberAiTerms(Array.from({ length: 80 }, (_, i) => `w${i}`))
    const recent = store.getRecentAiTerms()
    expect(recent).toHaveLength(60)
    expect(recent[59]).toBe('w79')
  })

  it('survives corrupt stored data', () => {
    localStorage.setItem('studyspark-recent-ai-terms', '{not json')
    expect(useQuizStore().getRecentAiTerms()).toEqual([])
  })
})
