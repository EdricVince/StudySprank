<template>
  <div class="min-h-screen p-4 lg:p-6">
    <!-- Show Result -->
    <template v-if="gameState.status === 'finished'">
      <QuizResult
        :result="quizResult"
        @play-again="restartQuiz"
        @go-home="goToQuizzes"
      />
      <!-- Vocab Results Table (practice mode) -->
      <VocabResultsTable v-if="vocabAnswers.length > 0" :entries="vocabAnswers" />
    </template>

    <!-- Quiz Game -->
    <template v-else>
      <!-- Header -->
      <QuizHeader
        :current-question="gameState.currentQuestion + 1"
        :total-questions="questions.length"
        :score="gameState.score"
        :streak="gameState.streak"
        @exit="confirmExit"
      />

      <!-- Question Card -->
      <div class="mx-auto mt-6 max-w-2xl">
        <Transition name="slide-up" mode="out-in">
          <div :key="gameState.currentQuestion" class="bg-card border-border rounded-3xl border p-6 shadow-lg lg:p-8">
            <!-- Question Number Badge -->
            <div class="mb-6 flex items-center justify-between">
              <span class="bg-primary/10 text-primary rounded-lg px-3 py-1.5 text-sm font-medium">
                {{ $t('quizPlay.questionN', { n: gameState.currentQuestion + 1 }) }}
              </span>
              <div class="flex items-center gap-3">
                <ComboMultiplier :combo="gameState.streak" />
                <span class="text-muted-foreground text-sm">{{ $t('quizPlay.plusPts', { n: getQuestionPoints() }) }}</span>
              </div>
            </div>

            <!-- Question Text -->
            <h2 class="text-foreground mb-8 text-xl font-semibold lg:text-2xl">
              {{ currentQuestion?.question }}
            </h2>

            <!-- Options -->
            <div class="space-y-3">
              <button
                v-for="(option, index) in currentQuestion?.options"
                :key="index"
                class="option-btn group flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all duration-300"
                :class="getOptionClass(option)"
                :disabled="selectedAnswer !== null"
                @click="selectAnswer(option)"
              >
                <div
                  class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300"
                  :class="getOptionBadgeClass(option)"
                >
                  {{ String.fromCharCode(65 + index) }}
                </div>
                <span class="text-foreground flex-1 text-base font-medium lg:text-lg">{{ option }}</span>
                <div v-if="selectedAnswer === option" class="flex-shrink-0">
                  <CheckCircle v-if="isCorrectAnswer(option)" class="h-6 w-6 text-primary" />
                  <XCircle v-else class="text-destructive h-6 w-6" />
                </div>
              </button>
            </div>

            <!-- Feedback -->
            <Transition name="fade-scale">
              <div
                v-if="selectedAnswer !== null"
                class="mt-6 rounded-2xl p-4"
                :class="isCorrectAnswer(selectedAnswer) ? 'bg-primary/10' : 'bg-destructive/10'"
              >
                <div class="mb-2 flex items-center gap-2">
                  <CheckCircle v-if="isCorrectAnswer(selectedAnswer)" class="text-primary h-5 w-5" />
                  <XCircle v-else class="text-destructive h-5 w-5" />
                  <span
                    class="font-semibold"
                    :class="isCorrectAnswer(selectedAnswer) ? 'text-primary' : 'text-destructive'"
                  >
                    {{ isCorrectAnswer(selectedAnswer) ? $t('quizPlay.correct') : $t('quizPlay.incorrect') }}
                  </span>
                </div>
                <p v-if="currentQuestion?.explanation" class="text-muted-foreground text-sm">
                  {{ currentQuestion.explanation }}
                </p>
                <p v-if="!isCorrectAnswer(selectedAnswer)" class="text-muted-foreground mt-1 text-sm">
                  {{ $t('quizPlay.correctAnswerIs') }} <strong class="text-foreground">{{ currentQuestion?.correctAnswer }}</strong>
                </p>
              </div>
            </Transition>

            <!-- Next Button -->
            <Transition name="fade-scale">
              <button
                v-if="selectedAnswer !== null"
                class="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-colors"
                @click="nextQuestion"
              >
                {{ isLastQuestion ? $t('quizPlay.seeResults') : $t('quizPlay.nextQuestion') }}
                <ArrowRight class="h-5 w-5" />
              </button>
            </Transition>
          </div>
        </Transition>
      </div>
    </template>

    <!-- Exit Confirmation Modal -->
    <QuizExitModal v-model="showExitModal" @confirm="goToQuizzes" />

    <!-- XP Float -->
    <XPFloat ref="xpFloat" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CheckCircle, XCircle, ArrowRight } from '@/components/icons'
