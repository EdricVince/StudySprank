<template>
  <div class="min-h-screen p-4 lg:p-6">
    <!-- Result -->
    <template v-if="status === 'finished'">
      <QuizResult :result="quizResult" @play-again="restart" @go-home="goHome" />
    </template>

    <!-- Game -->
    <template v-else>
      <QuizHeader
        :current-question="currentIdx + 1"
        :total-questions="questions.length"
        :score="score"
        :streak="streak"
        @exit="showExitModal = true"
      />

      <!-- Progress bar -->
      <div class="mx-auto mt-4 max-w-2xl">
        <div class="bg-border h-1.5 w-full overflow-hidden rounded-full">
          <div
            class="bg-primary h-full rounded-full transition-all duration-500"
            :style="{ width: ((currentIdx + 1) / questions.length * 100) + '%' }"
          />
        </div>
      </div>

      <div class="mx-auto mt-5 max-w-2xl">
        <Transition name="slide-up" mode="out-in">
          <div :key="currentIdx" class="bg-card border-border rounded-3xl border p-6 shadow-lg lg:p-8">

            <!-- Category + Difficulty badges -->
            <div class="mb-5 flex items-center justify-between">
              <span class="rounded-full px-3 py-1 text-xs font-semibold capitalize" :class="categoryColor">
                {{ $te(`quizPlay.idiom.categories.${q.category}`) ? $t(`quizPlay.idiom.categories.${q.category}`) : q.category }}
              </span>
              <span class="rounded-full px-3 py-1 text-xs font-bold" :class="difficultyColor">
                {{ $t(`quizPlay.difficulty.${q.difficulty}`) }}
              </span>
            </div>

            <!-- Idiom phrase card -->
            <div class="mb-6 rounded-2xl border border-violet-500/20 bg-linear-to-br from-violet-500/10 via-indigo-500/5 to-transparent p-6 text-center">
              <div class="mb-2 text-3xl">💬</div>
              <p class="text-foreground text-2xl font-extrabold tracking-tight">"{{ q.phrase }}"</p>
              <p class="text-muted-foreground mt-2 text-sm">{{ $t('quizPlay.idiom.whatMeans') }}</p>
            </div>

            <!-- Answer options -->
            <div class="space-y-3">
              <button
                v-for="option in q.options"
                :key="option"
                class="w-full rounded-xl border px-5 py-4 text-left text-sm font-medium transition-all duration-200"
                :class="getOptionClass(option)"
                :disabled="selected !== null"
                @click="selectAnswer(option)"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    :class="getOptionIconClass(option)"
                  >
                    <template v-if="selected !== null && option === q.meaning">✓</template>
                    <template v-else-if="selected === option && option !== q.meaning">✗</template>
                    <template v-else>{{ optionLetter(option) }}</template>
                  </span>
                  {{ option }}
                </div>
              </button>
            </div>

            <!-- Example usage (revealed after answering) -->
            <Transition name="fade-scale">
              <div v-if="selected !== null" class="mt-5 space-y-3">
                <!-- Result banner -->
                <div
                  class="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                  :class="isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'"
                >
                  <span class="text-base">{{ isCorrect ? '🎉' : '❌' }}</span>
                  <span>{{ isCorrect ? $t('quizPlay.correct') : $t('quizPlay.idiom.incorrectMeaning', { meaning: q.meaning }) }}</span>
                </div>

                <!-- Example sentence -->
                <div class="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <div class="mb-1.5 flex items-center gap-1.5">
                    <span class="text-sm">📖</span>
                    <span class="text-xs font-semibold uppercase tracking-wide text-amber-400">{{ $t('quizPlay.idiom.example') }}</span>
                  </div>
                  <p class="text-foreground text-sm italic leading-relaxed">"{{ q.example }}"</p>
                </div>
              </div>
            </Transition>

            <!-- Next button -->
            <Transition name="fade-scale">
              <button
                v-if="selected !== null"
                class="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-colors"
                @click="next"
              >
                {{ isLastQuestion ? $t('quizPlay.seeResults') : $t('quizPlay.idiom.nextIdiom') }}
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </button>
            </Transition>
          </div>
        </Transition>
      </div>
    </template>

    <QuizExitModal v-model="showExitModal" @confirm="goHome" />
    <XPFloat ref="xpFloat" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import QuizHeader from '@/components/quiz/QuizHeader.vue'
import QuizResult from '@/components/quiz/QuizResult.vue'
import QuizExitModal from '@/components/quiz/QuizExitModal.vue'
import XPFloat from '@/components/ui/XPFloat.vue'
import { sfx } from '@/utils/soundFx'
import { useQuizCompletion } from '@/composables/useQuizCompletion'
import { generateIdiomQuestions, type IdiomQuestion } from '@/data/idioms'

