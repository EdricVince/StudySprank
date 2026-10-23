<template>
  <div class="min-h-full">
    <!-- Hero -->
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-br from-indigo-600/25 via-violet-600/10 to-transparent" />
      <div class="absolute -top-28 -right-24 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
      <div class="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
      <!-- decorative watermark -->
      <div
        class="pointer-events-none absolute -bottom-6 right-6 hidden select-none text-[9rem] font-black leading-none tracking-tighter text-indigo-500/[0.07] lg:block"
        aria-hidden="true"
      >IELTS</div>

      <div class="relative mx-auto max-w-5xl px-6 py-12 lg:py-14">
        <div class="flex items-start justify-between gap-10">
          <div class="max-w-xl">
            <div class="hero-pill-indigo mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
              <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-current"></span>
              {{ $t('exam.badge') }}
            </div>
            <h1 class="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              <span class="bg-linear-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">{{ $t('exam.pageTitle') }}</span>
            </h1>
            <p class="text-muted-foreground mt-4 text-lg leading-relaxed">{{ $t('exam.pageSubtitle') }}</p>

            <!-- Hero actions -->
            <div class="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all duration-200"
                :class="aiReady
                  ? 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 active:translate-y-0'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'"
                :disabled="!aiReady"
                @click="startExam"
              >
                {{ aiReady === false ? $t('exam.aiKeyRequired') : $t('exam.startExam') }}
              </button>
              <button
                v-if="history.length"
                type="button"
                class="border-border text-foreground hover:bg-accent inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors"
                @click="scrollToHistory"
              >
                <History class="h-4 w-4" />
                {{ $t('exam.history.title') }}
              </button>
            </div>

            <!-- Key stats -->
            <div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div
                v-for="stat in heroStats"
                :key="stat.label"
                class="bg-card/60 border-border flex items-center gap-3 rounded-xl border px-3 py-2.5 backdrop-blur"
              >
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="stat.bg">
                  <component :is="stat.icon" class="h-4 w-4" :class="stat.color" />
                </div>
                <div class="min-w-0">
                  <div class="text-foreground truncate text-sm font-bold">{{ stat.value }}</div>
                  <div class="text-muted-foreground truncate text-xs">{{ stat.label }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Target Band Panel -->
          <div class="hidden w-64 shrink-0 lg:block">
            <div class="target-panel rounded-2xl p-5 shadow-xl shadow-indigo-500/10 backdrop-blur">
              <div class="mb-4 flex items-center justify-between">
                <span class="target-lbl text-xs font-semibold uppercase tracking-widest">{{ $t('exam.targetBand') }}</span>
                <span class="target-band-tag rounded-full px-2 py-0.5 text-xs font-bold">{{ bandLabel }}</span>
              </div>

              <div class="mb-4 text-center">
                <div class="target-score-num text-6xl font-black tabular-nums leading-none">{{ targetBand.toFixed(1) }}</div>
                <div class="target-sub-txt mt-1.5 text-xs">{{ $t('exam.outOf') }}</div>
              </div>

              <div class="target-track mb-4 h-2 w-full overflow-hidden rounded-full">
                <div
                  class="h-full rounded-full bg-linear-to-r from-indigo-500 to-fuchsia-500 transition-all duration-300"
                  :style="{ width: ((targetBand - 1) / 8 * 100) + '%' }"
                ></div>
              </div>

              <input
                type="range" min="1" max="9" step="0.5"
                :value="targetBand"
                class="target-slider w-full"
                :aria-label="$t('exam.targetBand')"
                @input="onSliderInput"
              />

              <div class="target-marks mt-2 flex justify-between font-mono text-[10px]">
                <span>1</span><span>3</span><span>5</span><span>7</span><span>9</span>
              </div>

              <div class="target-cefr-box mt-4 rounded-xl px-3 py-2 text-center">
                <div class="target-cefr-lbl mb-0.5 text-[10px] uppercase tracking-wide">{{ $t('exam.cefrLevel') }}</div>
                <div class="target-cefr-val text-sm font-bold">{{ cefrForBand }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-5xl space-y-6 px-6 pb-14">
      <!-- AI Not Configured Banner -->
      <div v-if="aiReady === false" class="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-lg">⚠</div>
        <div class="flex-1 space-y-1">
          <div class="text-sm font-semibold text-amber-400">{{ $t('exam.aiOffTitle') }}</div>
          <p class="text-xs leading-relaxed text-amber-300/80">{{ $t('exam.aiOffDesc') }}</p>
        </div>
      </div>

      <!-- IELTS paper card -->
      <div class="card-tint-indigo animate-fade-in-up relative overflow-hidden rounded-3xl border shadow-lg shadow-indigo-500/5">
        <div class="h-1.5 w-full bg-linear-to-r from-blue-500 via-emerald-500 to-violet-500" />
        <div class="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div class="relative p-6 lg:p-8">
          <!-- Title row -->
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500/25 to-violet-500/25 text-4xl shadow-inner">🎓</div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-foreground text-2xl font-extrabold">{{ $t('exam.ielts.name') }}</h2>
                  <span class="cbadge-indigo rounded-full px-2.5 py-0.5 text-xs font-bold">Cambridge</span>
                </div>
                <p class="text-muted-foreground mt-1 max-w-xl text-sm leading-relaxed">{{ $t('exam.ielts.desc') }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <div v-for="s in cardStats" :key="s.label" class="cstat-indigo min-w-20 rounded-xl px-3 py-2 text-center">
                <div class="ct-indigo text-xl font-extrabold leading-tight">{{ s.value }}</div>
                <div class="text-muted-foreground text-[11px]">{{ s.label }}</div>
              </div>
            </div>
          </div>

          <!-- Proportional bar of the 20 questions -->
          <div class="mt-7">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">{{ $t('exam.format') }}</h3>
              <span class="text-muted-foreground text-xs">{{ $t('exam.minutesN', { n: 30 }) }} · {{ $t('exam.ranges.ielts') }}</span>
            </div>
            <div class="flex h-2.5 w-full gap-1 overflow-hidden rounded-full">
              <div
                v-for="p in parts"
                :key="p.key"
                class="h-full rounded-full transition-all"
                :class="p.bar"
                :style="{ width: p.share + '%' }"
                :title="p.title"
              />
            </div>
          </div>

          <!-- Parts -->
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div
              v-for="(p, i) in parts"
              :key="p.key"
              class="flex gap-3.5 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              :class="p.cls"
            >
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/50 text-xl dark:bg-white/10">{{ p.icon }}</div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-bold"><span class="mr-1.5 opacity-60">{{ i + 1 }}.</span>{{ p.title }}</span>
                  <span class="shrink-0 rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10">{{ p.count }}</span>
                </div>
                <p class="mt-1.5 text-xs leading-relaxed opacity-80">{{ p.desc }}</p>
              </div>
            </div>
          </div>

          <!-- Start -->
          <button
            type="button"
            class="mt-7 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all duration-200"
            :class="aiReady
              ? 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:scale-[1.01] hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99]'
              : 'bg-muted text-muted-foreground cursor-not-allowed'"
            :disabled="!aiReady"
            @click="startExam"
          >
            {{ aiReady === false ? $t('exam.aiKeyRequired') : $t('exam.startExam') }}
          </button>
        </div>
      </div>

      <!-- Your recent tests (stored in the database) -->
      <div ref="historyEl" class="bg-card border-border animate-fade-in-up scroll-mt-6 rounded-3xl border p-6 shadow-sm">
        <div class="mb-5 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
            <History class="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 class="text-foreground text-base font-bold">{{ $t('exam.history.title') }}</h3>
            <p class="text-muted-foreground text-xs">{{ $t('exam.history.subtitle') }}</p>
          </div>
        </div>

        <div v-if="historyLoading" class="space-y-3">
          <div v-for="i in 2" :key="i" class="bg-muted/40 h-20 animate-pulse rounded-2xl" />
        </div>
        <p v-else-if="historyError" class="text-sm text-red-400">{{ $t('exam.history.loadFailed') }}</p>
        <div v-else-if="!history.length" class="flex flex-col items-center gap-2 py-8 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl">📝</div>
          <p class="text-muted-foreground max-w-sm text-sm">{{ $t('exam.history.empty') }}</p>
        </div>
        <ul v-else class="space-y-3">
          <li
            v-for="h in history"
            :key="h.attempt_id"
            class="border-border flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border p-4 transition-colors hover:border-indigo-500/40"
          >
            <!-- Band badge -->
            <div
              class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-center"
              :class="tone(h.score_percent).badge"
            >
              <span class="text-base font-black leading-none">{{ shortBand(h.estimated_band) }}</span>
              <span class="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-70">band</span>
            </div>

            <div class="min-w-0 flex-1">
              <div class="text-foreground truncate text-sm font-semibold">{{ themeName(h.theme) }}</div>
              <div class="text-muted-foreground mt-0.5 text-xs">
                {{ formatDate(h.submitted_at) }} · {{ h.correct ?? 0 }}/{{ h.total ?? 0 }}
              </div>
              <div class="bg-muted mt-2 flex h-1.5 w-full max-w-xs items-center overflow-hidden rounded-full">
                <div class="h-full rounded-full transition-all" :class="tone(h.score_percent).bar" :style="{ width: (h.score_percent ?? 0) + '%' }" />
              </div>
            </div>

            <div class="text-right">
              <div class="text-lg font-extrabold" :class="tone(h.score_percent).text">{{ h.score_percent ?? 0 }}%</div>
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
      <div class="bg-card border-border rounded-3xl border p-6 shadow-sm">
        <h3 class="text-foreground mb-6 text-base font-bold">{{ $t('exam.howItWorks') }}</h3>
        <ol class="relative grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
          <!-- connector line (desktop) -->
          <div class="bg-border absolute top-[18px] right-[16.6%] left-[16.6%] hidden h-px sm:block" aria-hidden="true" />
          <li v-for="step in steps" :key="step.num" class="relative flex gap-4 sm:flex-col sm:items-center sm:text-center">
            <div
              class="ring-card relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ring-4"
              :class="step.bgClass"
            >{{ step.num }}</div>
            <div>
              <div class="text-foreground text-sm font-semibold">{{ step.title }}</div>
              <div class="text-muted-foreground mt-1 text-xs leading-relaxed">{{ step.desc }}</div>
            </div>
          </li>
        </ol>
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
  { key: 'listening1', title: 'Listening Part 1', icon: '🎧', count: t('exam.questionsN', 4), desc: t('exam.sections.listening1'), cls: 'sec-blue', bar: 'bg-blue-500', share: 20 },
  { key: 'listening2', title: 'Listening Part 2', icon: '🎧', count: t('exam.questionsN', 3), desc: t('exam.sections.listening2'), cls: 'sec-cyan', bar: 'bg-cyan-500', share: 15 },
  { key: 'reading', title: 'Reading', icon: '📖', count: t('exam.questionsN', 11), desc: t('exam.sections.reading'), cls: 'sec-green', bar: 'bg-emerald-500', share: 55 },
  { key: 'writing', title: 'Writing', icon: '✍️', count: t('exam.writingTasks'), desc: t('exam.sections.writing'), cls: 'sec-violet', bar: 'bg-violet-500', share: 10 },
])