import QuizHeader from '@/components/quiz/QuizHeader.vue'
import QuizResult from '@/components/quiz/QuizResult.vue'
import VocabResultsTable from '@/components/quiz/VocabResultsTable.vue'
import QuizExitModal from '@/components/quiz/QuizExitModal.vue'
import ComboMultiplier from '@/components/quiz/ComboMultiplier.vue'
import XPFloat from '@/components/ui/XPFloat.vue'
import { sfx } from '@/utils/soundFx'
import type { MultipleChoiceQuestion, QuizResult as QuizResultType, QuizState } from '@/types/quiz'
import { useQuizCompletion } from '@/composables/useQuizCompletion'
import { useVocabulary, type VocabMCQuestion } from '@/composables/useVocabulary'

const router = useRouter()
const route = useRoute()
const { finishQuiz, xpEarned } = useQuizCompletion()
const { generateMCQuestions } = useVocabulary()

const questionCount = computed(() => Math.min(Math.max(parseInt(route.query.count as string) || 10, 3), 50))

// Game state
const gameState = ref<QuizState>({
  status: 'playing',
  currentQuestion: 0,
  score: 0,
  correctCount: 0,
  wrongCount: 0,
  streak: 0,
  timeRemaining: 0,
  answers: [],
})

const selectedAnswer = ref<string | null>(null)
const showExitModal = ref(false)
const xpFloat = ref<InstanceType<typeof XPFloat> | null>(null)
const startTime = ref(Date.now())
const vocabAnswers = ref<{ termDisplay: string; meaningDisplay: string; isCorrect: boolean }[]>([])

const questions = ref<MultipleChoiceQuestion[]>(generateMCQuestions(questionCount.value))

const currentQuestion = computed(() => questions.value[gameState.value.currentQuestion])
const isLastQuestion = computed(() => gameState.value.currentQuestion >= questions.value.length - 1)

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

const getQuestionPoints = () => {
  const basePoints = 100
  const streakBonus = gameState.value.streak * 10
  return basePoints + streakBonus
}

const getOptionClass = (option: string) => {
  if (selectedAnswer.value === null) {
    return 'bg-secondary/50 hover:bg-secondary border-2 border-transparent hover:border-primary/30'
  }

  if (option === currentQuestion.value?.correctAnswer) {
    return 'bg-primary/10 border-2 border-primary'
  }

  if (option === selectedAnswer.value && option !== currentQuestion.value?.correctAnswer) {
    return 'bg-destructive/10 border-2 border-destructive'
  }

  return 'bg-secondary/30 border-2 border-transparent opacity-50'
}

const getOptionBadgeClass = (option: string) => {
  if (selectedAnswer.value === null) {
    return 'bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground'
  }

  if (option === currentQuestion.value?.correctAnswer) {
    return 'bg-primary text-primary-foreground'
  }

  if (option === selectedAnswer.value && option !== currentQuestion.value?.correctAnswer) {
    return 'bg-destructive text-destructive-foreground'
  }

  return 'bg-muted text-muted-foreground'
}

const isCorrectAnswer = (answer: string) => {
  return answer === currentQuestion.value?.correctAnswer
}

const selectAnswer = (option: string) => {
  if (selectedAnswer.value !== null) return

  selectedAnswer.value = option
  const isCorrect = isCorrectAnswer(option)

  if (isCorrect) {
    gameState.value.correctCount++
    gameState.value.streak++
    gameState.value.score += getQuestionPoints()
    sfx.correct()
    if (gameState.value.streak >= 2) sfx.combo(gameState.value.streak)
    xpFloat.value?.trigger(getQuestionPoints())
  } else {
    gameState.value.wrongCount++
    gameState.value.streak = 0
    sfx.wrong()
  }

  const q = currentQuestion.value as VocabMCQuestion
  if (q?.vocabWord) {
    vocabAnswers.value.push({ termDisplay: q.termDisplay, meaningDisplay: q.meaningDisplay, isCorrect })
  }

  gameState.value.answers.push({
    questionId: currentQuestion.value!.id,
    userAnswer: option,
    isCorrect,
    timeSpent: 0,
  })
}

const nextQuestion = async () => {
  if (isLastQuestion.value) {
    gameState.value.status = 'finished'
    const accuracy = Math.round((gameState.value.correctCount / questions.value.length) * 100)
    await finishQuiz({
      modeId: 'multiple-choice',
      modeName: 'Multiple Choice',
      score: gameState.value.score,
      accuracy,
      questionCount: questions.value.length,
    })
  } else {
    gameState.value.currentQuestion++
    selectedAnswer.value = null
  }
}

const confirmExit = () => {
  showExitModal.value = true
}

const goToQuizzes = () => {
  router.push('/quizzes')
}

const restartQuiz = () => {
  gameState.value = {
    status: 'playing',
    currentQuestion: 0,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    timeRemaining: 0,
    answers: [],
  }
  selectedAnswer.value = null
  startTime.value = Date.now()
  vocabAnswers.value = []
  questions.value = generateMCQuestions(questionCount.value)
}

onMounted(() => {
  startTime.value = Date.now()
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
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

.option-btn {
  transform: translateX(0);
}

.option-btn:not(:disabled):hover {
  transform: translateX(4px);
}
</style>
