<template>
  <div class="min-h-full">
    <!-- Header -->
    <div class="page-header">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-lg">🎙️</div>
          <h1 class="page-title">Speaking Practice</h1>
        </div>
        <button :disabled="loading" class="btn-rose px-4 py-1.5 text-sm disabled:opacity-50" @click="loadContent">
          {{ loading ? 'Loading...' : (exercise || speakingPrompt) ? '🔀 Randomize' : 'Get Started' }}
        </button>
      </div>
    </div>

    <div class="mx-auto max-w-6xl px-6 py-5 space-y-4">

      <!-- Level Selector -->
      <div class="sk-card-p">
        <div class="mb-3 flex items-center justify-between">
          <span class="section-label">Proficiency Level</span>
          <span class="text-muted-foreground text-xs">Content complexity adjusts automatically</span>
        </div>
        <div class="grid grid-cols-6 gap-2">
          <button
            v-for="lm in levelMeta" :key="lm.code"
            class="flex flex-col items-center gap-1.5 rounded-xl border py-3 px-1 transition-all duration-200 hover:scale-[1.03]"
            :class="selectedLevel === lm.code ? lm.activeClass : 'border-border text-muted-foreground hover:border-rose-500/30 hover:text-foreground'"
            @click="selectLevel(lm.code)"
          >
            <span class="text-sm font-extrabold tracking-wide">{{ lm.code }}</span>
            <span class="text-[10px] leading-tight text-center opacity-80">{{ lm.label }}</span>
            <div class="flex items-center gap-0.5 opacity-60">
              <span class="text-[9px] font-mono">{{ lm.time }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Skill Type Toggle -->
      <div class="sk-card-p flex items-center justify-between gap-4">
        <span class="section-label">Skill Type</span>
        <div class="flex gap-2">
          <button
class="rounded-xl border px-5 py-2 text-sm font-semibold transition-all"
            :class="skillType==='shadowing' ? 'skill-tab-rose' : 'border-border text-muted-foreground hover:text-foreground'"
            @click="switchSkillType('shadowing')">
            🔁 Shadowing
          </button>
          <button
class="rounded-xl border px-5 py-2 text-sm font-semibold transition-all"
            :class="skillType==='speaking_test' ? 'skill-tab-rose' : 'border-border text-muted-foreground hover:text-foreground'"
            @click="switchSkillType('speaking_test')">
            🎤 Speaking Test
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-16">
        <svg class="sk-spinner-rose" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>

      <!-- Error state -->
      <div v-else-if="fetchError" class="empty-state">
        <div class="mb-4 text-6xl">⚠️</div>
        <h3 class="text-foreground text-xl font-bold">Failed to load content</h3>
        <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ fetchError }}</p>
        <button class="btn-rose mt-4 px-5 py-2 text-sm" @click="loadContent">Retry</button>
      </div>

      <!-- Empty state -->
      <div v-else-if="!exercise && !speakingPrompt" class="empty-state">
        <div class="mb-4 text-6xl">🎙️</div>
        <h3 class="text-foreground text-xl font-bold">Ready to Practice</h3>
        <p class="text-muted-foreground mt-2 max-w-sm text-sm">
          Select your level above, choose <strong>Shadowing</strong> or <strong>Speaking Test</strong>, then click <strong>Get Started</strong>.
        </p>
        <button class="btn-rose mt-4 px-6 py-2.5 text-sm font-semibold" @click="loadContent">Get Started →</button>
      </div>

      <!-- Main 2-column layout -->
      <div v-else class="grid gap-5 lg:grid-cols-2">

        <!-- LEFT: Camera + Recording -->
        <div class="space-y-4">
          <!-- Camera panel -->
          <div class="sk-card-p">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-foreground text-sm font-bold">📷 Camera Analysis</h3>
              <div class="flex items-center gap-2">
                <span
