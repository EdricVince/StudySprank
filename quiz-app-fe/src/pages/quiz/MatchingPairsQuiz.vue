<template>
  <div class="min-h-screen p-4 lg:p-6">
    <!-- Show Result -->
    <template v-if="gameState.status === 'finished'">
      <QuizResult
        :result="quizResult"
        @play-again="restartQuiz"
        @go-home="goToQuizzes"
      />
      <VocabResultsTable v-if="vocabAnswers.length > 0" :entries="vocabAnswers" />
    </template>

    <!-- Quiz Game -->
    <template v-else>
      <!-- Header -->
      <QuizHeader
        :current-question="matchedPairs"
        :total-questions="pairs.length"
        :score="gameState.score"
        :streak="gameState.streak"
        :time-remaining="timeRemaining"
        :show-timer="true"
        :progress-label="$t('quizPlay.matching.pairOf', { n: matchedPairs, total: pairs.length })"
        @exit="confirmExit"
      />

      <!-- Game Instructions -->
      <div class="mx-auto mt-4 max-w-4xl">
        <div class="bg-secondary/50 mb-6 rounded-xl p-4 text-center">
          <p class="text-muted-foreground text-sm">
            <span class="font-medium">{{ $t('quizPlay.matching.instrTitle') }}</span>
            {{ $t('quizPlay.matching.instrBody') }}
          </p>
        </div>

        <!-- Game Board -->
        <div class="grid grid-cols-2 gap-4 lg:gap-6">
          <!-- Words Column -->
          <div class="space-y-3">
            <h3 class="text-muted-foreground mb-2 text-center text-sm font-medium">{{ $t('quizPlay.matching.words') }}</h3>
            <button
              v-for="card in wordCards"
              :key="`word-${card.id}`"
              class="card-btn w-full rounded-2xl p-4 text-left transition-all duration-300 lg:p-5"
              :class="getCardClass(card, 'word')"
              :disabled="card.isMatched"
              @click="selectCard(card, 'word')"
            >
              <span class="text-base font-medium lg:text-lg">{{ card.content }}</span>
            </button>
          </div>

          <!-- Definitions Column -->
          <div class="space-y-3">
            <h3 class="text-muted-foreground mb-2 text-center text-sm font-medium">{{ $t('quizPlay.matching.definitions') }}</h3>
            <button
              v-for="card in definitionCards"
              :key="`def-${card.id}`"
              class="card-btn w-full rounded-2xl p-4 text-left transition-all duration-300 lg:p-5"
              :class="getCardClass(card, 'definition')"
              :disabled="card.isMatched"
              @click="selectCard(card, 'definition')"
            >
              <span class="text-sm lg:text-base">{{ card.content }}</span>
            </button>
          </div>
        </div>

        <!-- Feedback -->
        <Transition name="fade-scale">
          <div
            v-if="showFeedback"
            class="mt-6 rounded-2xl p-4 text-center"
            :class="lastMatchCorrect ? 'bg-primary/10' : 'bg-destructive/10'"
          >
            <div class="flex items-center justify-center gap-2">
              <CheckCircle v-if="lastMatchCorrect" class="text-primary h-6 w-6" />
              <XCircle v-else class="text-destructive h-6 w-6" />
              <span
                class="text-lg font-semibold"
                :class="lastMatchCorrect ? 'text-primary' : 'text-destructive'"
              >
                {{ lastMatchCorrect ? $t('quizPlay.matching.greatMatch', { n: 100 + gameState.streak * 10 }) : $t('quizPlay.matching.tryAgain') }}
              </span>
            </div>
          </div>
        </Transition>

        <!-- Stats -->
        <div class="mt-6 flex items-center justify-center gap-6">
          <div class="text-center">
            <p class="text-foreground text-2xl font-bold">{{ matchedPairs }}</p>
            <p class="text-muted-foreground text-sm">{{ $t('quizPlay.matching.matched') }}</p>
          </div>
          <div class="bg-border h-10 w-px"></div>
          <div class="text-center">
            <p class="text-foreground text-2xl font-bold">{{ attempts }}</p>
            <p class="text-muted-foreground text-sm">{{ $t('quizPlay.matching.attempts') }}</p>
          </div>
          <div class="bg-border h-10 w-px"></div>
          <div class="text-center">
            <p class="text-foreground text-2xl font-bold">{{ accuracy }}%</p>
            <p class="text-muted-foreground text-sm">{{ $t('quizPlay.matching.accuracy') }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Exit Modal -->
    <QuizExitModal v-model="showExitModal" @confirm="goToQuizzes" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CheckCircle, XCircle } from '@/components/icons'
import QuizHeader from '@/components/quiz/QuizHeader.vue'
import QuizResult from '@/components/quiz/QuizResult.vue'
import VocabResultsTable from '@/components/quiz/VocabResultsTable.vue'
import QuizExitModal from '@/components/quiz/QuizExitModal.vue'
import type { MatchingPair, QuizResult as QuizResultType, QuizState } from '@/types/quiz'
import { useQuizCompletion } from '@/composables/useQuizCompletion'
import { useVocabulary } from '@/composables/useVocabulary'

interface Card {
  id: number
  content: string
  pairId: number
  isMatched: boolean
}

const router = useRouter()
const route = useRoute()
const { finishQuiz, xpEarned } = useQuizCompletion()
const { generateMatchingPairs } = useVocabulary()

const questionCount = computed(() => Math.min(Math.max(parseInt(route.query.count as string) || 8, 3), 30))

const gameState = ref<QuizState>({
  status: 'playing',
  currentQuestion: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  streak: 0,
  timeRemaining: 180, // 3 minutes
  answers: [],
})

const pairs = ref<MatchingPair[]>(generateMatchingPairs(questionCount.value))

