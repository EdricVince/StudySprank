<template>
  <div class="min-h-screen p-4 lg:p-6">
    <!-- Result -->
    <div v-if="status === 'finished'" class="mx-auto max-w-lg space-y-6 pt-10 text-center">
      <div class="bg-card border-border rounded-2xl border p-8">
        <div class="bg-primary/10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
          <Keyboard class="text-primary h-10 w-10" />
        </div>
        <h2 class="text-foreground mb-2 text-2xl font-bold">Challenge Complete!</h2>
        <p class="text-muted-foreground text-sm mb-4 capitalize">{{ difficulty }} difficulty</p>
        <div class="mt-4 grid grid-cols-3 gap-4">
          <div class="bg-secondary/30 rounded-xl p-4">
            <p class="text-foreground text-2xl font-bold">{{ wpm }}</p>
            <p class="text-muted-foreground text-xs">WPM</p>
          </div>
          <div class="bg-secondary/30 rounded-xl p-4">
            <p class="text-foreground text-2xl font-bold">{{ accuracy }}%</p>
            <p class="text-muted-foreground text-xs">Accuracy</p>
          </div>
          <div class="bg-secondary/30 rounded-xl p-4">
            <p class="text-primary text-2xl font-bold">+{{ xpEarned }}</p>
            <p class="text-muted-foreground text-xs">XP Earned</p>
          </div>
        </div>
        <div class="mt-6 flex gap-3">
          <button class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-3 text-sm font-medium" @click="backToSelect">Try Again</button>
          <button class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-3 text-sm font-medium" @click="$router.push('/quizzes')">Back</button>
        </div>
      </div>
    </div>

    <!-- Game -->
    <template v-else>
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <button class="group flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95" @click="$router.push('/quizzes')">
          <svg class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Quizzes
        </button>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5 text-sm font-semibold" :class="timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-foreground'">
            <Clock class="h-4 w-4" /> {{ timeLeft }}s
          </div>
          <div class="text-primary flex items-center gap-1.5 text-sm font-semibold">
            <Zap class="h-4 w-4" /> {{ score }} pts
          </div>
        </div>
      </div>

      <!-- Loading / idle while waiting for startGame -->
      <div v-if="status === 'idle'" class="mx-auto max-w-lg pt-20 text-center">
        <div class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <Keyboard class="text-primary h-8 w-8" />
        </div>
      </div>

      <!-- Playing -->
      <div v-else class="mx-auto max-w-2xl">
        <!-- Progress bar (time) -->
        <div class="bg-secondary mb-4 h-2 overflow-hidden rounded-full">
          <div
class="bg-primary h-full rounded-full transition-all duration-1000"
            :style="{ width: (timeLeft / 60 * 100) + '%' }"
            :class="timeLeft <= 10 ? 'bg-red-500!' : ''" />
        </div>

        <!-- Word display -->
        <div class="bg-card border-border mb-4 rounded-2xl border p-6">
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Words: <span class="text-foreground font-semibold">{{ wordsTyped }}</span></span>
            <ComboMultiplier :combo="combo" />
          </div>

          <!-- Scrolling word stream -->
          <div class="flex flex-wrap gap-2 text-xl font-mono leading-relaxed mb-4 min-h-16 max-h-28 overflow-hidden">
            <span
              v-for="(word, i) in visibleWords"
              :key="visibleOffset + i"
              class="transition-colors"
              :class="{
                'text-primary font-bold underline underline-offset-4': i === 0,
                'text-muted-foreground': i > 0,
              }"
            >{{ word }}</span>
          </div>

          <!-- Input -->
          <input
            ref="inputRef"
            v-model="inputValue"
            class="bg-secondary text-foreground placeholder-muted-foreground w-full rounded-xl border-2 border-transparent px-4 py-3 text-lg font-mono outline-none transition-colors focus:border-primary"
            :class="inputShake ? 'border-red-500! animate-shake' : ''"
            placeholder="Type here..."
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            @keydown.space.prevent="submitWord"
            @keydown.enter.prevent="submitWord"
          />
          <p class="text-muted-foreground mt-2 text-xs text-center">
            Press <kbd class="bg-secondary-foreground/10 rounded px-1">Space</kbd> or
            <kbd class="bg-secondary-foreground/10 rounded px-1">Enter</kbd> to submit
          </p>
        </div>
      </div>
    </template>
    <XPFloat ref="xpFloatRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Keyboard, Clock, Zap } from '@/components/icons'
import ComboMultiplier from '@/components/quiz/ComboMultiplier.vue'
import XPFloat from '@/components/ui/XPFloat.vue'
import { sfx } from '@/utils/soundFx'
import { useProgressStore } from '@/stores/progress.store'
import { api } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const progressStore = useProgressStore()

const WORDS_EASY = ['cat','dog','sun','run','play','book','home','food','tree','fish','jump','blue','rain','cake','door','ship','ball','hand','face','bird','love','soft','warm','cool','star','look','talk','walk','read','draw']
const WORDS_MEDIUM = ['apple','garden','journey','picture','morning','window','purple','simple','follow','between','country','example','hundred','nothing','quickly','several','village','already','another','because','certain','during','enough','family','middle','people','result','school','system','travel','wonder','yellow']
const WORDS_HARD = ['absolute','beautiful','challenge','discover','eloquent','fantastic','gratitude','hurricane','intricate','knowledge','labyrinth','mechanism','narrative','objective','philosophy','qualified','recognize','strategic','technical','universal','versatile','whispered','xylophone','yesterday','zealously','architect','brilliant','calculate','dangerous','elaborate']

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

