<template>
  <div class="min-h-full">
    <!-- Hero Banner -->
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-br from-indigo-600/20 via-violet-600/10 to-transparent" />
      <div class="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div class="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="relative mx-auto max-w-5xl px-6 py-12">
        <div class="flex items-start justify-between gap-8">
          <div class="max-w-lg">
            <div class="hero-pill-indigo mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
              <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-current"></span>
              {{ $t('exam.badge') }}
            </div>
            <h1 class="text-foreground text-4xl font-extrabold leading-tight tracking-tight">
              {{ $t('exam.pageTitle') }}
            </h1>
            <p class="text-muted-foreground mt-3 text-lg leading-relaxed">{{ $t('exam.pageSubtitle') }}</p>

            <!-- Key stats row -->
            <div class="mt-6 flex flex-wrap gap-6">
              <div v-for="stat in heroStats" :key="stat.label" class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg" :class="stat.bg">
                  <component :is="stat.icon" class="h-4 w-4" :class="stat.color" />
                </div>
                <div>
                  <div class="text-foreground text-sm font-bold">{{ stat.value }}</div>
                  <div class="text-muted-foreground text-xs">{{ stat.label }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Target Band Panel -->
          <div class="hidden lg:block w-64 shrink-0">
            <div class="target-panel rounded-2xl p-5">
              <div class="mb-4 flex items-center justify-between">
                <span class="target-lbl text-xs font-semibold uppercase tracking-widest">{{ $t('exam.targetBand') }}</span>
                <span class="target-band-tag rounded-full px-2 py-0.5 text-xs font-bold">{{ bandLabel }}</span>
              </div>

              <!-- Score display -->
              <div class="mb-4 text-center">
                <div class="target-score-num text-5xl font-extrabold tabular-nums leading-none">{{ targetBand }}</div>
                <div class="target-sub-txt mt-1 text-xs">{{ $t('exam.outOf') }}</div>
              </div>

              <!-- Progress bar -->
              <div class="target-track mb-4 h-2 w-full overflow-hidden rounded-full">
                <div
class="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                  :style="{ width: ((targetBand - 1) / 8 * 100) + '%' }"></div>
              </div>

              <!-- Slider -->
              <input
                type="range" min="1" max="9" step="0.5"
                :value="targetBand"
                class="target-slider w-full"
                @input="onSliderInput"
              />

              <!-- Band marks -->
              <div class="target-marks mt-2 flex justify-between text-[10px] font-mono">
                <span>1</span><span>3</span><span>5</span><span>7</span><span>9</span>
              </div>

              <!-- CEFR mapping -->
              <div class="target-cefr-box mt-4 rounded-xl px-3 py-2 text-center">
                <div class="target-cefr-lbl text-[10px] uppercase tracking-wide mb-0.5">{{ $t('exam.cefrLevel') }}</div>
                <div class="target-cefr-val text-sm font-bold">{{ cefrForBand }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-5xl space-y-6 px-6 pb-12">
      <!-- AI Not Configured Banner -->
      <div v-if="aiReady === false" class="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-lg">⚠</div>
        <div class="flex-1 space-y-1">
          <div class="text-sm font-semibold text-amber-400">{{ $t('exam.aiOffTitle') }}</div>
          <p class="text-xs leading-relaxed text-amber-300/80">{{ $t('exam.aiOffDesc') }}</p>
        </div>
      </div>

      <!-- IELTS test card -->
      <div class="card-tint-indigo relative overflow-hidden rounded-2xl border">
        <div class="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div class="relative grid gap-6 p-6 lg:grid-cols-5 lg:p-8">
          <!-- Left: what the test is -->
          <div class="flex flex-col lg:col-span-2">
            <div class="mb-4 flex items-start justify-between">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-3xl">🎓</div>
              <span class="cbadge-indigo rounded-full px-3 py-1 text-xs font-bold">Cambridge</span>
            </div>
            <h2 class="text-foreground text-2xl font-extrabold">{{ $t('exam.ielts.name') }}</h2>
            <p class="text-muted-foreground mt-2 text-sm leading-relaxed">{{ $t('exam.ielts.desc') }}</p>

            <div class="mt-5 grid grid-cols-3 gap-2">
              <div v-for="s in cardStats" :key="s.label" class="cstat-indigo rounded-xl p-2.5 text-center">
                <div class="ct-indigo text-lg font-extrabold">{{ s.value }}</div>
                <div class="text-muted-foreground text-[11px]">{{ s.label }}</div>
              </div>
            </div>

            <div class="crange-indigo mt-4 flex items-center justify-between rounded-xl border p-3">
              <div>
                <div class="text-muted-foreground text-[11px]">{{ $t('exam.scoreRange') }}</div>
                <div class="text-foreground text-sm font-bold">{{ $t('exam.ranges.ielts') }}</div>
              </div>
              <div class="text-right">
                <div class="text-muted-foreground text-[11px]">{{ $t('exam.duration') }}</div>
                <div class="text-foreground text-sm font-bold">{{ $t('exam.minutesN', { n: 30 }) }}</div>
              </div>
            </div>

            <div class="flex-1" />
            <button
              type="button"
              class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold transition-all duration-200"
              :class="aiReady
                ? 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'"
              :disabled="!aiReady"
              @click="startExam"
            >
              {{ aiReady === false ? $t('exam.aiKeyRequired') : $t('exam.startExam') }}
            </button>
          </div>

          <!-- Right: test format -->
          <div class="lg:col-span-3">
            <h3 class="text-muted-foreground mb-3 text-xs font-bold uppercase tracking-wider">{{ $t('exam.format') }}</h3>
            <div class="grid gap-3 sm:grid-cols-2">
              <div v-for="p in parts" :key="p.key" class="rounded-xl border p-4" :class="p.cls">
                <div class="flex items-center justify-between gap-2">
                  <span class="flex items-center gap-2 text-sm font-bold"><span class="text-lg">{{ p.icon }}</span>{{ p.title }}</span>
                  <span class="text-xs font-semibold opacity-80">{{ p.count }}</span>
                </div>
                <p class="mt-2 text-xs leading-relaxed opacity-80">{{ p.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Your recent tests (stored in the database) -->
      <div class="bg-card border-border rounded-2xl border p-6">
        <div class="mb-4 flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
            <History class="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h3 class="text-foreground text-base font-bold">{{ $t('exam.history.title') }}</h3>
            <p class="text-muted-foreground text-xs">{{ $t('exam.history.subtitle') }}</p>
          </div>
        </div>

        <div v-if="historyLoading" class="space-y-2">
          <div v-for="i in 2" :key="i" class="bg-muted/40 h-14 animate-pulse rounded-xl" />
        </div>
        <p v-else-if="historyError" class="text-sm text-red-400">{{ $t('exam.history.loadFailed') }}</p>
        <p v-else-if="!history.length" class="text-muted-foreground py-6 text-center text-sm">{{ $t('exam.history.empty') }}</p>
        <ul v-else class="divide-border divide-y">
          <li v-for="h in history" :key="h.attempt_id" class="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <div class="min-w-0 flex-1">
              <div class="text-foreground truncate text-sm font-semibold">{{ themeName(h.theme) }}</div>
              <div class="text-muted-foreground text-xs">{{ formatDate(h.submitted_at) }}</div>
            </div>
            <div class="text-right">
              <div class="ct-indigo text-sm font-extrabold">{{ h.estimated_band ?? '—' }}</div>
              <div class="text-muted-foreground text-xs">
                {{ h.score_percent ?? 0 }}% · {{ h.correct ?? 0 }}/{{ h.total ?? 0 }}
              </div>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                class="border-border text-foreground hover:bg-accent rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                @click="viewResult(h.attempt_id)"
              >{{ $t('exam.history.view') }}</button>
              <button
                type="button"
                class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                @click="retakePaper(h.paper_id)"
              >{{ $t('exam.history.retake') }}</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- How it works -->
      <div class="bg-card border-border rounded-2xl border p-6">
        <h3 class="text-foreground mb-5 text-base font-bold">{{ $t('exam.howItWorks') }}</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div v-for="step in steps" :key="step.num" class="flex items-start gap-4">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold" :class="step.bgClass">
              {{ step.num }}
            </div>
            <div>
              <div class="text-foreground text-sm font-semibold">{{ step.title }}</div>
              <div class="text-muted-foreground mt-0.5 text-xs leading-relaxed">{{ step.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Note -->
      <div class="note-box-indigo flex gap-4 rounded-2xl p-5">
        <div class="note-box-indigo-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm">ℹ</div>
        <div class="space-y-1.5">
          <div class="note-box-indigo-title text-sm font-semibold">{{ $t('exam.noteTitle') }}</div>
          <ul class="space-y-1">
            <li v-for="note in notes" :key="note" class="note-box-indigo-text text-sm leading-relaxed">· {{ note }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CheckCircle, Clock, FileText, BarChart3, Shuffle, History } from '@/components/icons'
import { api, apiRequest } from '@/utils/api'
import type { ExamHistoryItem } from '@/types/content'

const router = useRouter()
const { t, locale } = useI18n({ useScope: 'global' })

const aiReady = ref<boolean | null>(null)
const history = ref<ExamHistoryItem[]>([])
const historyLoading = ref(true)
const historyError = ref(false)

onMounted(async () => {
  try {
    const status = await apiRequest<{ ai_enabled: boolean }>('/entrance-exam/ai-status', { requiresAuth: false })
    aiReady.value = status.ai_enabled
  } catch {
    aiReady.value = false
  }
  // Past sittings are stored in the database, so they show even while the AI is off.
  try {
    history.value = await api.getExamHistory()
  } catch {
    historyError.value = true
  } finally {
    historyLoading.value = false
  }
})

const TARGET_KEY = 'studyspark_target_band'
const targetBand = ref(parseFloat(localStorage.getItem(TARGET_KEY) ?? '7.0'))

function onSliderInput(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  targetBand.value = v
  localStorage.setItem(TARGET_KEY, v.toString())
}

// [minimum band, label key] — first match wins.
const BAND_LABELS: [number, string][] = [[8.5, 'expert'], [7.5, 'veryGood'], [6.5, 'good'], [5.5, 'competent'], [4.5, 'modest'], [3.5, 'limited'], [0, 'beginner']]
const BAND_CEFR: [number, string][] = [[8, 'C2'], [7, 'C1'], [6, 'B2'], [5, 'B1'], [4, 'A2'], [0, 'A1']]
const pick = (table: [number, string][], b: number) => table.find(([min]) => b >= min)![1]

const bandLabel = computed(() => t(`exam.bands.${pick(BAND_LABELS, targetBand.value)}`))
const cefrForBand = computed(() => t(`exam.cefr.${pick(BAND_CEFR, targetBand.value)}`))

const heroStats = computed(() => [
  { label: t('exam.stats.questions'),  value: '20',                            icon: FileText,    bg: 'bg-indigo-500/10', color: 'text-indigo-400' },
  { label: t('exam.stats.aiGrading'),  value: t('exam.stats.instant'),         icon: CheckCircle, bg: 'bg-green-500/10',  color: 'text-green-400' },
  { label: t('exam.stats.examSets'),   value: t('exam.stats.unique', { n: 18 }), icon: Shuffle,   bg: 'bg-violet-500/10', color: 'text-violet-400' },
  { label: t('exam.stats.standards'),  value: 'Cambridge',                     icon: BarChart3,   bg: 'bg-amber-500/10',  color: 'text-amber-400' },
  { label: t('exam.stats.timeLimit'),  value: t('exam.minutesN', { n: 30 }),   icon: Clock,       bg: 'bg-blue-500/10',   color: 'text-blue-400' },
])

const cardStats = computed(() => [
  { value: '20', label: t('exam.stats.questions') },
  { value: '30', label: t('exam.stats.minutes') },
  { value: '9.0', label: t('exam.stats.maxBand') },
])

// The four parts of the paper (2 Listening parts, Reading, Writing).
const parts = computed(() => [
  { key: 'listening1', title: 'Listening Part 1', icon: '🎧', count: t('exam.questionsN', 4), desc: t('exam.sections.listening1'), cls: 'sec-blue' },
  { key: 'listening2', title: 'Listening Part 2', icon: '🎧', count: t('exam.questionsN', 3), desc: t('exam.sections.listening2'), cls: 'sec-cyan' },
  { key: 'reading', title: 'Reading', icon: '📖', count: t('exam.questionsN', 11), desc: t('exam.sections.reading'), cls: 'sec-green' },
  { key: 'writing', title: 'Writing', icon: '✍️', count: t('exam.writingTasks'), desc: t('exam.sections.writing'), cls: 'sec-violet' },
])

const steps = computed(() => [
  { num: '1', title: t('exam.steps.chooseTitle'),   desc: t('exam.steps.chooseDesc'),   bgClass: 'cstep-indigo' },
  { num: '2', title: t('exam.steps.completeTitle'), desc: t('exam.steps.completeDesc'), bgClass: 'cstep-violet' },
  { num: '3', title: t('exam.steps.resultTitle'),   desc: t('exam.steps.resultDesc'),   bgClass: 'cstep-emerald' },
])

const notes = computed(() => [t('exam.note1'), t('exam.note2'), t('exam.note3')])

/** "Healthcare & Medical Science — hospitals, …" → "Healthcare & Medical Science" */
const themeName = (theme: string) => theme.split(' — ')[0] || theme

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'short', day: 'numeric' }) : ''

function startExam() {
  router.push({ name: 'ExamSession', query: { target: targetBand.value.toString() } })
}

function viewResult(attemptId: number) {
  router.push({ name: 'ExamSession', query: { attempt: String(attemptId) } })
}

function retakePaper(paperId: number) {
  router.push({ name: 'ExamSession', query: { paper: String(paperId), target: targetBand.value.toString() } })
}
</script>
