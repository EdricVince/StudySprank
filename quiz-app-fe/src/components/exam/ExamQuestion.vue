<template>
  <div class="space-y-5">
    <!-- Section + Type badges -->
    <div class="flex items-center gap-2 flex-wrap">
      <span class="rounded-full px-3 py-0.5 text-xs font-bold" :class="sectionBadgeClass">{{ sectionLabel }}</span>
      <span class="bg-muted text-muted-foreground rounded-full px-3 py-0.5 text-xs">{{ typeLabel }}</span>
      <span class="text-muted-foreground text-sm ml-auto">{{ $t('exam.questionOf', { current: index + 1, total }) }}</span>
    </div>

    <!-- LISTENING: Professional Audio Player (no transcript shown) -->
    <div v-if="isListening && activePassage" class="listen-card">
      <!-- Header bar -->
      <div class="listen-card-header">
        <div class="flex items-center gap-3">
          <div class="listen-icon-box">🎧</div>
          <div>
            <div class="listen-title">Listening Audio</div>
            <div class="listen-sub">{{ sectionLabel }}</div>
          </div>
        </div>
        <!-- Status badge -->
        <div class="listen-badge" :class="isPlaying ? 'listen-badge-playing' : hasPlayed ? 'listen-badge-done' : 'listen-badge-idle'">
          <span class="listen-dot" :class="isPlaying ? 'listen-dot-playing' : hasPlayed ? 'listen-dot-done' : 'listen-dot-idle'"></span>
          {{ isPlaying ? 'Now Playing' : hasPlayed ? 'Completed' : 'Ready' }}
        </div>
      </div>

      <!-- Waveform visualizer -->
      <div class="px-5 pt-5 pb-4">
        <div class="listen-wave-bg">
          <!-- Animated background sweep when playing -->
          <div v-if="isPlaying" class="listen-sweep" />
          <!-- Waveform bars -->
          <div class="relative flex items-center gap-[2.5px]">
            <div
v-for="(bar, i) in waveformBars" :key="i"
              class="rounded-full"
              :class="isPlaying ? 'listen-bar-playing' : hasPlayed ? 'listen-bar-done' : 'listen-bar-idle'"
              :style="{
                width: '3px',
                height: (isPlaying ? bar.h : Math.max(bar.h * 0.28, 3)) + 'px',
                animation: isPlaying ? `listen-bar-wave ${bar.d}s ease-in-out ${bar.o} infinite alternate` : 'none',
                transition: 'height 0.4s ease, background-color 0.3s ease',
              }"
            />
          </div>
        </div>
      </div>

      <!-- Native-style player control bar -->
      <div class="listen-controls mx-5 mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5">
        <!-- Play / pause -->
        <button
          class="listen-play-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90"
          :title="isPlaying ? 'Pause' : 'Play'"
          @click="togglePlay"
        >
          <svg v-if="!isPlaying" class="h-4 w-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>
          </svg>
        </button>

        <!-- Time -->
        <span class="listen-time shrink-0 font-mono text-xs tabular-nums">{{ fmt(currentTime) }} / {{ fmt(duration) }}</span>

        <!-- Seek progress bar -->
        <div class="listen-seek relative h-1.5 flex-1 rounded-full">
          <div class="listen-seek-fill absolute left-0 top-0 h-full rounded-full" :style="{ width: progressPct + '%' }" />
          <div class="listen-seek-knob absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow" :style="{ left: progressPct + '%' }" />
        </div>

        <!-- Volume icon -->
        <svg class="listen-vol h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path
stroke-linecap="round" stroke-linejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072M12 6v12M8.464 8.464a5 5 0 000 7.072"/>
        </svg>
      </div>

    </div>

    <!-- READING: show passage normally (not for listening/writing) -->
    <div