v-if="isRecording && mouthScore !== null"
                  class="rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="mouthScore > 40 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'">
                  Articulation {{ mouthScore }}%
                </span>
                <div class="h-2 w-2 rounded-full" :class="cameraActive ? 'live-dot' : 'bg-muted'"></div>
              </div>
            </div>
            <div class="relative aspect-video overflow-hidden rounded-xl bg-zinc-900">
              <video ref="videoEl" autoplay muted playsinline class="h-full w-full object-cover transition-opacity" :class="cameraActive ? 'opacity-100' : 'opacity-0'"></video>
              <canvas ref="canvasEl" class="absolute inset-0 h-full w-full pointer-events-none"></canvas>
              <div v-if="!cameraActive" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <span class="text-4xl">📷</span>
                <span class="text-xs text-center max-w-50">{{ cameraError || 'Camera initializing...' }}</span>
                <button v-if="cameraError" class="mt-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-400 hover:bg-rose-500/20" @click="startCamera">
                  Retry Camera
                </button>
              </div>
              <div v-if="isRecording" class="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                <span class="rec-dot"></span>REC
              </div>
            </div>
            <p v-if="cameraActive" class="mt-2 text-center text-xs text-muted-foreground">AI monitors mouth movement and articulation in real time</p>
          </div>

          <!-- Recording controls -->
          <div class="sk-card-p">
            <div class="flex flex-col items-center gap-4">
              <button
class="flex h-16 w-16 items-center justify-center rounded-full transition-all hover:scale-105"
                :class="isRecording ? 'bg-red-600 shadow-lg shadow-red-500/40' : 'bg-linear-to-r from-rose-600 to-pink-600 shadow-lg shadow-rose-500/30'"
                @click="toggleRecording">
                <svg v-if="!isRecording" class="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <svg v-else class="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              </button>
              <p class="text-muted-foreground text-sm">{{ isRecording ? 'Recording… tap to stop' : 'Tap microphone to start recording' }}</p>

              <div v-if="spokenTranscript" class="speech-box">
                <span class="text-rose-400 font-semibold text-xs block mb-1">Recognized speech:</span>
                <span class="text-muted-foreground">{{ spokenTranscript }}</span>
              </div>

              <div v-if="audioBlob" class="flex w-full gap-2">
                <button class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-colors" @click="playRecording">
                  ▶ Play Back
                </button>
                <button
