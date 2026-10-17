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

      <!-- Exam Cards -->
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="exam in exams"
          :key="exam.type"
          class="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300"
          :class="[exam.cardClass, aiReady ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl' : 'opacity-60 cursor-not-allowed']"
          @click="aiReady && startExam(exam.type)"
        >
          <!-- Gradient overlay -->
          <div class="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" :class="exam.hoverGradient" />

          <!-- Card content -->
          <div class="relative flex flex-1 flex-col p-6">
            <!-- Header row -->
            <div class="mb-4 flex items-start justify-between">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" :class="exam.iconBg">
                {{ exam.icon }}
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="rounded-full px-3 py-1 text-xs font-bold" :class="exam.badgeClass">{{ exam.standard }}</span>
                <span class="text-muted-foreground text-xs">{{ $t('exam.format') }}</span>
              </div>
            </div>

            <!-- Title & desc -->
            <h2 class="text-foreground text-xl font-extrabold">{{ exam.name }}</h2>
            <p class="text-muted-foreground mt-1 text-xs leading-relaxed">{{ exam.desc }}</p>

            <!-- Stats row -->
            <div class="mt-4 grid grid-cols-3 gap-2">
              <div v-for="s in exam.stats" :key="s.label" class="rounded-xl p-2.5 text-center" :class="exam.statBg">
                <div class="text-base font-extrabold" :class="exam.accentColor">{{ s.value }}</div>
                <div class="text-muted-foreground text-[11px]">{{ s.label }}</div>
              </div>
            </div>

            <!-- Sections — 2-col grid, max 4 visible + overflow badge -->
            <div class="mt-3 grid grid-cols-2 gap-1.5">
              <span
                v-for="sk in exam.sections.slice(0, 4)"
                :key="sk"
                class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium truncate"
                :class="exam.sectionClass"
              >
                <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="exam.dotColor"></span>
                <span class="truncate">{{ sk }}</span>
              </span>
              <span
                v-if="exam.sections.length > 4"
                class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                :class="exam.sectionClass"
              >
                <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="exam.dotColor"></span>
                {{ $t('exam.more', { n: exam.sections.length - 4 }) }}
              </span>
            </div>

            <!-- Spacer pushes footer to bottom -->
            <div class="flex-1" />

            <!-- Band range -->
            <div class="mt-4 flex items-center justify-between rounded-xl border p-3" :class="exam.rangeBg">
              <div>
                <div class="text-muted-foreground text-[11px]">{{ $t('exam.scoreRange') }}</div>
                <div class="text-foreground text-sm font-bold">{{ exam.scoreRange }}</div>
              </div>
              <div class="text-right">
                <div class="text-muted-foreground text-[11px]">{{ $t('exam.duration') }}</div>
                <div class="text-foreground text-sm font-bold">{{ $t('exam.minutesN', { n: exam.time }) }}</div>
              </div>
            </div>

            <!-- Start button -->
            <button
              class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold transition-all duration-200"
              :class="aiReady ? [exam.btnClass, 'hover:scale-[1.02] active:scale-[0.98]'] : 'bg-muted text-muted-foreground cursor-not-allowed'"
              :disabled="!aiReady"
              @click.stop="aiReady && startExam(exam.type)"
            >
              {{ aiReady === false ? $t('exam.aiKeyRequired') : $t('exam.startExam') }}
            </button>
          </div>
        </div>
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
import { CheckCircle, Clock, FileText, BarChart3, Shuffle } from '@/components/icons'
import { apiRequest } from '@/utils/api'

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const aiReady = ref<boolean | null>(null)

