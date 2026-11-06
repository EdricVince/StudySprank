import { defineStore } from 'pinia'

// Games the learner has played are kept on the server (learning history); only the words already
// offered are remembered here, so a new round starts with words that have not been seen recently.
const SEEN_KEY = 'studyspark-seen-words'

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

  return { getSeenWordIds, markWordsAsSeen }
})