const steps = computed(() => [
  { num: '1', title: t('exam.steps.chooseTitle'),   desc: t('exam.steps.chooseDesc'),   bgClass: 'cstep-indigo' },
  { num: '2', title: t('exam.steps.completeTitle'), desc: t('exam.steps.completeDesc'), bgClass: 'cstep-violet' },
  { num: '3', title: t('exam.steps.resultTitle'),   desc: t('exam.steps.resultDesc'),   bgClass: 'cstep-emerald' },
])

const notes = computed(() => [t('exam.note1'), t('exam.note2'), t('exam.note3')])

/** "Healthcare & Medical Science — hospitals, …" → "Healthcare & Medical Science" */
const themeName = (theme: string) => theme.split(' — ')[0] || theme

const historyEl = ref<HTMLElement | null>(null)
const scrollToHistory = () => historyEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/** Colour set for a score: green ≥ 70%, amber ≥ 50%, red below. */
function tone(pct: number | null) {
  const p = pct ?? 0
  if (p >= 70) return { badge: 'bg-emerald-500/15 text-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-500' }
  if (p >= 50) return { badge: 'bg-amber-500/15 text-amber-500', bar: 'bg-amber-500', text: 'text-amber-500' }
  return { badge: 'bg-red-500/15 text-red-400', bar: 'bg-red-500', text: 'text-red-400' }
}

/** "6.0–6.5" → "6.0+" so the band fits inside the small badge. */
const shortBand = (band: string | null) => (band ? band.split('–')[0] + (band.includes('–') ? '+' : '') : '—')

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