v-if="!isListening && !isWriting && question.passage"
      class="border-primary/60 bg-primary/5 border-l-4 rounded-r-lg p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
      {{ question.passage }}
    </div>

    <!-- WRITING: task prompt + textarea -->
    <template v-if="isWriting">
      <!-- Task context: SVG chart (Task 1) or plain text (TOEFL integrated) -->
      <div v-if="question.passage" class="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <!-- Chart data detected → render visual chart -->
        <template v-if="chartData">
          <div class="text-violet-400 text-xs font-bold uppercase tracking-wider mb-3">Chart to Analyse</div>
          <IeltsChart :data="chartData" />
        </template>
        <!-- Plain text passage (TOEFL integrated writing) -->
        <template v-else>
          <div class="text-violet-400 text-xs font-bold uppercase tracking-wider mb-2">Task Context</div>
          <p class="text-foreground/80 text-sm leading-relaxed italic">{{ question.passage }}</p>
        </template>
      </div>

      <!-- Academic Discussion: structured layout -->
      <template v-if="question.type === 'academic-discussion' && discussionParts">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <span class="text-violet-300 font-bold text-sm">✍️ Academic Discussion Task</span>
          <span class="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400 font-semibold">
            min {{ minWords }} words
          </span>
        </div>

        <!-- Professor block -->
        <div
          v-for="p in discussionParts.filter(x => x.role === 'professor')"
          :key="p.name"
          class="rounded-xl border border-violet-500/25 bg-violet-500/8 p-4"
        >
          <div class="mb-2 flex items-center gap-2">
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-sm">🎓</span>
            <span class="text-xs font-bold text-violet-400 uppercase tracking-wide">{{ p.name }}</span>
          </div>
          <p class="text-foreground/90 text-sm leading-relaxed">{{ p.text }}</p>
        </div>

        <!-- Student blocks -->
        <div
          v-for="(p, idx) in discussionParts.filter(x => x.role === 'student')"
          :key="p.name"
          class="rounded-xl border p-4"
          :class="idx === 0
            ? 'border-blue-500/25 bg-blue-500/6'
            : 'border-emerald-500/25 bg-emerald-500/6'"
        >
          <div class="mb-2 flex items-center gap-2">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white"
              :class="idx === 0 ? 'bg-blue-500/70' : 'bg-emerald-500/70'"
            >{{ p.name?.[0] ?? '?' }}</span>
            <span
              class="text-xs font-bold uppercase tracking-wide"
              :class="idx === 0 ? 'text-blue-400' : 'text-emerald-400'"
            >{{ p.name }}</span>
          </div>
          <p class="text-foreground/85 text-sm leading-relaxed">{{ p.text }}</p>
        </div>

        <!-- Your task prompt -->
        <div
          v-for="p in discussionParts.filter(x => x.role === 'instruction')"
          :key="p.text"
          class="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4"
        >
          <div class="mb-1.5 flex items-center gap-2">
            <span class="text-amber-400 text-xs font-bold uppercase tracking-wide">✏️ Your Task</span>
          </div>
          <p class="text-foreground/90 text-sm leading-relaxed font-medium">{{ p.text }}</p>
        </div>
      </template>

      <!-- Other writing tasks (Task 1, Task 2, Integrated Writing) -->
      <div v-else class="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-violet-400 font-bold text-sm">✍️ {{ writingLabel }}</span>
          <span class="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400 font-semibold">
            min {{ minWords }} words
          </span>
        </div>
        <p class="text-foreground text-sm leading-relaxed font-medium">{{ taskInstruction }}</p>
      </div>

      <!-- Textarea -->
      <div class="space-y-2">
        <textarea
          class="w-full rounded-xl border border-border bg-card/50 text-foreground text-sm leading-relaxed p-4 resize-none focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-muted-foreground/50"
          rows="12"
          :placeholder="question.type === 'writing-task1'
            ? 'Start your response here. Describe the main features, trends, and comparisons shown in the data...'
            : question.type === 'academic-discussion'
            ? 'Add your own perspective to this discussion. Support your view with reasons and examples...'
            : question.type === 'integrated-writing'
            ? 'Summarize the listening points and explain how they relate to the reading passage...'
            : 'Start your essay here. Present your arguments clearly with supporting examples and a conclusion...'"
          :value="writingText ?? ''"
          @input="onWriteInput"
        />
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">{{ wordCount }} words</span>
          <span :class="wordCount >= minWords ? 'text-green-400 font-semibold' : 'text-amber-400'">
            {{ wordCount >= minWords ? '✓ Minimum word count met' : `Minimum: ${minWords} words` }}
          </span>
        </div>
      </div>
    </template>

    <!-- MCQ (non-writing sections) -->
    <template v-else>
      <p class="text-foreground text-base font-semibold leading-relaxed">{{ question.question }}</p>

      <div class="space-y-2.5">
        <button
          v-for="(opt, i) in question.options"
          :key="i"
          class="flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all duration-200"
          :class="{
            'border-primary bg-primary/15 text-foreground font-medium': selected === i && !showResult,
            'border-green-500 bg-green-500/10 text-green-300': showResult && i === question.correct_answer,
            'border-red-500 bg-red-500/10 text-red-300': showResult && selected === i && i !== question.correct_answer,
            'border-border text-foreground hover:border-primary/50 hover:bg-primary/5': selected !== i && !(showResult && i === question.correct_answer),
          }"
          :disabled="showResult"
          @click="$emit('select', i)"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            :class="{
              'bg-primary text-primary-foreground': selected === i && !showResult,
              'bg-green-500 text-white': showResult && i === question.correct_answer,
              'bg-red-500 text-white': showResult && selected === i && i !== question.correct_answer,
              'bg-muted text-muted-foreground': selected !== i && !(showResult && i === question.correct_answer),
            }"
          >{{ ['A','B','C','D'][i] }}</span>
          <span>{{ opt.replace(/^[A-D]\.\s*/, '') }}</span>
        </button>
      </div>

      <div v-if="showResult && question.explanation" class="border-primary/30 bg-primary/8 rounded-lg border p-3.5 text-sm text-primary/90">
        💡 {{ question.explanation }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import IeltsChart, { type ChartData } from './IeltsChart.vue'

const props = defineProps<{
  question: {
    id: number
    section: string
    type: string
    passage?: string | null
    question: string
    options: string[]
    correct_answer: number
    explanation: string
  }
  index: number
  total: number
  selected: number | null
  showResult: boolean
  sectionPassage?: string | null
  writingText?: string
}>()

const emit = defineEmits<{
  (e: 'select', i: number): void
  (e: 'write', text: string): void
}>()

// ── Section detection ──────────────────────────────────────────────────────────
const LISTENING_SECTIONS = ['Listening Part 1', 'Listening Part 2', 'Listening Part 3', 'Listening Part 4', 'Listening', 'Listening — Lecture', 'Listening — Discussion']
const isListening = computed(() => LISTENING_SECTIONS.includes(props.question.section))
const isWriting = computed(() => props.question.section === 'Writing')

// For listening: use question's own passage if present (TOEIC Part 2 each has its own), else fall back to section passage
const activePassage = computed(() => props.question.passage || props.sectionPassage || null)

// ── TTS ────────────────────────────────────────────────────────────────────────
const isPlaying = ref(false)
const hasPlayed = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let keepAliveTimer: ReturnType<typeof setInterval> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null
// Cancels a start that is still waiting for voices to load (Chrome).
let cancelPendingStart: (() => void) | null = null

const progressPct = computed(() =>
  duration.value ? Math.min(100, (currentTime.value / duration.value) * 100) : 0
)

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// Estimate spoken duration: ~127 wpm at rate 0.85 → ≈2.1 words/sec
function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.round(words / 2.1))
}