:disabled="evaluating || !spokenTranscript" class="btn-rose flex flex-1 items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-40"
                  @click="evaluateRecording">
                  <svg v-if="evaluating" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <span>{{ evaluating ? 'Analyzing...' : '✨ Evaluate' }}</span>
                </button>
              </div>

              <div v-if="micError" class="w-full info-box-sm info-box-amber text-center text-xs text-amber-400">
                Microphone permission denied. Please allow microphone access in your browser settings.
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Content -->
        <div class="space-y-4">

          <!-- Shadowing content -->
          <template v-if="skillType==='shadowing' && exercise">
            <div class="sk-card-p">
              <!-- Header row with level, topic, time -->
              <div class="mb-4 flex flex-wrap items-center gap-2">
                <span :class="levelBadge(exercise.level)">{{ exercise.level }}</span>
                <span class="chip">{{ exercise.topic }}</span>
                <span class="flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/8 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 6v6l4 2"/></svg>
                  {{ exerciseSpeakTime }}
                </span>
                <span class="text-muted-foreground text-xs ml-auto">{{ exercise.title }}</span>
              </div>

              <!-- Shadowing text -->
              <div class="rounded-xl border p-5 info-box-rose">
                <p class="text-foreground text-base leading-loose font-medium tracking-wide">{{ exercise.text }}</p>
              </div>

              <!-- Word count & difficulty badge -->
              <div class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{{ wordCount(exercise.text) }} words</span>
                <span class="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
                <span>{{ exercise.difficulty_notes }}</span>
              </div>

              <div v-if="exercise.phonetic_highlights?.length" class="mt-4 space-y-1.5">
                <div class="section-label mb-2">Pronunciation Guide</div>
                <div v-for="ph in exercise.phonetic_highlights" :key="ph.word" class="flex items-start gap-2 rounded-lg bg-muted/10 px-3 py-2 text-sm">
                  <span class="font-bold text-rose-400 w-24 shrink-0">{{ ph.word }}</span>
                  <span class="font-mono text-muted-foreground w-28 shrink-0 text-xs">{{ ph.phonetic }}</span>
                  <span class="text-muted-foreground text-xs">{{ ph.tip }}</span>
                </div>
              </div>
              <div v-if="exercise.key_phrases?.length" class="mt-4">
                <div class="section-label mb-2">Key Phrases</div>
                <div class="space-y-1.5">
                  <div v-for="kp in exercise.key_phrases" :key="kp.phrase" class="rounded-lg bg-muted/10 px-3 py-2 text-sm">
                    <span class="font-semibold text-foreground">{{ kp.phrase }}</span>
                    <span class="text-muted-foreground"> — {{ kp.meaning }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Speaking Test content -->
          <template v-if="skillType==='speaking_test' && speakingPrompt">
            <!-- Prep countdown -->
            <div v-if="prepPhase" class="info-box-lg info-box-amber-strong text-center">
              <div class="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">Preparation Time</div>
              <div class="my-1 text-5xl font-mono font-extrabold text-amber-400">{{ fmtTime(prepLeft) }}</div>
              <div class="text-muted-foreground text-xs">Read the question and prepare your answer</div>
            </div>

            <div class="sk-card-p">
              <!-- Header row with part, topic, time -->
              <div class="mb-4 flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-rose-500/30 bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300">Part {{ speakingPrompt.part }}</span>
                <span class="chip">{{ speakingPrompt.topic }}</span>
                <span class="flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/8 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 6v6l4 2"/></svg>
                  {{ fmtTime(speakingPrompt.speak_time_seconds ?? 120) }}
                </span>
                <span v-if="!prepPhase" class="ml-auto text-xs text-muted-foreground">
                  Prep: {{ fmtTime(speakingPrompt.prep_time_seconds ?? 60) }}
                </span>
              </div>

              <p class="text-foreground text-base font-semibold leading-relaxed">{{ speakingPrompt.question }}</p>

              <div v-if="speakingPrompt.bullet_points?.length" class="mt-4">
                <div class="section-label mb-2">You should say:</div>
                <ul class="space-y-1.5">
                  <li v-for="bp in speakingPrompt.bullet_points" :key="bp" class="flex items-start gap-2 text-sm text-muted-foreground">
                    <span class="text-rose-400 shrink-0 mt-0.5">•</span>{{ bp }}
                  </li>
                </ul>
              </div>
              <div v-if="speakingPrompt.example_vocabulary?.length" class="mt-4">
                <div class="section-label mb-2">Useful Vocabulary</div>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="w in speakingPrompt.example_vocabulary" :key="w" class="chip-border">{{ w }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Evaluation Results -->
          <template v-if="result">
            <div class="sk-card-p">
              <h2 class="text-foreground mb-2 text-sm font-bold">Pronunciation Report</h2>
              <AiGeneratedBadge class="mb-4" />
              <div class="grid grid-cols-2 gap-3">
                <div v-for="m in scoreMetrics" :key="m.label" class="rounded-xl border p-3 text-center" :class="m.bg">
                  <div class="text-2xl font-extrabold" :class="m.color">{{ m.value }}</div>
                  <div class="text-muted-foreground mt-0.5 text-xs">{{ m.label }}</div>
                  <div class="score-track mt-2">
                    <div class="score-fill" :class="m.bar" :style="{ width: m.value+'%' }"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="sk-card-p">
              <p class="text-foreground text-sm leading-relaxed">{{ result.overall_feedback }}</p>
              <div class="mt-2 text-xs text-muted-foreground">Evaluated at {{ evaluatedAt }}</div>
            </div>
            <div v-if="result.word_errors?.length" class="sk-card-p">
              <h3 class="text-foreground mb-3 text-sm font-bold">Word Errors</h3>
              <div class="space-y-2">
                <div v-for="err in result.word_errors" :key="err.target_word" class="result-error">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-muted-foreground">Said:</span>
                    <span class="text-red-400 font-semibold">"{{ err.spoken_word }}"</span>
                    <span class="text-muted-foreground">→</span>
                    <span class="text-emerald-400 font-semibold">"{{ err.target_word }}"</span>
                  </div>
                  <p class="text-muted-foreground mt-1 text-xs">{{ err.tip }}</p>
                </div>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="result-strength">
                <h3 class="text-emerald-400 mb-2 text-xs font-bold uppercase tracking-wide">Strengths</h3>
                <ul class="space-y-1 text-sm text-muted-foreground">
                  <li v-for="s in result.strengths" :key="s" class="flex items-start gap-1.5"><span class="text-emerald-400 shrink-0">•</span>{{ s }}</li>
                </ul>
              </div>
              <div class="result-improve">
                <h3 class="text-rose-400 mb-2 text-xs font-bold uppercase tracking-wide">Improvements</h3>
                <ul class="space-y-1 text-sm text-muted-foreground">
                  <li v-for="imp in result.improvements" :key="imp" class="flex items-start gap-1.5"><span class="text-rose-400 shrink-0">•</span>{{ imp }}</li>
                </ul>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '@/utils/api'
import AiGeneratedBadge from '@/components/common/AiGeneratedBadge.vue'

const levelMeta = [
  { code: 'A1', label: 'Beginner',    time: '~0:35', activeClass: 'level-filter-a1' },
  { code: 'A2', label: 'Elementary',  time: '~0:50', activeClass: 'level-filter-a2' },
  { code: 'B1', label: 'Intermediate',time: '~1:06', activeClass: 'level-filter-b1' },
  { code: 'B2', label: 'Upper-Int.',  time: '~1:27', activeClass: 'level-filter-b2' },
  { code: 'C1', label: 'Advanced',    time: '~1:45', activeClass: 'level-filter-c1' },
  { code: 'C2', label: 'Mastery',     time: '~2:04', activeClass: 'level-filter-c2' },
]

const selectedLevel = ref('B1')
const skillType = ref<'shadowing'|'speaking_test'>('shadowing')
const loading = ref(false)
const exercise = ref<any>(null)
const speakingPrompt = ref<any>(null)
const result = ref<any>(null)
const evaluating = ref(false)
const isRecording = ref(false)
const audioBlob = ref<Blob|null>(null)
const spokenTranscript = ref('')
const micError = ref(false)
const mouthScore = ref<number|null>(null)
const cameraError = ref('')
const evaluatedAt = ref('')
const fetchError = ref('')

const videoEl = ref<HTMLVideoElement|null>(null)
const canvasEl = ref<HTMLCanvasElement|null>(null)
const cameraActive = ref(false)
let cameraStream: MediaStream|null = null
let canvasTimer: ReturnType<typeof setInterval> | null = null
let prevFrameData: Uint8ClampedArray|null = null

const prepPhase = ref(false)
const prepLeft = ref(0)
let prepTimer: ReturnType<typeof setInterval> | null = null

let mediaRecorder: MediaRecorder|null = null
let audioChunks: Blob[] = []
let recognition: any = null

// Reading speed by CEFR level (words per minute)
const readingWpm: Record<string, number> = { A1: 80, A2: 90, B1: 100, B2: 110, C1: 120, C2: 130 }

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function wordCount(text: string) {
  return text?.trim().split(/\s+/).length ?? 0
}

const exerciseSpeakTime = computed(() => {
  if (!exercise.value?.text) return ''
  const wpm = readingWpm[selectedLevel.value] || 100
  const secs = Math.round(wordCount(exercise.value.text) / wpm * 60)
  return fmtTime(secs)
})

const scoreMetrics = computed(() => result.value ? [
  { label:'Overall',       value:result.value.overall_score,       bg:'bg-rose-500/10 border-rose-500/20',    color:'text-rose-400',    bar:'bg-rose-500' },
  { label:'Pronunciation', value:result.value.pronunciation_score,  bg:'bg-pink-500/10 border-pink-500/20',    color:'text-pink-400',    bar:'bg-pink-500' },
  { label:'Fluency',       value:result.value.fluency_score,        bg:'bg-purple-500/10 border-purple-500/20', color:'text-purple-400', bar:'bg-purple-500' },
  { label:'Accuracy',      value:result.value.accuracy_score,       bg:'bg-indigo-500/10 border-indigo-500/20', color:'text-indigo-400', bar:'bg-indigo-500' },
] : [])

function levelBadge(l: string) {
  const m: Record<string,string> = { A1:'badge-a1', A2:'badge-a2', B1:'badge-b1', B2:'badge-b2', C1:'badge-c1', C2:'badge-c2' }
  return m[l] ?? 'chip'
}

function selectLevel(l: string) {
  selectedLevel.value = l
  resetSession()
  loadContent()
}

async function startCamera() {
  cameraError.value = ''
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    if (videoEl.value) { videoEl.value.srcObject = cameraStream; await videoEl.value.play() }
    cameraActive.value = true
    startMouthDetection()
  } catch (e: any) {
    cameraActive.value = false
    cameraError.value = e?.name === 'NotAllowedError' ? 'Camera access denied. Click Retry to allow.' : 'Camera not available on this device.'
  }
}

function stopCamera() {
  cameraStream?.getTracks().forEach(t => t.stop())
  cameraStream = null; cameraActive.value = false
  if (canvasTimer) { clearInterval(canvasTimer); canvasTimer = null }
  mouthScore.value = null; prevFrameData = null
}

function startMouthDetection() {
  if (canvasTimer) clearInterval(canvasTimer)
  prevFrameData = null
  canvasTimer = setInterval(() => {
    if (!videoEl.value || !canvasEl.value || !cameraActive.value) return
    const v = videoEl.value, c = canvasEl.value, ctx = c.getContext('2d')
    if (!ctx || v.readyState < 2) return
    c.width = v.videoWidth || 320; c.height = v.videoHeight || 240
    ctx.drawImage(v, 0, 0, c.width, c.height)
    const mx = Math.floor(c.width*0.25), my = Math.floor(c.height*0.6)
    const mw = Math.floor(c.width*0.5),  mh = Math.floor(c.height*0.25)
    const frame = ctx.getImageData(mx, my, mw, mh)
    if (prevFrameData && isRecording.value) {
      let diff = 0
      for (let i = 0; i < frame.data.length; i += 4) diff += Math.abs((frame.data[i] ?? 0) - (prevFrameData[i] ?? 0))
      const score = Math.min(100, Math.round((diff / (frame.data.length / 4)) * 8))
      mouthScore.value = score
      ctx.strokeStyle = score > 20 ? '#22c55e' : '#6b7280'; ctx.lineWidth = 2
      ctx.setLineDash([]); ctx.strokeRect(mx, my, mw, mh)
    } else {
      ctx.strokeStyle = '#6b728040'; ctx.lineWidth = 1.5
      ctx.setLineDash([4,4]); ctx.strokeRect(mx, my, mw, mh); ctx.setLineDash([])
    }
    prevFrameData = new Uint8ClampedArray(frame.data)
  }, 100)
}

function resetSession() {
  exercise.value = null; speakingPrompt.value = null; result.value = null
  audioBlob.value = null; spokenTranscript.value = ''; fetchError.value = ''
  prepPhase.value = false; if (prepTimer) clearInterval(prepTimer)
}

function switchSkillType(type: 'shadowing'|'speaking_test') {
  skillType.value = type; resetSession(); loadContent()
}

async function loadContent() {
  resetSession(); loading.value = true; mouthScore.value = null; fetchError.value = ''
  try {
    if (skillType.value === 'shadowing') {
      exercise.value = await api.getSpeakingExercise(selectedLevel.value)
    } else {
      speakingPrompt.value = await api.getSpeakingPrompt(selectedLevel.value)
      if (speakingPrompt.value) startPrepTimer()
    }
  } catch (e: any) {
    exercise.value = null; speakingPrompt.value = null
    fetchError.value = e?.errorMessage || e?.message || 'Could not connect to server. Make sure you are logged in.'
  }
  finally { loading.value = false }
}

function startPrepTimer() {
  prepLeft.value = speakingPrompt.value?.prep_time_seconds ?? 60; prepPhase.value = true
  if (prepTimer) clearInterval(prepTimer)
  prepTimer = setInterval(() => {
    if (prepLeft.value <= 0) { if (prepTimer) clearInterval(prepTimer); prepPhase.value = false; return }
    prepLeft.value--
  }, 1000)
}

async function toggleRecording() {
  if (isRecording.value) { stopRecording(); return }
  await startRecording()
}

async function startRecording() {
  micError.value = false; spokenTranscript.value = ''; audioChunks = []
  audioBlob.value = null; result.value = null; mouthScore.value = null
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data) }
    mediaRecorder.onstop = () => { audioBlob.value = new Blob(audioChunks, { type: 'audio/webm' }); stream.getTracks().forEach(t => t.stop()) }
    mediaRecorder.start(); isRecording.value = true; startSpeechRecognition()
  } catch { micError.value = true }
}

function stopRecording() { mediaRecorder?.stop(); isRecording.value = false; recognition?.stop() }

function startSpeechRecognition() {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return
  recognition = new SR(); recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'
  let final = ''
  recognition.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript
      else interim += e.results[i][0].transcript
    }
    spokenTranscript.value = final + interim
  }
  recognition.start()
}

function playRecording() {
  if (!audioBlob.value) return
  const url = URL.createObjectURL(audioBlob.value)
  const a = new Audio(url); a.play(); a.onended = () => URL.revokeObjectURL(url)
}

async function evaluateRecording() {
  evaluating.value = true
  const targetText = skillType.value === 'shadowing' ? exercise.value?.text : speakingPrompt.value?.question
  try {
    result.value = await api.evaluateSpeaking({ target_text: targetText ?? '', spoken_transcript: spokenTranscript.value, level: selectedLevel.value })
    evaluatedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { result.value = null }
  finally { evaluating.value = false }
}

onMounted(() => { startCamera() })
onUnmounted(() => { stopCamera(); mediaRecorder?.stop(); recognition?.stop(); if (prepTimer) clearInterval(prepTimer) })
</script>
