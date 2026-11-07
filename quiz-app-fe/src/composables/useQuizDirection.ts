import { ref } from 'vue'

/**
 * Which way a multiple-choice question goes:
 *  - 'meaning': the word is shown (language being learned), the learner picks its meaning;
 *  - 'term':    the meaning is shown, the learner picks the word;
 *  - 'mixed':   each question picks one of the two at random.
 */
export type QuizDirection = 'meaning' | 'term' | 'mixed'
export const QUIZ_DIRECTIONS: readonly QuizDirection[] = ['meaning', 'term', 'mixed']

const STORAGE_KEY = 'studyspark-quiz-direction'

function read(): QuizDirection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return QUIZ_DIRECTIONS.find((d) => d === stored) ?? 'mixed'
  } catch {
    return 'mixed'
  }
}

const current = ref<QuizDirection>(read())

export function useQuizDirection() {
  const setDirection = (direction: QuizDirection) => {
    current.value = direction
    try {
      localStorage.setItem(STORAGE_KEY, direction)
    } catch {
      /* the choice just is not remembered */
    }
  }
  return { direction: current, setDirection, directions: QUIZ_DIRECTIONS }
}

/** The direction of one question: a fixed setting is used as is, 'mixed' flips a coin. */
export function directionOfQuestion(
  direction: QuizDirection,
  random: () => number = Math.random,
): 'meaning' | 'term' {
  if (direction === 'mixed') return random() < 0.5 ? 'meaning' : 'term'
  return direction
}
