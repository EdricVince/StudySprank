<template>
  <div class="min-h-full">
    <!-- Exam selection screen -->
    <div v-if="phase==='select'" class="mx-auto max-w-3xl px-6 py-10">
      <div class="mb-8 text-center">
        <div class="mb-3 text-5xl">✍️</div>
        <h1 class="text-foreground text-3xl font-extrabold">{{ $t('skills.writing.title') }}</h1>
        <p class="text-muted-foreground mt-2">{{ $t('skills.writing.subtitle') }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <button
v-for="type in examTypes" :key="type.value" class="group rounded-2xl border p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl"
          :class="type.cardClass"
          @click="startExam(type.value)">
          <div class="mb-3 text-3xl">{{ type.emoji }}</div>
          <h3 class="text-foreground text-lg font-bold">{{ $t(`skills.writing.types.${type.value}.name`) }}</h3>
          <p class="text-muted-foreground mt-1 text-sm">{{ $t(`skills.writing.types.${type.value}.desc`) }}</p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="chip">⏱ {{ $t('skills.writing.minutes', { n: type.time }) }}</span>
            <span class="chip">📝 {{ $t(`skills.writing.types.${type.value}.words`) }}</span>
            <span class="rounded-full px-2.5 py-1" :class="type.levelBg">{{ type.level }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="phase==='loading'" class="empty-state">
      <svg class="sk-spinner-indigo" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      <p class="text-muted-foreground mt-4">{{ $t('skills.writing.generating') }}</p>
    </div>

    <!-- Error loading prompt -->
    <div v-else-if="phase==='error'" class="empty-state">
      <div class="mb-4 text-5xl">⚠️</div>
      <h3 class="text-foreground text-xl font-bold">{{ $t('skills.writing.loadFailed') }}</h3>
      <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ fetchError }}</p>
      <button class="btn-indigo mt-4 px-5 py-2 text-sm" @click="backToTopics">{{ $t('skills.common.back') }}</button>
    </div>

    <!-- Error submitting essay -->
    <div v-else-if="phase==='submit-error'" class="empty-state">
      <div class="mb-4 text-5xl">⚠️</div>
      <h3 class="text-foreground text-xl font-bold">{{ $t('skills.writing.evalFailed') }}</h3>
      <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ submitError }}</p>
      <div class="mt-4 flex gap-3">
        <button class="btn-indigo px-5 py-2 text-sm" @click="resumeWriting">{{ $t('skills.writing.backToEssay') }}</button>
        <button class="rounded-xl border border-border px-5 py-2 text-sm text-muted-foreground hover:text-foreground" @click="backToTopics">{{ $t('skills.writing.newTopic') }}</button>
      </div>
    </div>

    <!-- Writing phase -->
    <div v-else-if="phase==='writing'" class="flex min-h-full flex-col">
      <!-- Sticky exam bar -->
      <div class="page-header">
        <div class="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <button class="back-btn" @click="backToTopics">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              {{ $t('skills.writing.topics') }}
            </button>
            <span class="text-foreground text-sm font-semibold">{{ typeName }}</span>
            <span class="chip">{{ prompt?.word_target }}</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="font-mono text-sm font-bold text-foreground">{{ $t('skills.common.words', { n: wordCount }) }}</span>
            <div class="rounded-xl px-4 py-1.5 font-mono text-lg font-extrabold" :class="timerClass">{{ fmtTime(timeLeft) }}</div>
            <button class="btn-indigo px-4 py-2 text-sm disabled:opacity-40" :disabled="wordCount === 0" :title="wordCount === 0 ? $t('skills.writing.emptyEssay') : undefined" @click="submitEssay">{{ $t('skills.common.submit') }}</button>
          </div>
        </div>
      </div>
      <div class="mx-auto flex w-full max-w-4xl flex-1 gap-5 p-6">
        <!-- Prompt panel and Chart -->
        <div class="flex flex-col gap-4 w-80 shrink-0">
          <!-- SVG Chart for IELTS Task 1 -->
          <div v-if="prompt?.chart_svg && selectedType === 'ielts_task1'" class="sk-card-p overflow-hidden">
            <div class="section-label mb-2">📊 {{ $t('skills.writing.chart') }}</div>
            <div class="w-full rounded-lg overflow-hidden" v-html="prompt.chart_svg" />
            <p class="text-muted-foreground mt-2 text-[11px] leading-snug">{{ prompt.context }}</p>
          </div>

          <!-- Prompt panel -->
          <div class="sk-card-p sticky top-24">
            <div class="section-label mb-1">{{ $t('skills.writing.task', { name: typeName }) }}</div>
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
                <div class="text-muted-foreground">{{ $t('skills.writing.timeLimit') }}</div>
              </div>
              <div class="rounded-lg bg-muted/20 p-2">
                <div class="text-foreground font-bold">{{ wordCount }}</div>
                <div class="text-muted-foreground">{{ $t('skills.writing.wordsLabel') }}</div>
              </div>
            </div>
          </div>
        </div>
        <!-- Writing area -->
        <div class="flex-1">
          <textarea