const waveformBars = [
  {h:8,  d:'0.80', o:'0.00s'}, {h:16, d:'0.65', o:'0.04s'}, {h:28, d:'0.90', o:'0.08s'}, {h:40, d:'0.70', o:'0.12s'},
  {h:32, d:'0.85', o:'0.16s'}, {h:20, d:'0.60', o:'0.20s'}, {h:12, d:'0.95', o:'0.24s'}, {h:24, d:'0.75', o:'0.28s'},
  {h:38, d:'0.80', o:'0.32s'}, {h:44, d:'0.65', o:'0.36s'}, {h:36, d:'1.00', o:'0.40s'}, {h:20, d:'0.70', o:'0.44s'},
  {h:12, d:'0.85', o:'0.48s'}, {h:28, d:'0.60', o:'0.52s'}, {h:40, d:'0.90', o:'0.56s'}, {h:32, d:'0.75', o:'0.60s'},
  {h:16, d:'0.80', o:'0.64s'}, {h:8,  d:'0.65', o:'0.68s'}, {h:20, d:'0.95', o:'0.72s'}, {h:36, d:'0.70', o:'0.76s'},
  {h:44, d:'0.85', o:'0.80s'}, {h:38, d:'0.60', o:'0.84s'}, {h:24, d:'1.00', o:'0.88s'}, {h:12, d:'0.75', o:'0.92s'},
  {h:20, d:'0.80', o:'0.96s'}, {h:32, d:'0.65', o:'1.00s'}, {h:40, d:'0.90', o:'1.04s'}, {h:28, d:'0.70', o:'1.08s'},
  {h:16, d:'0.85', o:'1.12s'}, {h:8,  d:'0.60', o:'1.16s'}, {h:20, d:'0.95', o:'1.20s'}, {h:32, d:'0.75', o:'1.24s'},
  {h:40, d:'0.80', o:'1.28s'}, {h:44, d:'0.65', o:'1.32s'}, {h:36, d:'1.00', o:'1.36s'}, {h:24, d:'0.70', o:'1.40s'},
  {h:12, d:'0.85', o:'1.44s'}, {h:20, d:'0.60', o:'1.48s'}, {h:32, d:'0.90', o:'1.52s'}, {h:40, d:'0.75', o:'1.56s'},
]

