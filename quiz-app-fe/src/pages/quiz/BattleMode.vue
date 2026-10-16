<template>
  <div class="min-h-screen p-4 lg:p-6">

    <!-- LOBBY -->
    <template v-if="phase === 'lobby'">
      <div class="mx-auto max-w-lg">
        <div class="mb-8 text-center">
          <div class="bg-primary/10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Swords class="text-primary h-10 w-10" />
          </div>
          <h1 class="text-foreground text-3xl font-black">Battle Mode</h1>
          <p class="text-muted-foreground mt-2">Real-time 1-vs-1 — get matched with another online student and compete!</p>
        </div>

        <!-- Difficulty -->
        <div class="bg-card border-border mb-6 rounded-2xl border p-6">
          <h3 class="text-foreground mb-4 font-semibold">Choose Difficulty</h3>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="d in difficulties"
              :key="d.value"
              class="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all"
              :class="selectedDifficulty === d.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'"
              @click="selectedDifficulty = d.value"
            >
              <span class="text-2xl">{{ d.emoji }}</span>
              <span class="text-foreground text-sm font-semibold">{{ d.label }}</span>
              <span class="text-muted-foreground text-xs">{{ d.desc }}</span>
            </button>
          </div>
        </div>

        <!-- Info -->
        <div class="bg-secondary/40 border-border mb-6 flex items-start gap-3 rounded-2xl border p-4">
          <span class="text-2xl">🌐</span>
          <p class="text-muted-foreground text-sm">
            Questions are generated live by AI at the chosen difficulty. You'll play against a <span class="text-foreground font-semibold">real opponent</span> — scores update in real time.
          </p>
        </div>

        <p v-if="errorMsg" class="mb-4 text-center text-sm text-destructive">{{ errorMsg }}</p>

        <div class="flex gap-3">
          <button
            class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-4 font-medium transition-colors"
            @click="leave"
          >
            Cancel
          </button>
          <button
            class="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-colors"
            @click="findMatch"
          >
            <Swords class="h-5 w-5" />
            Find Match
          </button>
        </div>
      </div>
    </template>

    <!-- SEARCHING -->
    <template v-else-if="phase === 'searching'">
      <div class="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div class="relative mb-6 flex h-28 w-28 items-center justify-center">
          <div class="border-primary/30 border-t-primary absolute inset-0 animate-spin rounded-full border-4" />
          <Swords class="text-primary h-10 w-10" />
        </div>
        <h2 class="text-foreground text-2xl font-black">Finding an opponent…</h2>
        <p class="text-muted-foreground mt-2">Matching you with another <span class="capitalize">{{ selectedDifficulty }}</span> player</p>
        <p class="text-muted-foreground mt-1 text-sm">Open Battle Mode in another account/tab to test a match.</p>
        <button
          class="bg-secondary text-secondary-foreground hover:bg-secondary/80 mt-8 rounded-xl px-8 py-3 font-medium transition-colors"
          @click="cancelSearch"
        >
          Cancel
        </button>
      </div>
    </template>

    <!-- COUNTDOWN -->
    <template v-else-if="phase === 'countdown'">
      <div class="flex min-h-[80vh] flex-col items-center justify-center">
        <div class="mb-6 text-center">
          <p class="text-muted-foreground mb-2 text-lg">Opponent found! Battle starts in</p>
          <div class="bg-primary text-primary-foreground mx-auto flex h-32 w-32 items-center justify-center rounded-full text-6xl font-black leading-none shadow-2xl">
            {{ countdownNum }}
          </div>
          <p class="text-muted-foreground mt-4 text-base">Get ready to fight!</p>
        </div>
        <div class="flex items-center gap-8">
          <div class="text-center">
            <div class="bg-primary/10 mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">👤</div>
            <p class="text-foreground font-semibold">You</p>
          </div>
          <div class="text-primary text-2xl font-black">VS</div>
          <div class="text-center">
            <div class="bg-chart-1/10 mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">{{ opponent.avatar }}</div>
            <p class="text-foreground font-semibold">{{ opponent.name }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- BATTLE -->
    <template v-else-if="phase === 'battle'">
      <!-- Score Header -->
      <div class="bg-card border-border mb-6 rounded-2xl border p-4">
        <div class="mb-3 flex items-center gap-3">
          <div class="flex flex-1 flex-col items-start gap-1">
            <div class="flex items-center gap-2">
              <div class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-xl text-base">👤</div>
              <span class="text-foreground text-sm font-semibold">You</span>
              <span v-if="streak > 1" class="bg-chart-1/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-chart-1">🔥 {{ streak }}x</span>
            </div>
            <div class="text-primary text-xl font-black">{{ playerScore }}</div>
          </div>

          <div class="flex flex-col items-center">
            <div class="relative h-14 w-14">
              <svg class="h-14 w-14 -rotate-90">
                <circle cx="28" cy="28" r="24" stroke="currentColor" stroke-width="4" fill="none" class="text-secondary" />
                <circle
cx="28" cy="28" r="24" stroke="currentColor" stroke-width="4" fill="none"
                  :stroke-dasharray="circumference" :stroke-dashoffset="timerOffset"
                  :class="timeLeft <= 3 ? 'text-destructive' : 'text-primary'" class="transition-all duration-100" />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-lg font-black leading-none" :class="timeLeft <= 3 ? 'text-destructive' : 'text-foreground'">{{ timeLeft }}</span>
            </div>
            <span class="text-muted-foreground mt-1 text-xs">{{ currentQ + 1 }}/{{ questions.length }}</span>
          </div>

          <div class="flex flex-1 flex-col items-end gap-1">
            <div class="flex items-center gap-2">
              <span class="text-foreground text-sm font-semibold">{{ opponent.name }}</span>
              <div class="bg-chart-1/10 flex h-8 w-8 items-center justify-center rounded-xl text-base">{{ opponent.avatar }}</div>
            </div>
            <div class="text-chart-1 text-xl font-black">{{ opponentScore }}</div>
          </div>
        </div>

        <div class="flex gap-2">
          <div class="flex-1 overflow-hidden rounded-full bg-secondary h-2">
            <div class="bg-primary h-full rounded-full transition-all duration-500" :style="`width: ${playerPercent}%`" />
          </div>
          <div class="flex-1 overflow-hidden rounded-full bg-secondary h-2">
            <div class="bg-chart-1 h-full rounded-full transition-all duration-500 ml-auto" :style="`width: ${opponentPercent}%`" />
          </div>
        </div>
      </div>

      <!-- Waiting overlay -->
      <div v-if="waitingForOpponent" class="mx-auto max-w-2xl rounded-3xl bg-card border border-border p-10 text-center shadow-lg">
        <div class="border-primary/30 border-t-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4" />
        <h2 class="text-foreground text-xl font-bold">You finished! 🎉</h2>
        <p class="text-muted-foreground mt-2">Waiting for {{ opponent.name }} to complete the battle…</p>
      </div>

      <!-- Question Card -->
      <div v-else class="mx-auto max-w-2xl">
        <Transition name="slide-up" mode="out-in">
          <div :key="currentQ" class="bg-card border-border rounded-3xl border p-6 shadow-lg lg:p-8">
            <div class="mb-4 flex items-center justify-between">
              <span class="text-muted-foreground text-sm">Question {{ currentQ + 1 }}</span>
              <div class="flex items-center gap-2 text-sm">
                <div class="flex h-2 w-2 animate-pulse rounded-full" :class="opponentAnswered ? 'bg-chart-1' : 'bg-chart-2'" />
                <span class="text-muted-foreground">{{ opponentAnswered ? opponent.name + ' answered!' : opponent.name + ' thinking…' }}</span>
              </div>
            </div>

            <h2 class="text-foreground mb-6 text-center text-xl font-bold lg:text-2xl">{{ questions[currentQ]?.question }}</h2>

            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="(opt, i) in questions[currentQ]?.options"
                :key="i"
                class="rounded-2xl p-4 text-center transition-all duration-200"
                :class="getOptionClass(i)"
                :disabled="answeredIndex !== null"
                @click="submitAnswer(i)"
              >
                <span class="text-sm font-bold uppercase tracking-wide text-muted-foreground mr-2">{{ ['A','B','C','D'][i] }}</span>
                <span class="font-medium">{{ opt }}</span>
              </button>
            </div>

            <div class="mt-4 text-center">
              <span class="text-muted-foreground text-sm">Speed bonus: </span>
              <span class="text-primary font-bold">+{{ Math.max(0, timeLeft * 10) }} pts</span>
            </div>
          </div>
        </Transition>
      </div>
    </template>

    <!-- RESULT -->
    <template v-else-if="phase === 'result'">
      <div class="mx-auto max-w-lg">
        <div
class="mb-6 rounded-3xl p-8 text-center"
          :class="resultKind === 'win' ? 'bg-primary/10' : resultKind === 'draw' ? 'bg-secondary' : 'bg-destructive/10'">
          <div class="mb-4 text-6xl">{{ resultKind === 'win' ? '🏆' : resultKind === 'draw' ? '🤝' : '😔' }}</div>
          <h1 class="text-foreground mb-2 text-3xl font-black">{{ resultKind === 'win' ? 'Victory!' : resultKind === 'draw' ? 'Draw!' : 'Defeated!' }}</h1>
          <p class="text-muted-foreground">
            {{ resultData?.forfeit ? 'Your opponent left — you win by walkover!' : resultKind === 'win' ? 'Outstanding performance!' : resultKind === 'draw' ? 'Neck and neck!' : 'Keep practicing!' }}
          </p>
        </div>

        <div class="bg-card border-border mb-6 rounded-2xl border p-6">
          <div class="mb-4 flex items-center justify-around">
            <div class="text-center">
              <div class="bg-primary/10 mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">👤</div>
              <p class="text-primary text-3xl font-black">{{ playerScore }}</p>
              <p class="text-muted-foreground text-sm">You</p>
            </div>
            <div class="text-muted-foreground text-xl font-bold">VS</div>
            <div class="text-center">
              <div class="bg-chart-1/10 mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">{{ opponent.avatar }}</div>
              <p class="text-chart-1 text-3xl font-black">{{ opponentScore }}</p>
              <p class="text-muted-foreground text-sm">{{ opponent.name }}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center text-sm">
            <div>
              <p class="text-foreground font-bold">{{ correctCount }}</p>
              <p class="text-muted-foreground text-xs">Correct</p>
            </div>
            <div>
              <p class="text-foreground font-bold">{{ questions.length ? Math.round(correctCount / questions.length * 100) : 0 }}%</p>
              <p class="text-muted-foreground text-xs">Accuracy</p>
            </div>
            <div>
              <p class="text-foreground font-bold">{{ resultData?.opponent?.correctCount ?? '-' }}</p>
              <p class="text-muted-foreground text-xs">Opp. Correct</p>
            </div>
          </div>
        </div>

        <div class="bg-primary/5 border-primary/20 mb-6 flex items-center gap-4 rounded-2xl border p-5">
          <div class="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
            <Zap class="text-primary h-6 w-6" />
          </div>
          <div>
            <p class="text-foreground font-semibold">+{{ xpEarned }} XP earned</p>
            <p class="text-muted-foreground text-sm">{{ resultKind === 'win' ? 'Victory bonus included!' : 'Keep fighting to earn more!' }}</p>
          </div>
        </div>

        <div class="flex gap-3">
          <button class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-4 font-medium transition-colors" @click="leave">Exit</button>
          <button class="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-colors" @click="rematch">
            <RefreshCw class="h-4 w-4" />
            Play Again
          </button>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { io, type Socket } from 'socket.io-client'
import { Swords, RefreshCw, Zap } from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()

type Phase = 'lobby' | 'searching' | 'countdown' | 'battle' | 'result'
const phase = ref<Phase>('lobby')
const selectedDifficulty = ref('medium')
const errorMsg = ref('')

const difficulties = [
  { value: 'easy', emoji: '🌱', label: 'Easy', desc: 'A2–B1' },
  { value: 'medium', emoji: '⚡', label: 'Medium', desc: 'B1–B2' },
  { value: 'hard', emoji: '💀', label: 'Hard', desc: 'C1–C2' },
]

interface Q { question: string; options: string[] }
const questions = ref<Q[]>([])
const opponent = ref<{ name: string; avatar: string }>({ name: 'Opponent', avatar: '🤖' })
const currentQ = ref(0)
const timeLeft = ref(10)
const answeredIndex = ref<number | null>(null)
const revealedCorrect = ref<number | null>(null)
const opponentAnswered = ref(false)
const playerScore = ref(0)
const opponentScore = ref(0)
const streak = ref(0)
const correctCount = ref(0)
const countdownNum = ref(3)
const waitingForOpponent = ref(false)
const resultData = ref<{ result: string; you?: { total?: number; correctCount?: number }; opponent?: { correctCount?: number }; forfeit?: boolean } | null>(null)

const QUESTION_TIME = 10
const circumference = 2 * Math.PI * 24
const timerOffset = computed(() => circumference * (1 - timeLeft.value / QUESTION_TIME))
const maxScore = computed(() => Math.max(1, questions.value.length * (100 + QUESTION_TIME * 10 + 80)))
const playerPercent = computed(() => Math.min(100, (playerScore.value / maxScore.value) * 100))
const opponentPercent = computed(() => Math.min(100, (opponentScore.value / maxScore.value) * 100))
const resultKind = computed(() => resultData.value?.result ?? (playerScore.value > opponentScore.value ? 'win' : playerScore.value === opponentScore.value ? 'draw' : 'lose'))
const xpEarned = computed(() => {
  const total = questions.value.length || 1
  return Math.round((correctCount.value / total) * 50) + (resultKind.value === 'win' ? 50 : 0)
})

let socket: Socket | null = null
let qTimer: ReturnType<typeof setInterval> | null = null
let cdTimer: ReturnType<typeof setInterval> | null = null

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api/v1'
const SOCKET_URL = API_BASE.replace(/\/api\/v1\/?$/, '')

function connectSocket(): Socket {
  if (socket?.connected) return socket
  const token = authStore.getAccessToken()
  socket = io(`${SOCKET_URL}/battle`, { auth: { token }, transports: ['websocket', 'polling'] })

  socket.on('battle:searching', () => { phase.value = 'searching' })
  socket.on('battle:error', (d: { message: string }) => { errorMsg.value = d.message; phase.value = 'lobby' })
  socket.on('battle:cancelled', () => { phase.value = 'lobby' })

  socket.on('battle:matched', (d: { opponent: { name: string; avatar: string }; questions: Q[] }) => {
    opponent.value = d.opponent
    questions.value = d.questions
    startCountdown()
  })

  socket.on('battle:answer_result', (d: { correct: boolean; correctIndex: number; yourScore: number; finished: boolean }) => {
    revealedCorrect.value = d.correctIndex
    playerScore.value = d.yourScore
    if (d.correct) { streak.value++; correctCount.value++ } else { streak.value = 0 }
    window.setTimeout(() => {
      if (d.finished) waitingForOpponent.value = true
      else nextQuestion()
    }, 1200)
  })

  socket.on('battle:opponent_answered', (d: { opponentScore: number }) => {
    opponentScore.value = d.opponentScore
    opponentAnswered.value = true
  })

  socket.on('battle:finished', (d) => finishBattle(d))

  socket.on('battle:opponent_left', () => {
    finishBattle({
      result: 'win', forfeit: true,
      you: { score: playerScore.value, correctCount: correctCount.value, total: questions.value.length },
      opponent: { score: opponentScore.value, correctCount: 0 },
    })
  })

  socket.on('connect_error', () => { errorMsg.value = 'Cannot reach the battle server.'; phase.value = 'lobby' })
  socket.on('disconnect', () => {
    if (phase.value === 'searching') { errorMsg.value = 'Disconnected.'; phase.value = 'lobby' }
  })
  return socket
}

function findMatch() {
  errorMsg.value = ''
  resetBattle()
  const s = connectSocket()
  s.emit('battle:find', { difficulty: selectedDifficulty.value })
  phase.value = 'searching'
}

function cancelSearch() {
  socket?.emit('battle:cancel')
  phase.value = 'lobby'
}

function startCountdown() {
  phase.value = 'countdown'
  countdownNum.value = 3
  if (cdTimer) clearInterval(cdTimer)
  cdTimer = setInterval(() => {
    countdownNum.value--
    if (countdownNum.value <= 0) {
      clearInterval(cdTimer!)
      phase.value = 'battle'
      currentQ.value = 0
      startQuestionTimer()
    }
  }, 1000)
}

function startQuestionTimer() {
  timeLeft.value = QUESTION_TIME
  answeredIndex.value = null
  revealedCorrect.value = null
  opponentAnswered.value = false
  if (qTimer) clearInterval(qTimer)
  qTimer = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearInterval(qTimer!)
      if (answeredIndex.value === null) submitAnswer(-1)
    }
  }, 1000)
}

