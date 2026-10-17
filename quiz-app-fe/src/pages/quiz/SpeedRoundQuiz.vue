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

    <!-- Countdown Start -->
    <template v-else-if="showCountdown">
      <div class="flex min-h-[80vh] flex-col items-center justify-center">
        <div class="text-center">
          <h2 class="text-foreground mb-4 text-2xl font-bold">{{ $t('quizPlay.speed.getReady') }}</h2>
          <div class="bg-primary text-primary-foreground mx-auto flex h-32 w-32 items-center justify-center rounded-full text-6xl font-bold">
            {{ countdownValue }}
          </div>
          <p class="text-muted-foreground mt-6 text-lg">{{ $t('quizPlay.speed.answerFast') }}</p>
        </div>
      </div>
    </template>

    <!-- Quiz Game -->
    <template v-else>
      <!-- Header with Timer -->
      <div class="bg-card border-border sticky top-0 z-10 rounded-2xl border p-4 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <button
            class="bg-secondary hover:bg-secondary/80 flex h-10 w-10 items-center justify-center rounded-xl"
            @click="confirmExit"
          >
            <X class="text-foreground h-5 w-5" />
          </button>

          <div class="flex-1 text-center">
            <span class="text-foreground text-lg font-bold">{{ $t('quizPlay.pts', { n: gameState.score }) }}</span>
          </div>

          <!-- Question Timer (circular progress) -->
          <div class="relative h-14 w-14">
            <svg class="h-14 w-14 -rotate-90 transform">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
                class="text-secondary"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="strokeDashoffset"
                class="transition-all duration-100"
                :class="timerClass"
              />
            </svg>
            <span
              class="absolute inset-0 flex items-center justify-center text-lg font-bold"
              :class="timerClass"
            >
              {{ questionTimeLeft }}
            </span>
          </div>
        </div>

        <!-- Progress dots -->
        <div class="mt-3 flex justify-center gap-1.5">
          <div
            v-for="(_, index) in questions"
            :key="index"
            class="h-2 w-2 rounded-full transition-all"
            :class="getProgressDotClass(index)"
          ></div>
        </div>
      </div>

      <!-- Question Card -->
      <div class="mx-auto mt-6 max-w-2xl">
        <Transition name="slide-up" mode="out-in">
          <div :key="gameState.currentQuestion" class="bg-card border-border rounded-3xl border p-6 shadow-lg lg:p-8">
            <!-- Streak Display -->
            <div v-if="gameState.streak > 1" class="mb-4 flex justify-center">
              <div class="bg-primary/10 text-primary flex items-center gap-2 rounded-full px-4 py-2">
                <Flame class="h-5 w-5" />
                <span class="font-bold">{{ $t('quizPlay.speed.streak', { n: gameState.streak }) }}</span>
              </div>
            </div>

            <!-- Question -->
            <h2 class="text-foreground mb-8 text-center text-xl font-semibold lg:text-2xl">
              {{ currentQuestion?.question }}
            </h2>

            <!-- Options Grid -->
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="(option, index) in currentQuestion?.options"
                :key="index"
                class="option-btn rounded-2xl p-4 text-center transition-all duration-200 lg:p-5"
                :class="getOptionClass(option)"
                :disabled="selectedAnswer !== null"
                @click="selectAnswer(option)"
              >
                <span class="text-base font-medium lg:text-lg">{{ option }}</span>
              </button>
            </div>

            <!-- Speed Bonus Indicator -->
            <div class="mt-6 text-center">
              <p class="text-muted-foreground text-sm">
                {{ $t('quizPlay.speed.bonus') }} <span class="text-primary font-bold">{{ $t('quizPlay.plusPts', { n: speedBonus }) }}</span>
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </template>

    <!-- Exit Modal -->
    <QuizExitModal v-model="showExitModal" @confirm="goToQuizzes" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { X, Flame } from '@/components/icons'
import QuizResult from '@/components/quiz/QuizResult.vue'
import VocabResultsTable from '@/components/quiz/VocabResultsTable.vue'
import QuizExitModal from '@/components/quiz/QuizExitModal.vue'
import type { MultipleChoiceQuestion, QuizResult as QuizResultType, QuizState } from '@/types/quiz'
import { useQuizCompletion } from '@/composables/useQuizCompletion'
import { useVocabulary, type VocabMCQuestion } from '@/composables/useVocabulary'

const router = useRouter()
const route = useRoute()
const { finishQuiz, xpEarned } = useQuizCompletion()
const { generateSpeedQuestions } = useVocabulary()

const questionCount = computed(() => Math.min(Math.max(parseInt(route.query.count as string) || 15, 3), 50))

const QUESTION_TIME = 10 // seconds per question
const circumference = 2 * Math.PI * 24

const gameState = ref<QuizState>({
  status: 'idle',
  currentQuestion: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  streak: 0,
  timeRemaining: 0,
  answers: [],
})

const showCountdown = ref(true)
const countdownValue = ref(3)
const questionTimeLeft = ref(QUESTION_TIME)
const selectedAnswer = ref<string | null>(null)
const showExitModal = ref(false)
const startTime = ref(Date.now())
const questionResults = ref<boolean[]>([])
const vocabAnswers = ref<{ termDisplay: string; meaningDisplay: string; isCorrect: boolean }[]>([])

let countdownInterval: ReturnType<typeof setInterval> | null = null
let questionTimer: ReturnType<typeof setInterval> | null = null

const questions = ref<MultipleChoiceQuestion[]>(generateSpeedQuestions(questionCount.value))