function clearTimers() {
  if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
}

function stopTTS() {
  // Abort a start that is still waiting for voices, so it can't fire later.
  cancelPendingStart?.()
  clearTimers()
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  isPlaying.value = false
}

function doSpeak(text: string) {
  const synth = window.speechSynthesis
  // Chrome bug: resume if stuck in paused state
  if (synth.paused) synth.resume()
  synth.cancel()
  // Drop any timers from a prior start before creating new ones (no leak).
  clearTimers()

  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.85
  utt.lang = 'en-US'

  // Start animation + timeline immediately on click, don't wait for onstart
  duration.value = estimateDuration(text)
  currentTime.value = 0
  isPlaying.value = true
  hasPlayed.value = true

  // Smooth ticking clock + seek bar
  progressTimer = setInterval(() => {
    if (isPlaying.value) currentTime.value = Math.min(duration.value, currentTime.value + 0.25)
  }, 250)

  // Chrome cancels long utterances after ~15s — keep alive
  keepAliveTimer = setInterval(() => {
    if (synth.speaking && !synth.paused) { synth.pause(); synth.resume() }
  }, 10000)

  const textLen = text.length
  // Correct the clock to real position at each word boundary
  utt.onboundary = (e: SpeechSynthesisEvent) => {
    if (e.charIndex != null && textLen) {
      currentTime.value = (e.charIndex / textLen) * duration.value
    }
  }
  utt.onend = () => { currentTime.value = duration.value; isPlaying.value = false; clearTimers() }
  utt.onerror = () => { isPlaying.value = false; clearTimers() }

  synth.speak(utt)
}

function playTTS() {
  const text = activePassage.value
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return

  const synth = window.speechSynthesis
  const voices = synth.getVoices()

  if (voices.length > 0) {
    doSpeak(text)
    return
  }

  // Chrome: voices not loaded yet — wait for them, then speak.
  // Both the event and the fallback route through startOnce so it fires only
  // once, and cancelPendingStart lets stop/unmount/question-change abort it.
  let started = false
  const onReady = () => startOnce()
  const timer = setTimeout(() => startOnce(), 800)
  const cleanup = () => {
    synth.removeEventListener('voiceschanged', onReady)
    clearTimeout(timer)
    cancelPendingStart = null
  }
  const startOnce = () => {
    if (started) return
    started = true
    cleanup()
    doSpeak(text)
  }
  cancelPendingStart = () => { started = true; cleanup() }
  synth.addEventListener('voiceschanged', onReady)
}

function togglePlay() {
  if (isPlaying.value) stopTTS()
  else playTTS()
}

// Stop audio when switching questions
watch(activePassage, (newP, oldP) => {
  if (newP !== oldP) {
    stopTTS()
    hasPlayed.value = false
    currentTime.value = 0
    duration.value = 0
  }
}, { immediate: false })

onUnmounted(stopTTS)

// ── Writing ────────────────────────────────────────────────────────────────────
const chartData = computed<ChartData | null>(() => {
  if (props.question.type !== 'writing-task1' || !props.question.passage) return null
  try {
    const parsed = JSON.parse(props.question.passage)
    if (parsed && parsed.type) return parsed as ChartData
  } catch {
    // not chart JSON — render as plain passage
  }
  return null
})

const writingLabel = computed(() => {
  const t = props.question.type
  if (t === 'writing-task1')       return 'Writing Task 1'
  if (t === 'writing-task2')       return 'Writing Task 2'
  if (t === 'integrated-writing')  return 'Integrated Writing'
  if (t === 'academic-discussion') return 'Academic Discussion'
  return 'Writing'
})

const minWords = computed(() => {
  if (props.question.type === 'writing-task1' || props.question.type === 'integrated-writing') return 150
  if (props.question.type === 'academic-discussion') return 100
  return 250
})

const wordCount = computed(() => {
  const text = props.writingText ?? ''
  return text.trim() ? text.trim().split(/\s+/).length : 0
})

const taskInstruction = computed(() => {
  return props.question.question
    .replace(/^Task \d+\s*[—–-]\s*minimum \d+ words:\s*/i, '')
    .replace(/^(Integrated Writing Task|Academic Discussion Task)\s*\(minimum \d+ words\):\s*/i, '')
})

type DiscussionRole = 'professor' | 'student' | 'instruction'
interface DiscussionPart { role: DiscussionRole; name?: string; text: string }