function submitAnswer(index: number) {
  if (answeredIndex.value !== null) return
  answeredIndex.value = index
  if (qTimer) clearInterval(qTimer)
  // The server measures the answer time itself (it ignores any client-sent timeLeft).
  socket?.emit('battle:answer', { questionIndex: currentQ.value, answerIndex: index })
}

function nextQuestion() {
  if (currentQ.value >= questions.value.length - 1) {
    waitingForOpponent.value = true
  } else {
    currentQ.value++
    startQuestionTimer()
  }
}

async function finishBattle(d: NonNullable<typeof resultData.value> & { you?: { score?: number }; opponent?: { score?: number } }) {
  if (qTimer) clearInterval(qTimer)
  resultData.value = d
  if (typeof d.you?.score === 'number') playerScore.value = d.you.score
  if (typeof d.opponent?.score === 'number') opponentScore.value = d.opponent.score
  if (typeof d.you?.correctCount === 'number') correctCount.value = d.you.correctCount
  waitingForOpponent.value = false
  phase.value = 'result'
  try {
    const total = d.you?.total || questions.value.length || 1
    const acc = Math.round((correctCount.value / total) * 100)
    await api.logActivity({ type: 'quiz_completion', score: acc })
  } catch { /* non-critical */ }
}

function getOptionClass(i: number) {
  if (answeredIndex.value === null) return 'bg-secondary hover:bg-primary hover:text-primary-foreground cursor-pointer'
  if (revealedCorrect.value === null) return i === answeredIndex.value ? 'bg-primary/40 text-foreground' : 'bg-secondary/50 opacity-60'
  if (i === revealedCorrect.value) return 'bg-primary text-primary-foreground'
  if (i === answeredIndex.value) return 'bg-destructive text-destructive-foreground'
  return 'bg-secondary/50 opacity-50'
}

function resetBattle() {
  questions.value = []
  currentQ.value = 0
  playerScore.value = 0
  opponentScore.value = 0
  streak.value = 0
  correctCount.value = 0
  answeredIndex.value = null
  revealedCorrect.value = null
  waitingForOpponent.value = false
  resultData.value = null
}

function rematch() {
  resetBattle()
  phase.value = 'lobby'
}

function leave() {
  socket?.disconnect()
  socket = null
  router.push('/quizzes')
}

onUnmounted(() => {
  if (qTimer) clearInterval(qTimer)
  if (cdTimer) clearInterval(cdTimer)
  socket?.disconnect()
})
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
.slide-up-enter-from { opacity: 0; transform: translateY(20px) scale(0.98); }
.slide-up-leave-to { opacity: 0; transform: translateY(-20px) scale(0.98); }
</style>
