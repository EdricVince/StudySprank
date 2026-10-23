<template>
  <div class="flex min-h-full flex-col">
    <!-- Header -->
    <div class="page-header">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-lg">🎧</div>
          <h1 class="page-title">{{ $t('skills.listening.title') }}</h1>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            v-for="l in ['', ...CEFR_LEVELS]" :key="l"
            class="rounded-lg border px-3 py-1.5 text-xs font-bold transition-all"
            :class="filterLevel === l ? levelFilterClass(l, 'emerald') : 'border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/30'"
            @click="filterLevel = l"
          >{{ l || $t('skills.common.all') }}</button>
        </div>
      </div>
    </div>

    <div class="mx-auto flex w-full max-w-7xl flex-1 gap-0">
      <!-- Library sidebar -->
      <div class="lib-sidebar">
        <div class="lib-sidebar-inner">
          <div v-for="cat in filteredLibrary" :key="cat.key" class="mb-5">
            <div class="lib-cat-label"><span>{{ cat.icon }}</span> {{ $t(`skills.listening.categories.${cat.key}`) }}</div>
            <div class="space-y-1">
              <button
v-for="ex in cat.exercises" :key="ex.title" class="lib-item"
                :class="selectedExercise?.title === ex.title ? 'lib-item-active-emerald' : 'lib-item-inactive'"
                @click="selectExercise(ex, cat.type)">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-foreground text-sm font-medium leading-tight">{{ ex.title }}</span>
                  <span class="mt-0.5 shrink-0" :class="levelBadge(ex.level)">{{ ex.level }}</span>
                </div>
                <div class="text-muted-foreground mt-0.5 text-xs">{{ ex.desc }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="fetchError" class="empty-state">
          <div class="mb-4 text-5xl">⚠️</div>
          <h3 class="text-foreground text-xl font-bold">{{ $t('skills.listening.loadFailed') }}</h3>
          <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ fetchError }}</p>
          <button class="btn-emerald mt-4 px-5 py-2 text-sm" @click="reloadExercise">{{ $t('skills.common.retry') }}</button>
        </div>
        <div v-else-if="!exercise && !loading" class="empty-state">
          <div class="mb-4 text-5xl">🎧</div>
          <h3 class="text-foreground text-xl font-bold">{{ $t('skills.listening.emptyTitle') }}</h3>
          <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ $t('skills.listening.emptyDesc') }}</p>
        </div>

        <div v-else-if="loading" class="flex flex-col items-center justify-center py-24">
          <svg class="sk-spinner-emerald" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <p class="text-muted-foreground mt-4 text-sm">{{ $t('skills.listening.generating') }}</p>
        </div>

        <div v-else-if="exercise" class="space-y-5 p-6">
          <!-- Player card -->
          <div class="sk-card-p6">
            <div class="mb-3 flex flex-wrap gap-2">
              <span :class="levelBadge(exercise.level)">{{ exercise.level }}</span>
              <span class="chip">{{ exercise.type }}</span>
              <span class="chip">{{ $t('skills.common.minutes', { n: Math.max(1, Math.round(exercise.duration_seconds/60)) }) }}</span>
            </div>
            <h2 class="text-foreground mb-5 text-xl font-extrabold">{{ exercise.title }}</h2>

            <!-- Waveform + controls -->
            <div class="audio-player audio-player-emerald">
              <div class="mb-4 flex items-end justify-center gap-0.5 h-10">
                <div