const discussionParts = computed<DiscussionPart[] | null>(() => {
  if (props.question.type !== 'academic-discussion') return null
  const raw = taskInstruction.value
  const chunks = raw.split(/\n\n+/).map(c => c.trim()).filter(Boolean)
  const parts: DiscussionPart[] = []
  for (const chunk of chunks) {
    // Match "Name: text" pattern — name has no newlines before colon
    const m = chunk.match(/^([^\n:]{1,40}):\s*([\s\S]+)$/)
    if (m) {
      const name = (m[1] ?? '').trim()
      const text = (m[2] ?? '').trim()
      const isProf = /professor|prof\.|dr\./i.test(name)
      parts.push({ role: isProf ? 'professor' : 'student', name, text })
    } else {
      parts.push({ role: 'instruction', text: chunk })
    }
  }
  return parts.length ? parts : null
})

function onWriteInput(e: Event) {
  emit('write', (e.target as HTMLTextAreaElement).value)
}

// ── Section style map ──────────────────────────────────────────────────────────
const sectionMap: Record<string, { label: string; cls: string }> = {
  'Listening Part 1':  { label: '🎧 Listening — Part 1',      cls: 'sec-blue' },
  'Listening Part 2':  { label: '🎧 Listening — Part 2',      cls: 'sec-cyan' },
  Reading:             { label: '📖 Reading',                  cls: 'sec-green' },
  Writing:             { label: '✍️ Writing',                  cls: 'sec-violet' },
  'Listening Part 3':  { label: '🗣️ Part 3 — Conversations',  cls: 'sec-cyan' },
  'Listening Part 4':  { label: '📢 Part 4 — Short Talks',    cls: 'sec-teal' },
  'Reading Part 5':    { label: '📝 Part 5 — Grammar',        cls: 'sec-amber' },
  'Reading Part 6':    { label: '📄 Part 6 — Text Completion', cls: 'sec-orange' },
  'Reading Part 7':    { label: '📰 Part 7 — Reading',        cls: 'sec-emerald' },
  Listening:               { label: '🎧 Listening',                   cls: 'sec-blue' },
  'Listening — Lecture':   { label: '🎓 Listening — Lecture',         cls: 'sec-teal' },
  'Listening — Discussion':{ label: '🗣️ Listening — Discussion',      cls: 'sec-cyan' },
  'Reading Passage 1':     { label: '📖 Reading — Passage 1',         cls: 'sec-teal' },
  'Reading Passage 2':     { label: '📖 Reading — Passage 2',         cls: 'sec-cyan' },
  Speaking:                { label: '🎤 Speaking',                    cls: 'sec-orange' },
  Grammar:             { label: '📝 Grammar',                 cls: 'sec-amber' },
  'Text Completion':   { label: '📄 Text Completion',         cls: 'sec-pink' },
}

const sectionLabel = computed(() => sectionMap[props.question.section]?.label ?? props.question.section)
const sectionBadgeClass = computed(() => sectionMap[props.question.section]?.cls ?? 'bg-muted text-muted-foreground')

const typeLabel = computed(() => {
  const typeMap: Record<string, string> = {
    'multiple-choice':       'Multiple Choice',
    'true-false-not-given':  'True / False / Not Given',
    'note-completion':       'Note Completion',
    'sentence-completion':   'Sentence Completion',
    'matching-headings':     'Matching Headings',
    'writing-task1':         'Writing Task 1',
    'writing-task2':         'Writing Task 2',
    'vocabulary-range':      'Vocabulary Range',
    'photograph':            'Photograph Description',
    'question-response':     'Question-Response',
    'conversation':          'Conversation',
    'short-talk':            'Short Talk',
    'incomplete-sentence':   'Incomplete Sentence',
    'text-completion':       'Text Completion',
    'main-idea':             'Main Idea',
    'specific-detail':       'Specific Detail',
    'vocabulary-in-context': 'Vocabulary in Context',
    'inference':             'Inference',
    'factual-detail':        'Factual Detail',
    'vocabulary':            'Vocabulary in Context',
    'purpose':               'Author\'s Purpose',
    'implied-meaning':       'Implied Meaning',
    'speaker-attitude':      'Speaker\'s Attitude',
    'student-opinion':       'Student Opinion',
    'main-point':            'Main Point',
    'integrated-writing':    'Integrated Writing Task',
    'academic-discussion':   'Academic Discussion Task',
  }
  return typeMap[props.question.type] ?? props.question.type
})
</script>

<style>
/* Global (unscoped) so the inline :style animation binding on the waveform bars
   can reference them — scoped keyframes get renamed and wouldn't match. */
@keyframes listen-bar-wave {
  from { transform: scaleY(0.2); }
  to   { transform: scaleY(1); }
}
@keyframes listen-bg-sweep {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