onMounted(async () => {
  try {
    const status = await apiRequest<{ ai_enabled: boolean }>('/entrance-exam/ai-status', { requiresAuth: false })
    aiReady.value = status.ai_enabled
  } catch {
    aiReady.value = false
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
  { label: t('exam.stats.questions'),  value: '20',                           icon: FileText,    bg: 'bg-indigo-500/10', color: 'text-indigo-400' },
  { label: t('exam.stats.aiGrading'),  value: t('exam.stats.instant'),        icon: CheckCircle, bg: 'bg-green-500/10',  color: 'text-green-400' },
  { label: t('exam.stats.examSets'),   value: t('exam.stats.unique', { n: 6 }), icon: Shuffle,   bg: 'bg-violet-500/10', color: 'text-violet-400' },
  { label: t('exam.stats.standards'),  value: 'Cambridge+ETS',                icon: BarChart3,   bg: 'bg-amber-500/10',  color: 'text-amber-400' },
  { label: t('exam.stats.timeLimit'),  value: t('exam.minutesN', { n: '25–35' }), icon: Clock,   bg: 'bg-blue-500/10',   color: 'text-blue-400' },
])

const exams = computed(() => [
  {
    type: 'ielts',
    icon: '🎓',
    name: 'IELTS Academic',
    desc: t('exam.ielts.desc'),
    standard: 'Cambridge',
    questions: 20, time: 30,
    sections: ['Listening Part 1', 'Listening Part 2', 'Reading (11q)', 'Writing (2 tasks)'],
    scoreRange: t('exam.ranges.ielts'),
    stats: [
      { value: '20', label: t('exam.stats.questions') },
      { value: '30', label: t('exam.stats.minutes') },
      { value: '9.0', label: t('exam.stats.maxBand') },
    ],
    cardClass: 'card-tint-indigo',
    hoverGradient: 'bg-linear-to-br from-indigo-500/5 to-violet-500/5',
    iconBg: 'bg-indigo-500/15',
    badgeClass: 'cbadge-indigo',
    statBg: 'cstat-indigo',
    accentColor: 'ct-indigo',
    sectionClass: 'cpill-indigo',
    dotColor: 'bg-indigo-400',
    rangeBg: 'crange-indigo',
    btnClass: 'bg-linear-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20',
  },
  {
    type: 'toeic',
    icon: '💼',
    name: 'TOEIC',
    desc: t('exam.toeic.desc'),
    standard: 'ETS',
    questions: 20, time: 25,
    sections: ['Listening', 'Reading Part 5', 'Reading Part 6', 'Reading Part 7'],
    scoreRange: t('exam.ranges.toeic'),
    stats: [
      { value: '20', label: t('exam.stats.questions') },
      { value: '25', label: t('exam.stats.minutes') },
      { value: '990', label: t('exam.stats.maxScore') },
    ],
    cardClass: 'card-tint-amber',
    hoverGradient: 'bg-linear-to-br from-amber-500/5 to-orange-500/5',
    iconBg: 'bg-amber-500/15',
    badgeClass: 'cbadge-amber',
    statBg: 'cstat-amber',
    accentColor: 'ct-amber',
    sectionClass: 'cpill-amber',
    dotColor: 'bg-amber-400',
    rangeBg: 'crange-amber',
    btnClass: 'bg-linear-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-500/20',
  },
  {
    type: 'toefl',
    icon: '🌐',
    name: 'TOEFL iBT',
    desc: t('exam.toefl.desc'),
    standard: 'ETS',
    questions: 20, time: 35,
    sections: ['Reading Passage 1', 'Reading Passage 2', 'Listening — Lecture', 'Listening — Discussion', 'Writing (2 tasks)'],
    scoreRange: t('exam.ranges.toefl'),
    stats: [
      { value: '20', label: t('exam.stats.questions') },
      { value: '35', label: t('exam.stats.minutes') },
      { value: '120', label: t('exam.stats.maxScore') },
    ],
    cardClass: 'card-tint-teal',
    hoverGradient: 'bg-linear-to-br from-teal-500/5 to-cyan-500/5',
    iconBg: 'bg-teal-500/15',
    badgeClass: 'cbadge-teal',
    statBg: 'cstat-teal',
    accentColor: 'ct-teal',
    sectionClass: 'cpill-teal',
    dotColor: 'bg-teal-400',
    rangeBg: 'crange-teal',
    btnClass: 'bg-linear-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-500 hover:to-cyan-500 shadow-lg shadow-teal-500/20',
  },
])

const steps = computed(() => [
  { num: '1', title: t('exam.steps.chooseTitle'),   desc: t('exam.steps.chooseDesc'),   bgClass: 'cstep-indigo' },
  { num: '2', title: t('exam.steps.completeTitle'), desc: t('exam.steps.completeDesc'), bgClass: 'cstep-violet' },
  { num: '3', title: t('exam.steps.resultTitle'),   desc: t('exam.steps.resultDesc'),   bgClass: 'cstep-emerald' },
])

const notes = computed(() => [t('exam.note1'), t('exam.note2'), t('exam.note3')])

function startExam(type: string) {
  router.push({ name: 'ExamSession', query: { type, target: targetBand.value.toString() } })
}
</script>