const WORDS_EXPERT = ['accommodate','acknowledgment','advantageous','circumstances','commemorate','conscientious','correspondence','disappointment','embarrassment','enthusiastically','exaggerate','extraordinary','independence','miscellaneous','necessary','occasionally','parliamentary','predominantly','questionnaire','responsibility','simultaneously','straightforward','subconsciously','uncomfortable','unquestionably']

const difficulty = ref<Difficulty>(
  (['easy','medium','hard','expert'].includes(route.query.difficulty as string)
    ? route.query.difficulty as Difficulty
    : 'medium')
)
const status = ref<'idle' | 'playing' | 'finished'>('idle')
const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const xpFloatRef = ref<InstanceType<typeof XPFloat> | null>(null)
const timeLeft = ref(60)
const score = ref(0)
const wordsTyped = ref(0)
const combo = ref(0)
const inputShake = ref(false)
const wordResults = ref<boolean[]>([])
let timer: ReturnType<typeof setInterval> | null = null

// Infinite word pool — regenerate when running low
const wordPool = ref<string[]>([])
const poolConsumed = ref(0)

const visibleWords = computed(() => wordPool.value.slice(poolConsumed.value, poolConsumed.value + 15))
const visibleOffset = computed(() => poolConsumed.value)

// The static lists above are the instant, offline fallback. When the AI is
// available we pull fresh words whose length matches the difficulty tier and feed
// them into the pool — so the game never waits on the network, yet serves
// AI-generated words once they arrive.
const aiWords = ref<string[]>([])
const TIER_LEN: Record<Difficulty, [number, number]> = {
  easy: [3, 5], medium: [5, 8], hard: [7, 11], expert: [9, 16],
}

const localList = () => {
  if (difficulty.value === 'easy')   return WORDS_EASY
  if (difficulty.value === 'hard')   return WORDS_HARD
  if (difficulty.value === 'expert') return WORDS_EXPERT
  return WORDS_MEDIUM
}

// Prefer AI words once we have a healthy batch; otherwise use the local list.
const getWordList = () => (aiWords.value.length >= 10 ? aiWords.value : localList())

let aiLoading = false
const fetchAiWords = async () => {
  if (aiLoading) return
  aiLoading = true
  try {
    const [min, max] = TIER_LEN[difficulty.value as Difficulty]
    const items = await api.generateVocabulary({
      learningLang: 'en',
      uiLang: 'en',
      count: 30,
      exclude: aiWords.value.slice(-40),
    })
    const re = new RegExp(`^[a-zA-Z]{${min},${max}}$`)
    const words = (items ?? [])
      .map((i) => i.term.toLowerCase().trim())
      .filter((w) => re.test(w))
    if (words.length) aiWords.value.push(...words)
  } catch {
    // AI unavailable — the local list keeps the game running.
  } finally {
    aiLoading = false
  }
}

const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5)

const ensurePool = () => {
  const remaining = wordPool.value.length - poolConsumed.value
  if (remaining < 30) {
    wordPool.value.push(...shuffle(getWordList()))
    if (aiWords.value.length < 60) void fetchAiWords() // keep the AI supply topped up
  }
}

const wpm = computed(() => {
  const mins = (60 - timeLeft.value) / 60
  return mins > 0 ? Math.round(wordsTyped.value / mins) : 0
})
const correctWords = computed(() => wordResults.value.filter(Boolean).length)
const accuracy = computed(() => {
  const total = wordResults.value.length
  return total > 0 ? Math.round((correctWords.value / total) * 100) : 100
})
const xpEarned = computed(() => {
  const diffBonus = difficulty.value === 'hard' ? 2 : difficulty.value === 'medium' ? 1.5 : 1
  return Math.round((correctWords.value * 5 + Math.floor(wpm.value / 10) * 10) * diffBonus)
})

const startGame = async () => {
  void fetchAiWords() // background: game starts instantly on local words, AI blends in
  wordPool.value = [...shuffle(getWordList()), ...shuffle(getWordList())]
  poolConsumed.value = 0
  wordResults.value = []
  score.value = 0
  wordsTyped.value = 0
  combo.value = 0
  timeLeft.value = 60
  status.value = 'playing'

  await nextTick()
  inputRef.value?.focus()

  timer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) endGame()
  }, 1000)
}

const submitWord = () => {
  const typed = inputValue.value.trim()
  if (!typed) return

  const target = wordPool.value[poolConsumed.value] ?? ''
  const isCorrect = typed.toLowerCase() === target.toLowerCase()

  wordResults.value.push(isCorrect)
  wordsTyped.value++
  poolConsumed.value++
  ensurePool()

  if (isCorrect) {
    combo.value++
    const pts = 10 + combo.value * 2
    score.value += pts
    sfx.correct()
    if (combo.value >= 2) sfx.combo(combo.value)
    xpFloatRef.value?.trigger(pts)
  } else {
    combo.value = 0
    sfx.wrong()
    triggerShake()
  }

  inputValue.value = ''
}

const triggerShake = () => {
  inputShake.value = true
  setTimeout(() => { inputShake.value = false }, 400)
}

const endGame = () => {
  if (timer) clearInterval(timer)
  status.value = 'finished'
  progressStore.logQuizCompletion(accuracy.value, wordsTyped.value)
}

const backToSelect = () => {
  router.push('/quizzes')
}

onMounted(() => { startGame() })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
.animate-shake { animation: shake 0.4s ease; }
</style>
