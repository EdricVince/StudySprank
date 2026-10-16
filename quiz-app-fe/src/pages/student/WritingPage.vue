<template>
  <div class="min-h-full">
    <!-- Exam selection screen -->
    <div v-if="phase==='select'" class="mx-auto max-w-3xl px-6 py-10">
      <div class="mb-8 text-center">
        <div class="mb-3 text-5xl">✍️</div>
        <h1 class="text-foreground text-3xl font-extrabold">Writing Practice</h1>
        <p class="text-muted-foreground mt-2">Choose a test type and start your timed exam</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <button
v-for="type in examTypes" :key="type.value" class="group rounded-2xl border p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl"
          :class="type.cardClass"
          @click="startExam(type.value)">
          <div class="mb-3 text-3xl">{{ type.emoji }}</div>
          <h3 class="text-foreground text-lg font-bold">{{ type.name }}</h3>
          <p class="text-muted-foreground mt-1 text-sm">{{ type.desc }}</p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="chip">⏱ {{ type.time }} min</span>
            <span class="chip">📝 {{ type.words }}</span>
            <span class="rounded-full px-2.5 py-1" :class="type.levelBg">{{ type.level }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="phase==='loading'" class="empty-state">
      <svg class="sk-spinner-indigo" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      <p class="text-muted-foreground mt-4">Generating your writing prompt...</p>
    </div>

    <!-- Error loading prompt -->
    <div v-else-if="phase==='error'" class="empty-state">
      <div class="mb-4 text-5xl">⚠️</div>
      <h3 class="text-foreground text-xl font-bold">Failed to load prompt</h3>
      <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ fetchError }}</p>
      <button class="btn-indigo mt-4 px-5 py-2 text-sm" @click="phase='select'">Back</button>
    </div>

    <!-- Error submitting essay -->
    <div v-else-if="phase==='submit-error'" class="empty-state">
      <div class="mb-4 text-5xl">⚠️</div>
      <h3 class="text-foreground text-xl font-bold">Evaluation failed</h3>
      <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ submitError }}</p>
      <div class="mt-4 flex gap-3">
        <button class="btn-indigo px-5 py-2 text-sm" @click="phase='writing'">Back to Essay</button>
        <button class="rounded-xl border border-border px-5 py-2 text-sm text-muted-foreground hover:text-foreground" @click="phase='select'">New Topic</button>
      </div>
    </div>

    <!-- Writing phase -->
    <div v-else-if="phase==='writing'" class="flex min-h-full flex-col">
      <!-- Sticky exam bar -->
      <div class="page-header">
        <div class="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <button class="back-btn" @click="phase='select'">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Topics
            </button>
            <span class="text-foreground text-sm font-semibold">{{ currentType?.name }}</span>
            <span class="chip">{{ prompt?.word_target }}</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="font-mono text-sm font-bold text-foreground">{{ wordCount }} words</span>
            <div class="rounded-xl px-4 py-1.5 font-mono text-lg font-extrabold" :class="timerClass">{{ fmtTime(timeLeft) }}</div>
            <button class="btn-indigo px-4 py-2 text-sm" @click="submitEssay">Submit</button>
          </div>
        </div>
      </div>
      <div class="mx-auto flex w-full max-w-4xl flex-1 gap-5 p-6">
        <!-- Prompt panel and Chart -->
        <div class="flex flex-col gap-4 w-80 shrink-0">
          <!-- SVG Chart for IELTS Task 1 -->
          <div v-if="prompt?.chart_svg && selectedType === 'ielts_task1'" class="sk-card-p overflow-hidden">
            <div class="section-label mb-2">📊 Chart Reference</div>
            <div class="w-full rounded-lg overflow-hidden" v-html="prompt.chart_svg" />
            <p class="text-muted-foreground mt-2 text-[11px] leading-snug">{{ prompt.context }}</p>
          </div>

          <!-- Prompt panel -->
          <div class="sk-card-p sticky top-24">
            <div class="section-label mb-1">{{ currentType?.name }} Task</div>
            <p class="text-foreground text-sm font-semibold leading-relaxed">{{ prompt?.prompt }}</p>
            <div v-if="prompt?.context" class="mt-3 info-box-sm info-box-amber text-xs text-amber-300/80">{{ prompt.context }}</div>
            <div v-if="prompt?.tips?.length" class="mt-3 space-y-1.5">
              <div v-for="tip in prompt.tips" :key="tip" class="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span class="text-amber-400 shrink-0">💡</span> {{ tip }}
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div class="rounded-lg bg-muted/20 p-2">
                <div class="text-foreground font-bold">{{ fmtTime(prompt?.time_limit_seconds ?? 0) }}</div>
                <div class="text-muted-foreground">Time limit</div>
              </div>
              <div class="rounded-lg bg-muted/20 p-2">
                <div class="text-foreground font-bold">{{ wordCount }}</div>
                <div class="text-muted-foreground">Words</div>
              </div>
            </div>
          </div>
        </div>
        <!-- Writing area -->
        <div class="flex-1">
          <textarea