const router = useRouter()
const route = useRoute()
const { finishQuiz, xpEarned } = useQuizCompletion()

const difficulty = (route.query.difficulty as 'easy' | 'medium' | 'hard') || undefined
const count = Math.min(Math.max(parseInt(route.query.count as string) || 10, 5), 45)

const questions = ref<IdiomQuestion[]>(generateIdiomQuestions(count, difficulty))
const currentIdx = ref(0)
const score = ref(0)
const streak = ref(0)
const correctCount = ref(0)
const selected = ref<string | null>(null)
const status = ref<'playing' | 'finished'>('playing')
const showExitModal = ref(false)
const xpFloat = ref<InstanceType<typeof XPFloat> | null>(null)
const startTime = ref(Date.now())

const q = computed(() => questions.value[currentIdx.value]!)
const isLastQuestion = computed(() => currentIdx.value >= questions.value.length - 1)
const isCorrect = computed(() => selected.value === q.value.meaning)

const categoryColors: Record<string, string> = {
  success:  'bg-green-500/10 text-green-400 border border-green-500/20',
  failure:  'bg-red-500/10 text-red-400 border border-red-500/20',
  effort:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  time:     'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  money:    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  emotion:  'bg-pink-500/10 text-pink-400 border border-pink-500/20',
  social:   'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  work:     'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  luck:     'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  conflict: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
}
const difficultyColors: Record<string, string> = {
  easy:   'bg-green-500/15 text-green-300',
  medium: 'bg-amber-500/15 text-amber-300',
  hard:   'bg-red-500/15 text-red-300',
}

const categoryColor = computed(() => categoryColors[q.value.category] ?? 'bg-muted text-muted-foreground')
const difficultyColor = computed(() => difficultyColors[q.value.difficulty] ?? 'bg-muted text-muted-foreground')

const letters = ['A', 'B', 'C', 'D']
function optionLetter(option: string) {
  const idx = q.value.options.indexOf(option)
  return letters[idx] ?? '?'
}

function getOptionClass(option: string) {
  if (selected.value === null)
    return 'border-border text-foreground hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
  if (option === q.value.meaning)
    return 'border-green-500/50 bg-green-500/10 text-green-300'
  if (option === selected.value)
    return 'border-red-500/50 bg-red-500/10 text-red-300'
  return 'border-border text-muted-foreground opacity-50'
}

function getOptionIconClass(option: string) {
  if (selected.value === null) return 'bg-muted text-muted-foreground'
  if (option === q.value.meaning) return 'bg-green-500 text-white'
  if (option === selected.value) return 'bg-red-500 text-white'
  return 'bg-muted text-muted-foreground'
}

function selectAnswer(option: string) {
  if (selected.value !== null) return
  selected.value = option
  const correct = option === q.value.meaning
  if (correct) {
    streak.value++
    const pts = 10 + Math.min(streak.value - 1, 5) * 2
    score.value += pts
    correctCount.value++
    sfx.correct()
    xpFloat.value?.trigger(pts)
  } else {
    streak.value = 0
    sfx.wrong()
  }
}

function next() {
  if (isLastQuestion.value) {
    finish()
  } else {
    currentIdx.value++
    selected.value = null
  }
}

function finish() {
  status.value = 'finished'
  // Send ACCURACY (0–100) — the old code sent the points total, which the API
  // rejected (> 100), so idiom quizzes never awarded XP.
  void finishQuiz({
    modeId: 'idiom-quiz',
    modeName: 'Idiom Quiz',
    score: score.value,
    accuracy: accuracyPct.value,
    questionCount: questions.value.length,
  })
}

const accuracyPct = computed(() => {
  const total = questions.value.length
  return total ? Math.round((correctCount.value / total) * 100) : 0
})

const quizResult = computed(() => {
  const total = questions.value.length
  return {
    totalQuestions: total,
    correctAnswers: correctCount.value,
    wrongAnswers: total - correctCount.value,
    score: score.value,
    timeSpent: Math.floor((Date.now() - startTime.value) / 1000),
    xpEarned: xpEarned.value,
    accuracy: accuracyPct.value,
    streakBonus: Math.max(0, score.value - correctCount.value * 10),
  }
})

function restart() {
  questions.value = generateIdiomQuestions(count, difficulty)
  currentIdx.value = 0
  score.value = 0
  streak.value = 0
  correctCount.value = 0
  selected.value = null
  status.value = 'playing'
  startTime.value = Date.now()
}

function goHome() { router.push('/quizzes') }
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.25s ease; }
.slide-up-enter-from { opacity: 0; transform: translateY(12px); }
.slide-up-leave-to   { opacity: 0; transform: translateY(-8px); }
.fade-scale-enter-active, .fade-scale-leave-active { transition: all 0.2s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.97); }
</style>