const currentQuestion = computed(() => questions.value[gameState.value.currentQuestion])
const isLastQuestion = computed(() => gameState.value.currentQuestion >= questions.value.length - 1)

const speedBonus = computed(() => {
  return Math.max(0, questionTimeLeft.value * 10)
})

const strokeDashoffset = computed(() => {
  const progress = questionTimeLeft.value / QUESTION_TIME
  return circumference * (1 - progress)
})

const timerClass = computed(() => {
  if (questionTimeLeft.value <= 3) return 'text-destructive'
  if (questionTimeLeft.value <= 5) return 'text-accent-foreground'
  return 'text-primary'
})

const quizResult = computed<QuizResultType>(() => {
  const timeSpent = Math.floor((Date.now() - startTime.value) / 1000)
  const accuracy = Math.round((gameState.value.correctCount / questions.value.length) * 100)
  return {
    totalQuestions: questions.value.length,
    correctAnswers: gameState.value.correctCount,
    wrongAnswers: gameState.value.wrongCount,
    score: gameState.value.score,
    timeSpent,
    xpEarned: xpEarned.value,
    accuracy,
    streakBonus: gameState.value.streak > 2 ? gameState.value.streak * 10 : 0,
  }
})

const getProgressDotClass = (index: number) => {
  if (index < questionResults.value.length) {
    return questionResults.value[index] ? 'bg-primary' : 'bg-destructive'
  }
  if (index === gameState.value.currentQuestion) {
    return 'bg-primary w-4'
  }
  return 'bg-secondary'
}

const getOptionClass = (option: string) => {
  if (selectedAnswer.value === null) {
    return 'bg-secondary hover:bg-primary hover:text-primary-foreground'
  }

  if (option === currentQuestion.value?.correctAnswer) {
    return 'bg-primary text-primary-foreground'
  }

  if (option === selectedAnswer.value) {
    return 'bg-destructive text-destructive-foreground'
  }

  return 'bg-secondary/50 opacity-50'
}

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    if (countdownValue.value > 1) {
      countdownValue.value--
    } else {
      if (countdownInterval) clearInterval(countdownInterval)
      showCountdown.value = false
      gameState.value.status = 'playing'
      startTime.value = Date.now()
      startQuestionTimer()
    }
  }, 1000)
}

// reset=false resumes the current question's countdown (after "Continue" in the exit dialog).
const startQuestionTimer = (reset = true) => {
  if (reset) questionTimeLeft.value = QUESTION_TIME
  if (questionTimer) clearInterval(questionTimer)

  questionTimer = setInterval(() => {
    if (questionTimeLeft.value > 0) {
      questionTimeLeft.value--
    } else {
      // Time's up - treat as wrong answer
      handleTimeUp()
    }
  }, 1000)
}

const handleTimeUp = () => {
  if (selectedAnswer.value !== null) return

  selectedAnswer.value = '' // Mark as answered (timeout)
  gameState.value.wrongCount++
  gameState.value.streak = 0
  questionResults.value.push(false)

  setTimeout(() => {
    nextQuestion()
  }, 1000)
}

const selectAnswer = (option: string) => {
  if (selectedAnswer.value !== null) return

  selectedAnswer.value = option
  if (questionTimer) clearInterval(questionTimer)

  const isCorrect = option === currentQuestion.value?.correctAnswer

  if (isCorrect) {
    gameState.value.correctCount++
    gameState.value.streak++
    gameState.value.score += 100 + speedBonus.value + (gameState.value.streak * 10)
    questionResults.value.push(true)
  } else {
    gameState.value.wrongCount++
    gameState.value.streak = 0
    questionResults.value.push(false)
  }

  const q = currentQuestion.value as VocabMCQuestion
  if (q?.vocabWord) {
    vocabAnswers.value.push({ termDisplay: q.termDisplay, meaningDisplay: q.meaningDisplay, isCorrect })
  }

  setTimeout(() => {
    nextQuestion()
  }, 800)
}

const nextQuestion = async () => {
  if (isLastQuestion.value) {
    gameState.value.status = 'finished'
    const accuracy = Math.round((gameState.value.correctCount / questions.value.length) * 100)
    await finishQuiz({
      modeId: 'speed-round',
      modeName: 'Speed Round',
      score: gameState.value.score,
      accuracy,
      questionCount: questions.value.length,
    })
  } else {
    gameState.value.currentQuestion++
    selectedAnswer.value = null
    startQuestionTimer()
  }
}

const confirmExit = () => {
  if (questionTimer) clearInterval(questionTimer)
  showExitModal.value = true
}

const goToQuizzes = () => {
  if (questionTimer) clearInterval(questionTimer)
  if (countdownInterval) clearInterval(countdownInterval)
  router.push('/quizzes')
}

const restartQuiz = () => {
  gameState.value = {
    status: 'idle',
    currentQuestion: 0,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    timeRemaining: 0,
    answers: [],
  }
  selectedAnswer.value = null
  questionResults.value = []
  vocabAnswers.value = []
  questions.value = generateSpeedQuestions(questionCount.value)
  showCountdown.value = true
  countdownValue.value = 3
  startCountdown()
}

// The exit dialog pauses the clock; closing it with "Continue" must resume it,
// otherwise the current question would never time out.
watch(showExitModal, (open) => {
  if (!open && gameState.value.status === 'playing' && selectedAnswer.value === null) startQuestionTimer(false)
})

onMounted(() => {
  startCountdown()
})

onUnmounted(() => {
  if (questionTimer) clearInterval(questionTimer)
  if (countdownInterval) clearInterval(countdownInterval)
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.98);
}

.option-btn:not(:disabled):active {
  transform: scale(0.98);
}
</style>
