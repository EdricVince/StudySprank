import { defineStore } from 'pinia'

// Games the learner has played are kept on the server (learning history); only the words already
// offered are remembered here, so a new round starts with words that have not been seen recently.
const SEEN_KEY = 'studyspark-seen-words'
const AI_TERMS_KEY = 'studyspark-recent-ai-terms'
/** How many of the latest AI words are sent back as "do not repeat" (the API reads at most 60). */
const MAX_RECENT_AI_TERMS = 60

export const useQuizStore = defineStore('quiz', () => {
  function getSeenWordIds(): Set<number> {
    try {
      const raw = localStorage.getItem(SEEN_KEY)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch { return new Set() }
  }

  function markWordsAsSeen(ids: number[], totalWords: number) {
    const seen = getSeenWordIds()
    ids.forEach(id => seen.add(id))
    // Wrap-around: reset after all words have been seen
    if (seen.size >= totalWords) {
      localStorage.removeItem(SEEN_KEY)
    } else {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
    }
  }

  function getRecentAiTerms(): string[] {
    try {
      const raw = localStorage.getItem(AI_TERMS_KEY)
      const terms: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(terms) ? terms.filter((t): t is string => typeof t === 'string') : []
    } catch { return [] }
  }

  function rememberAiTerms(terms: string[]) {
    const merged = [...getRecentAiTerms().filter((t) => !terms.includes(t)), ...terms]
    try {
      localStorage.setItem(AI_TERMS_KEY, JSON.stringify(merged.slice(-MAX_RECENT_AI_TERMS)))
    } catch { /* storage full or blocked: the next round may repeat a word, nothing else */ }
  }

  return { getSeenWordIds, markWordsAsSeen, getRecentAiTerms, rememberAiTerms }
})