v-for="i in 32" :key="i"
                  class="w-1 rounded-full bg-emerald-400 transition-all duration-75"
                  :style="{ height: isSpeaking ? `${8 + Math.abs(Math.sin(i * 0.4 + wavePhase)) * 28}px` : '6px', opacity: isSpeaking ? 0.7 + Math.sin(i*0.3)*0.3 : 0.3 }">
                </div>
              </div>
              <!-- Progress -->
              <div class="mb-4 score-track">
                <div class="score-fill bg-emerald-500" :style="{ width: `${progress}%` }"></div>
              </div>
              <!-- Buttons -->
              <div class="flex items-center justify-center gap-3">
                <button class="rounded-xl border border-emerald-500/30 p-2.5 text-emerald-400 hover:bg-emerald-500/10 transition-colors" @click="replay">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
                <button class="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform" @click="togglePlay">
                  <svg v-if="!isSpeaking" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>
                <button class="rounded-xl border border-emerald-500/30 px-3 py-2.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors" @click="cycleSpeed">{{ speed }}×</button>
              </div>
            </div>
          </div>

          <!-- Script / Key phrases tabs -->
          <div class="sk-card-p">
            <div class="mb-4 flex gap-2 border-b border-border pb-3">
              <button class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors" :class="tab==='script' ? 'sec-emerald' : 'text-muted-foreground hover:text-foreground'" @click="tab='script'">{{ $t('skills.listening.transcript') }}</button>
              <button class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors" :class="tab==='phrases' ? 'sec-emerald' : 'text-muted-foreground hover:text-foreground'" @click="tab='phrases'">{{ $t('skills.common.keyPhrases') }}</button>
            </div>
            <div v-if="tab==='script'" class="space-y-2">
              <p v-for="(line,i) in scriptLines" :key="i" class="text-foreground text-sm leading-relaxed rounded-lg px-2 py-1" :class="Number(i)%2===0?'bg-muted/5':''">{{ line }}</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="p in exercise.key_phrases" :key="p.phrase" class="rounded-xl bg-muted/10 p-3">
                <div class="text-foreground text-sm font-semibold">{{ p.phrase }}</div>
                <div class="text-muted-foreground text-xs mt-0.5">{{ p.meaning }}</div>
              </div>
            </div>
          </div>

          <!-- Questions -->
          <div class="sk-card-p">
            <h3 class="text-foreground mb-4 text-sm font-bold">{{ $t('skills.common.questions') }}</h3>
            <div class="space-y-5">
              <div v-for="(q,qi) in exercise.questions" :key="q.id" class="border-border border-b pb-5 last:border-0 last:pb-0">
                <p class="text-foreground mb-3 text-sm font-semibold">{{ Number(qi)+1 }}. {{ q.question }}</p>
                <div class="grid gap-2 sm:grid-cols-2">
                  <button
v-for="(opt,oi) in q.options" :key="oi" :disabled="qSubmitted" class="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all"
                    :class="qOptClass(qi,oi)"
                    @click="qAnswers[Number(qi)]=Number(oi)">
                    <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold" :class="qOptBadge(qi,oi)">{{ 'ABCD'[Number(oi)] }}</span>
                    {{ opt.replace(/^[A-D]\.\s*/,'') }}
                  </button>
                </div>
                <div v-if="qSubmitted && q.explanation" class="mt-2 rounded-lg bg-muted/20 p-2.5 text-xs text-muted-foreground">ℹ {{ q.explanation }}</div>
              </div>
            </div>
            <div v-if="qSubmitted" class="mt-5 flex items-center justify-between rounded-xl border p-4" :class="qPassed?'answer-pass':'answer-fail'">
              <div>
                <div class="font-bold" :class="qPassed?'text-emerald-400':'text-red-400'">{{ qCorrect }}/{{ exercise.questions.length }}</div>
                <div class="text-muted-foreground text-sm">{{ Math.round(qCorrect/exercise.questions.length*100) }}%  ·  {{ completedAt }}</div>
                <!-- script, questions and explanations are AI-generated -->
                <AiGeneratedBadge class="mt-2" />
              </div>
              <button class="btn-emerald px-4 py-2 text-sm" @click="reloadExercise">{{ $t('skills.common.next') }}</button>
            </div>
            <button