const vocabAnswers = ref<{ termDisplay: string; meaningDisplay: string; isCorrect: boolean }[]>([])

const wordCards = ref<Card[]>([])
const definitionCards = ref<Card[]>([])
const selectedWord = ref<Card | null>(null)
const selectedDefinition = ref<Card | null>(null)
const showFeedback = ref(false)
const lastMatchCorrect = ref(false)
const attempts = ref(0)
const matchedPairs = ref(0)
const timeRemaining = ref(180)
const showExitModal = ref(false)
const startTime = ref(Date.now())

let timerInterval: ReturnType<typeof setInterval> | null = null

const accuracy = computed(() => {
  if (attempts.value === 0) return 100
  return Math.round((matchedPairs.value / attempts.value) * 100)
})

// One accuracy definition for the result screen and the server: every wrong
// attempt AND every pair left unmatched when time runs out counts as a miss.
const finalAccuracy = computed(() => {
  const misses = attempts.value - matchedPairs.value + (pairs.value.length - matchedPairs.value)
  const total = matchedPairs.value + misses
  return total ? Math.round((matchedPairs.value / total) * 100) : 0
})

const endGame = async () => {
  if (gameState.value.status === 'finished') return
  gameState.value.status = 'finished'
  if (timerInterval) clearInterval(timerInterval)
  await finishQuiz({
    modeId: 'matching-pairs',
    modeName: 'Matching Pairs',
    score: gameState.value.score,
    accuracy: finalAccuracy.value,
    questionCount: pairs.value.length,
  })
}

const quizResult = computed<QuizResultType>(() => {
  const timeSpent = 180 - timeRemaining.value
  const accuracyValue = finalAccuracy.value
  return {
    totalQuestions: pairs.value.length,
    correctAnswers: matchedPairs.value,
    wrongAnswers: attempts.value - matchedPairs.value,
    score: gameState.value.score,
    timeSpent,
    xpEarned: xpEarned.value,
    accuracy: accuracyValue,
    streakBonus: gameState.value.streak > 2 ? gameState.value.streak * 10 : 0,
  }
})

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }
  return shuffled
}

const initializeGame = () => {
  // Create word cards
  wordCards.value = shuffleArray(
    pairs.value.map((p, i) => ({
      id: i,
      content: p.term,
      pairId: p.id,
      isMatched: false,
    }))
  )

  // Create definition cards
  definitionCards.value = shuffleArray(
    pairs.value.map((p, i) => ({
      id: i + pairs.value.length,
      content: p.definition,
      pairId: p.id,
      isMatched: false,
    }))
  )

  selectedWord.value = null
  selectedDefinition.value = null
  matchedPairs.value = 0
  attempts.value = 0
  timeRemaining.value = 180
  gameState.value.score = 0
  gameState.value.streak = 0
}

const getCardClass = (card: Card, type: 'word' | 'definition') => {
  if (card.isMatched) {
    return 'bg-primary/10 border-2 border-primary opacity-60 cursor-default'
  }

  const isSelected =
    (type === 'word' && selectedWord.value?.id === card.id) ||
    (type === 'definition' && selectedDefinition.value?.id === card.id)

  if (isSelected) {
    return 'bg-primary text-primary-foreground border-2 border-primary scale-[1.02]'
  }

  return 'bg-card border-2 border-border hover:border-primary/50 hover:bg-secondary/50'
}

const selectCard = (card: Card, type: 'word' | 'definition') => {
  if (card.isMatched || showFeedback.value) return

  if (type === 'word') {
    selectedWord.value = card
  } else {
    selectedDefinition.value = card
  }

  // Check if both are selected
  if (selectedWord.value && selectedDefinition.value) {
    checkMatch()
  }
}

const checkMatch = () => {
  if (!selectedWord.value || !selectedDefinition.value) return

  attempts.value++
  const isMatch = selectedWord.value.pairId === selectedDefinition.value.pairId

  lastMatchCorrect.value = isMatch
  showFeedback.value = true

  if (isMatch) {
    // Mark as matched
    const wordCard = wordCards.value.find(c => c.id === selectedWord.value!.id)
    const defCard = definitionCards.value.find(c => c.id === selectedDefinition.value!.id)
    if (wordCard) wordCard.isMatched = true
    if (defCard) defCard.isMatched = true

    matchedPairs.value++
    gameState.value.streak++
    gameState.value.score += 100 + gameState.value.streak * 10

    const matchedPair = pairs.value.find(p => p.id === selectedWord.value!.pairId)
    if (matchedPair) {
      vocabAnswers.value.push({ termDisplay: matchedPair.term, meaningDisplay: matchedPair.definition, isCorrect: true })
    }

    // Check if all matched
    if (matchedPairs.value === pairs.value.length) {
      setTimeout(endGame, 1000)

    }
  } else {
    gameState.value.streak = 0
  }

  // Clear selection after delay
  setTimeout(() => {
    selectedWord.value = null
    selectedDefinition.value = null
    showFeedback.value = false
  }, 1000)
}

const startTimer = () => {
  timerInterval = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    } else {
      void endGame()

    }
  }, 1000)
}

const confirmExit = () => {
  showExitModal.value = true
}

const goToQuizzes = () => {
  if (timerInterval) clearInterval(timerInterval)
  router.push('/quizzes')
}

const restartQuiz = () => {
  gameState.value.status = 'playing'
  vocabAnswers.value = []
  pairs.value = generateMatchingPairs(questionCount.value)
  initializeGame()
  startTime.value = Date.now()
  startTimer()
}

onMounted(() => {
  initializeGame()
  startTimer()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<style scoped>
.card-btn {
  transition: all 0.2s ease;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}


</style>