v-model="essay" :placeholder="$t('skills.writing.placeholder')"
            class="sk-textarea w-full"
            style="min-height: calc(100vh - 180px)" :disabled="timeUp"></textarea>
          <div v-if="timeUp" class="mt-3 info-box-sm info-box-red text-center text-sm text-red-400">
            ⏰ {{ $t('skills.writing.timeUp') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Evaluating -->
    <div v-else-if="phase==='evaluating'" class="empty-state">
      <svg class="sk-spinner-indigo" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      <p class="text-muted-foreground mt-4">{{ $t('skills.writing.evaluating') }}</p>
      <p class="text-muted-foreground mt-1 text-sm">{{ $t('skills.writing.evaluatingHint') }}</p>
    </div>

    <!-- Results -->
    <div v-else-if="phase==='results' && evaluation" class="mx-auto max-w-3xl space-y-5 px-6 py-8">
      <!-- Band score -->
      <div class="sk-card-p6 text-center">
        <AiGeneratedBadge class="mb-3" />
        <div class="text-muted-foreground mb-2 text-sm">{{ $t('skills.writing.overallBand') }}</div>
        <div class="text-6xl font-extrabold text-indigo-400">{{ evaluation.overall_band }}</div>
        <p class="text-muted-foreground mt-2 text-sm">{{ evaluation.summary }}</p>
        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="(val, key) in evaluation.scores" :key="key" class="rounded-xl border border-border bg-muted/10 p-3">
            <div class="text-foreground text-xl font-extrabold">{{ val }}</div>
            <div class="text-muted-foreground mt-0.5 text-xs">{{ criterionLabel(String(key)) }}</div>
          </div>
        </div>
        <div class="mt-3 text-xs text-muted-foreground">{{ $t('skills.writing.meta', { words: evaluation.word_count, time: fmtTime(evaluation.time_taken_seconds), at: completedAt }) }}</div>
      </div>

      <!-- Strengths + Improvements -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="result-strength">
          <h3 class="text-emerald-400 mb-3 text-sm font-bold">✓ {{ $t('skills.common.strengths') }}</h3>
          <ul class="space-y-1.5">
            <li v-for="s in evaluation.strengths" :key="s" class="flex items-start gap-2 text-sm text-muted-foreground">
              <span class="text-emerald-400 shrink-0">•</span>{{ s }}
            </li>
          </ul>
        </div>
        <div class="result-improve-am">
          <h3 class="text-amber-400 mb-3 text-sm font-bold">↑ {{ $t('skills.common.improvements') }}</h3>
          <ul class="space-y-1.5">
            <li v-for="imp in evaluation.improvements" :key="imp" class="flex items-start gap-2 text-sm text-muted-foreground">
              <span class="text-amber-400 shrink-0">•</span>{{ imp }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Grammar errors -->
      <div v-if="evaluation.grammar_errors?.length" class="sk-card-p">
        <h3 class="text-foreground mb-3 text-sm font-bold">{{ $t('skills.writing.grammar') }}</h3>
        <div class="space-y-2.5">
          <div v-for="err in evaluation.grammar_errors" :key="err.original" class="result-error">
            <div><span class="text-red-400 line-through">{{ err.original }}</span><span class="text-muted-foreground mx-2">→</span><span class="text-emerald-400 font-semibold">{{ err.corrected }}</span></div>
            <p class="text-muted-foreground mt-1 text-xs">{{ err.explanation }}</p>
          </div>
        </div>
      </div>

      <!-- Vocabulary -->
      <div v-if="evaluation.vocabulary_feedback?.suggestions?.length" class="sk-card-p">
        <h3 class="text-foreground mb-3 text-sm font-bold">{{ $t('skills.writing.vocab') }}</h3>
        <div class="space-y-2">
          <div v-for="s in evaluation.vocabulary_feedback.suggestions" :key="s.replace" class="text-sm">
            <span class="text-muted-foreground">{{ $t('skills.writing.replace', { from: s.replace, to: s.with }) }}</span>
          </div>
        </div>
      </div>

      <button class="btn-indigo w-full py-3" @click="backToTopics">
        {{ $t('skills.writing.tryAnother') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/utils/api'
import { fmtTime, clockTime, errorText } from '@/utils/skills'
import AiGeneratedBadge from '@/components/common/AiGeneratedBadge.vue'

type WritingType = 'ielts_task2' | 'ielts_task1' | 'general'
type CEFRLevel = 'A2' | 'B1' | 'B2'
type Phase = 'select'|'loading'|'writing'|'evaluating'|'results'|'error'|'submit-error'

// Names, descriptions and word targets live in the locale files (skills.writing.types.*).
const examTypes: { value: WritingType; emoji: string; time: number; level: string; cefrLevel: CEFRLevel; levelBg: string; cardClass: string }[] = [
  { value:'ielts_task2', emoji:'🎓', time:40, level:'B2–C2', cefrLevel:'B2', levelBg:'cbadge-indigo', cardClass:'card-tint-indigo' },
  { value:'ielts_task1', emoji:'📊', time:20, level:'B1–C1', cefrLevel:'B1', levelBg:'cbadge-blue', cardClass:'card-tint-blue' },
  { value:'general',     emoji:'📝', time:25, level:'A2–B2', cefrLevel:'B1', levelBg:'cbadge-rose', cardClass:'card-tint-rose' },
]

const { t, te } = useI18n()
const phase      = ref<Phase>('select')
const prompt     = ref<any>(null)
const essay      = ref('')
const evaluation = ref<any>(null)
const timeLeft   = ref(0)
const timeUp     = ref(false)
const selectedType = ref<WritingType>('ielts_task2')
const completedAt  = ref('')
const fetchError   = ref('')
const submitError  = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const currentType = computed(() => examTypes.find(x => x.value === selectedType.value))
const typeName    = computed(() => t(`skills.writing.types.${selectedType.value}.name`))
const wordCount   = computed(() => essay.value.trim() ? essay.value.trim().split(/\s+/).length : 0)
const timerClass  = computed(() => {
  if (timeLeft.value > 300) return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
  if (timeLeft.value > 60)  return 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
  return 'bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse'
})

function criterionLabel(key: string) {
  const k = `skills.writing.criteria.${key}`
  return te(k) ? t(k) : key.replace(/_/g, ' ')
}

async function startExam(type: WritingType) {
  selectedType.value = type
  phase.value = 'loading'
  essay.value = ''
  timeUp.value = false
  evaluation.value = null
  try {
    prompt.value = await api.getWritingPrompt({ type, level: currentType.value?.cefrLevel })
    timeLeft.value = prompt.value?.time_limit_seconds ?? 1800
    phase.value = 'writing'
    startTimer()
  } catch (e) {
    fetchError.value = errorText(e, t('skills.common.connectError'))
    phase.value = 'error'
  }
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    if (timeLeft.value <= 0) { stopTimer(); timeUp.value = true; submitEssay(); return }
    timeLeft.value--
  }, 1000)
}

// Leaving the exam must stop the clock, otherwise it would auto-submit later from the topic list.
function backToTopics() {
  stopTimer()
  phase.value = 'select'
}

// After a failed evaluation the essay is still there; continue the remaining time (if any).
function resumeWriting() {
  phase.value = 'writing'
  if (!timeUp.value && timeLeft.value > 0) startTimer()
}

async function submitEssay() {
  stopTimer()
  const taken = (prompt.value?.time_limit_seconds ?? 1800) - timeLeft.value
  phase.value = 'evaluating'
  try {
    evaluation.value = await api.submitWriting({
      prompt: prompt.value?.prompt ?? '',
      essay: essay.value,
      type: selectedType.value,
      level: currentType.value?.cefrLevel,
      time_taken_seconds: taken,
    })
    completedAt.value = clockTime()
    phase.value = 'results'
  } catch (e) {
    submitError.value = errorText(e, t('skills.writing.evalFailedDefault'))
    phase.value = 'submit-error'
  }
}

onUnmounted(stopTimer)
</script>