v-else :disabled="qAnswers.some(a=>a===-1)" class="btn-emerald mt-5 w-full py-2.5 disabled:opacity-40"
              @click="submitQ">{{ $t('skills.common.submitAnswers') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/utils/api'
import { CEFR_LEVELS, levelBadge, levelFilterClass, clockTime, errorText } from '@/utils/skills'
import AiGeneratedBadge from '@/components/common/AiGeneratedBadge.vue'

const { t } = useI18n()
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
const filterLevel = ref('')
const loading = ref(false)
const exercise = ref<any>(null)
const selectedExercise = ref<any>(null)
const fetchError = ref('')
const qAnswers = ref<number[]>([])
const qSubmitted = ref(false)
const isSpeaking = ref(false)
const speedIndex = ref(2)
const progress = ref(0)
const tab = ref<'script'|'phrases'>('script')
const wavePhase = ref(0)
const completedAt = ref('')
let waveTimer: ReturnType<typeof setInterval> | null = null

const speed = computed(() => speeds[speedIndex.value] ?? 1)
const scriptLines = computed(() => exercise.value?.script?.split('\n').filter(Boolean) ?? [])
const qCorrect = computed(() => qAnswers.value.filter((a,i) => a === exercise.value?.questions[i]?.correct).length)
const qPassed = computed(() => exercise.value ? qCorrect.value/exercise.value.questions.length >= 0.6 : false)

const library = [
  { key: 'ielts', icon: '🎓', type: 'ielts', exercises: [
    { title: 'Section 1 – Conversation', desc: 'Social situation dialogue', level: 'B1' },
    { title: 'Section 2 – Monologue', desc: 'Public information talk', level: 'B1' },
    { title: 'Section 3 – Discussion', desc: 'Academic discussion', level: 'B2' },
    { title: 'Section 4 – Lecture', desc: 'University lecture', level: 'C1' },
  ]},
  { key: 'lecture', icon: '🔬', type: 'lecture', exercises: [
    { title: 'Psychology 101', desc: 'Intro lecture style', level: 'B2' },
    { title: 'AI & Society', desc: 'Tech lecture excerpt', level: 'C1' },
    { title: 'Climate Science', desc: 'Research presentation', level: 'C2' },
  ]},
  { key: 'conversation', icon: '💬', type: 'conversation', exercises: [
    { title: 'At the Café', desc: 'Simple daily chat', level: 'A1' },
    { title: 'Making Plans', desc: 'Friends arranging meeting', level: 'A2' },
    { title: 'Job Interview', desc: 'Formal conversation', level: 'B1' },
    { title: 'Business Meeting', desc: 'Office discussion', level: 'B2' },
  ]},
  { key: 'monologue', icon: '🎙️', type: 'monologue', exercises: [
    { title: 'My Daily Routine', desc: 'Simple monologue', level: 'A2' },
    { title: 'Travel Experience', desc: 'Storytelling', level: 'B1' },
    { title: 'Opinion Talk', desc: 'Argumentative speech', level: 'B2' },
  ]},
]

const filteredLibrary = computed(() =>
  filterLevel.value
    ? library.map(c => ({ ...c, exercises: c.exercises.filter(e => e.level === filterLevel.value) })).filter(c => c.exercises.length)
    : library
)

let utterance: SpeechSynthesisUtterance | null = null

async function selectExercise(ex: any, type: string) {
  selectedExercise.value = ex
  qSubmitted.value = false
  isSpeaking.value = false
  progress.value = 0
  fetchError.value = ''
  stopSpeech()
  loading.value = true
  try {
    exercise.value = await api.getListeningExercise({ level: ex.level, type, topic: ex.title })
    qAnswers.value = new Array(exercise.value?.questions?.length ?? 0).fill(-1)
    tab.value = 'script'
  } catch (e) {
    exercise.value = null
    fetchError.value = errorText(e, t('skills.common.connectError'))
  }
  finally { loading.value = false }
}

function reloadExercise() {
  if (selectedExercise.value) selectExercise(selectedExercise.value, library.find(c => c.exercises.includes(selectedExercise.value))?.type ?? 'conversation')
}

function submitQ() {
  qSubmitted.value = true
  completedAt.value = clockTime()
}

function startWave() { stopWave(); waveTimer = setInterval(() => { wavePhase.value += 0.15 }, 50) }
function stopWave() { if (waveTimer) { clearInterval(waveTimer); waveTimer = null } }

function startSpeech() {
  stopSpeech()
  utterance = new SpeechSynthesisUtterance(exercise.value?.script ?? '')
  utterance.rate = speed.value
  let words = 0; const total = (exercise.value?.script ?? '').split(' ').length
  utterance.onboundary = (e) => { if(e.name==='word') { words++; progress.value = Math.min(words/total*100, 100) } }
  utterance.onend = () => { isSpeaking.value = false; stopWave() }
  window.speechSynthesis?.speak(utterance)
  isSpeaking.value = true
  startWave()
}
function stopSpeech() {
  window.speechSynthesis?.cancel()
  isSpeaking.value = false
  stopWave()
}
function togglePlay() {
  if (isSpeaking.value) { window.speechSynthesis?.pause(); isSpeaking.value = false; stopWave(); return }
  if (window.speechSynthesis?.paused) { window.speechSynthesis.resume(); isSpeaking.value = true; startWave(); return }
  startSpeech()
}
function replay() { progress.value = 0; startSpeech() }
function cycleSpeed() { speedIndex.value = (speedIndex.value+1)%speeds.length; if(isSpeaking.value) startSpeech() }

function qOptClass(qi: string | number, oi: string | number) {
  const q = Number(qi), o = Number(oi)
  if (!qSubmitted.value) return qAnswers.value[q]===o ? 'sec-emerald' : 'border border-border text-foreground hover:border-emerald-500/40'
  const c = exercise.value?.questions[q]?.correct
  if (o===c) return 'answer-correct'
  if (o===qAnswers.value[q]) return 'answer-wrong'
  return 'border border-border text-muted-foreground opacity-40'
}
function qOptBadge(qi: string | number, oi: string | number) {
  const q = Number(qi), o = Number(oi)
  if (!qSubmitted.value) return qAnswers.value[q]===o ? 'sec-emerald' : 'border border-border text-muted-foreground'
  const c = exercise.value?.questions[q]?.correct
  if (o===c) return 'sec-emerald'
  if (o===qAnswers.value[q]) return 'sec-red'
  return 'border border-border text-muted-foreground'
}

onUnmounted(() => stopSpeech())
</script>