v-model="essay" placeholder="Start writing here..."
            class="sk-textarea w-full"
            style="min-height: calc(100vh - 180px)" :disabled="timeUp"></textarea>
          <div v-if="timeUp" class="mt-3 info-box-sm info-box-red text-center text-sm text-red-400">
            ⏰ Time's up — essay submitted automatically.
          </div>
        </div>
      </div>
    </div>

    <!-- Evaluating -->
    <div v-else-if="phase==='evaluating'" class="empty-state">
      <svg class="sk-spinner-indigo" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      <p class="text-muted-foreground mt-4">AI is evaluating your essay...</p>
      <p class="text-muted-foreground mt-1 text-sm">This may take 10–20 seconds</p>
    </div>

    <!-- Results -->
    <div v-else-if="phase==='results' && evaluation" class="mx-auto max-w-3xl space-y-5 px-6 py-8">
      <!-- Band score -->
      <div class="sk-card-p6 text-center">
        <AiGeneratedBadge class="mb-3" />
        <div class="text-muted-foreground mb-2 text-sm">Overall Band Score</div>
        <div class="text-6xl font-extrabold text-indigo-400">{{ evaluation.overall_band }}</div>
        <p class="text-muted-foreground mt-2 text-sm">{{ evaluation.summary }}</p>
        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="(val, key) in evaluation.scores" :key="key" class="rounded-xl border border-border bg-muted/10 p-3">
            <div class="text-foreground text-xl font-extrabold">{{ val }}</div>
            <div class="text-muted-foreground mt-0.5 text-xs capitalize">{{ String(key).replace(/_/g,' ') }}</div>
          </div>
        </div>
        <div class="mt-3 text-xs text-muted-foreground">{{ evaluation.word_count }} words · {{ fmtTime(evaluation.time_taken_seconds) }} taken · {{ completedAt }}</div>
      </div>

      <!-- Strengths + Improvements -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="result-strength">
          <h3 class="text-emerald-400 mb-3 text-sm font-bold">✓ Strengths</h3>
          <ul class="space-y-1.5">
            <li v-for="s in evaluation.strengths" :key="s" class="flex items-start gap-2 text-sm text-muted-foreground">
              <span class="text-emerald-400 shrink-0">•</span>{{ s }}
            </li>
          </ul>
        </div>
        <div class="result-improve-am">
          <h3 class="text-amber-400 mb-3 text-sm font-bold">↑ Improvements</h3>
          <ul class="space-y-1.5">
            <li v-for="imp in evaluation.improvements" :key="imp" class="flex items-start gap-2 text-sm text-muted-foreground">
              <span class="text-amber-400 shrink-0">•</span>{{ imp }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Grammar errors -->
      <div v-if="evaluation.grammar_errors?.length" class="sk-card-p">
        <h3 class="text-foreground mb-3 text-sm font-bold">Grammar Corrections</h3>
        <div class="space-y-2.5">
          <div v-for="err in evaluation.grammar_errors" :key="err.original" class="result-error">
            <div><span class="text-red-400 line-through">{{ err.original }}</span><span class="text-muted-foreground mx-2">→</span><span class="text-emerald-400 font-semibold">{{ err.corrected }}</span></div>
            <p class="text-muted-foreground mt-1 text-xs">{{ err.explanation }}</p>
          </div>
        </div>
      </div>

      <!-- Vocabulary -->
      <div v-if="evaluation.vocabulary_feedback?.suggestions?.length" class="sk-card-p">
        <h3 class="text-foreground mb-3 text-sm font-bold">Vocabulary Upgrades</h3>
        <div class="space-y-2">
          <div v-for="s in evaluation.vocabulary_feedback.suggestions" :key="s.replace" class="text-sm">
            <span class="text-muted-foreground">Replace "</span><span class="text-indigo-400">{{ s.replace }}</span><span class="text-muted-foreground">" → "</span><span class="text-foreground font-semibold">{{ s.with }}</span><span class="text-muted-foreground">"</span>
          </div>
        </div>
      </div>

      <button class="btn-indigo w-full py-3" @click="phase='select'">
        Try Another Prompt
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { api } from '@/utils/api'
import AiGeneratedBadge from '@/components/common/AiGeneratedBadge.vue'

type Phase = 'select'|'loading'|'writing'|'evaluating'|'results'|'error'|'submit-error'

const examTypes = [
  { value:'ielts_task2', name:'IELTS Task 2', emoji:'🎓', desc:'Argumentative essay on a given topic', time:40, words:'250+ words', level:'B2–C2', cefrLevel:'B2', levelBg:'cbadge-indigo', cardClass:'card-tint-indigo' },
  { value:'ielts_task1', name:'IELTS Task 1', emoji:'📊', desc:'Describe a graph, chart or diagram', time:20, words:'150+ words', level:'B1–C1', cefrLevel:'B1', levelBg:'cbadge-blue', cardClass:'card-tint-blue' },
  { value:'toeic',       name:'TOEIC Writing', emoji:'💼', desc:'Business email or opinion essay', time:30, words:'100–200 words', level:'B1–B2', cefrLevel:'B1', levelBg:'cbadge-teal', cardClass:'card-tint-teal' },
  { value:'general',     name:'General Writing', emoji:'📝', desc:'Letter, description or opinion piece', time:25, words:'150–250 words', level:'A2–B2', cefrLevel:'B1', levelBg:'cbadge-rose', cardClass:'card-tint-rose' },
]

const phase      = ref<Phase>('select')
const prompt     = ref<any>(null)
const essay      = ref('')
const evaluation = ref<any>(null)
const timeLeft   = ref(0)
const timeUp     = ref(false)
const selectedType = ref('')
const completedAt  = ref('')
const fetchError   = ref('')
const submitError  = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const currentType = computed(() => examTypes.find(t => t.value === selectedType.value))
const wordCount   = computed(() => essay.value.trim() ? essay.value.trim().split(/\s+/).length : 0)
const timerClass  = computed(() => {
  if (timeLeft.value > 300) return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
  if (timeLeft.value > 60)  return 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
  return 'bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse'
})

async function startExam(type: string) {
  selectedType.value = type
  phase.value = 'loading'
  essay.value = ''
  timeUp.value = false
  evaluation.value = null
  const examType = examTypes.find(t => t.value === type)
  try {
    prompt.value = await api.getWritingPrompt({ type: type as any, level: examType?.cefrLevel as any })
    timeLeft.value = prompt.value?.time_limit_seconds ?? 1800
    phase.value = 'writing'
    startTimer()
  } catch (e: any) {
    fetchError.value = e?.errorMessage || e?.message || 'Could not connect to server. Make sure you are logged in.'
    phase.value = 'error'
  }
}

function startTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (timeLeft.value <= 0) { if (timer) clearInterval(timer); timeUp.value = true; submitEssay(); return }
    timeLeft.value--
  }, 1000)
}

async function submitEssay() {
  if (timer) clearInterval(timer)
  const taken = (prompt.value?.time_limit_seconds ?? 1800) - timeLeft.value
  const examType = examTypes.find(t => t.value === selectedType.value)
  phase.value = 'evaluating'
  try {
    evaluation.value = await api.submitWriting({
      prompt: prompt.value?.prompt ?? '',
      essay: essay.value,
      type: selectedType.value as any,
      level: examType?.cefrLevel as any,
      time_taken_seconds: taken,
    })
    completedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    phase.value = 'results'
  } catch (e: any) {
    submitError.value = e?.errorMessage || e?.message || 'Failed to evaluate essay. Please try again.'
    phase.value = 'submit-error'
  }
}

function fmtTime(s: number) {
  const m = Math.floor(s/60); return `${m}:${String(s%60).padStart(2,'0')}`
}
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
