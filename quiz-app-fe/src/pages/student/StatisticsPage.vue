<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ $t('statistics.title') }}</h1>
          <p class="text-muted-foreground mt-2 text-base">{{ $t('statistics.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-secondary flex rounded-lg p-1">
            <button
              v-for="p in PERIODS"
              :key="p"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-all"
              :class="period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              :data-test="`period-${p}`"
              @click="period = p"
            >
              {{ $t(`statistics.periods.${p}`) }}
            </button>
          </div>
          <button
            class="bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            :disabled="!stats"
            @click="exportData"
          >
            <Download class="h-4 w-4" />
            {{ $t('statistics.export') }}
          </button>
        </div>
      </div>

      <!-- Level / XP -->
      <div class="bg-card border-border mt-6 rounded-2xl border p-4">
        <div class="flex items-center gap-4">
          <div class="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-xl">
            <Sparkles class="text-primary h-7 w-7" />
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-foreground text-lg font-bold">{{ $t('statistics.level', { n: progressStore.level }) }}</span>
                <span class="bg-chart-1/10 text-chart-1 rounded-full px-2 py-0.5 text-xs font-medium">
                  {{ $t('statistics.xpToNext', { xp: progressStore.xpToNextLevel }) }}
                </span>
              </div>
              <span class="text-foreground font-semibold">{{ progressStore.xp.toLocaleString() }} XP</span>
            </div>
            <div class="bg-secondary mt-2 h-3 overflow-hidden rounded-full">
              <div
                class="from-chart-1 to-chart-5 h-full rounded-full bg-linear-to-r transition-all duration-500"
                :style="{ width: `${progressStore.xpProgressPercent}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !stats" class="space-y-6" data-test="stats-loading">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="bg-card border-border h-28 animate-pulse rounded-2xl border"></div>
      </div>
      <div class="bg-card border-border h-72 animate-pulse rounded-2xl border"></div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError && !stats" class="bg-card border-border rounded-2xl border p-10 text-center" data-test="stats-error">
      <AlertCircle class="text-destructive mx-auto mb-3 h-8 w-8" />
      <p class="text-foreground mb-4 font-medium">{{ $t('statistics.loadFailed') }}</p>
      <button class="border-border hover:bg-secondary rounded-lg border px-4 py-2 text-sm font-medium" @click="load">
        {{ $t('statistics.retry') }}
      </button>
    </div>

    <!-- Nothing studied yet: one clear next step instead of a page of zeros -->
    <div
      v-else-if="stats && isEmpty"
      class="bg-card border-border mx-auto max-w-xl rounded-2xl border p-10 text-center"
      data-test="stats-empty"
    >
      <div class="bg-primary/10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full">
        <BarChart3 class="text-primary h-8 w-8" />
      </div>
      <h2 class="text-foreground mb-2 text-xl font-semibold">{{ $t('statistics.empty.title') }}</h2>
      <p class="text-muted-foreground mx-auto mb-6 max-w-md text-sm">{{ $t('statistics.empty.desc') }}</p>
      <div class="flex flex-wrap justify-center gap-3">
        <button class="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold" @click="router.push('/flashcards')">
          {{ $t('statistics.empty.flashcards') }}
        </button>
        <button class="border-border hover:bg-secondary rounded-xl border px-5 py-2.5 text-sm font-semibold" @click="router.push('/quizzes')">
          {{ $t('statistics.empty.quizzes') }}
        </button>
      </div>
    </div>

    <template v-else-if="stats">
      <!-- This period -->
      <div class="animate-fade-in-up mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4" data-test="period-kpis">
        <div v-for="k in periodKpis" :key="k.key" class="bg-card border-border rounded-2xl border p-4">
          <div class="flex items-center justify-between">
            <component :is="k.icon" class="text-primary h-5 w-5" />
            <span
              v-if="k.trend !== null"
              class="flex items-center gap-1 text-xs font-medium"
              :class="k.trend >= 0 ? 'text-chart-2' : 'text-destructive'"
            >
              <TrendingUp v-if="k.trend >= 0" class="h-3 w-3" />
              <TrendingDown v-else class="h-3 w-3" />
              {{ trendText(k.trend, k.unit) }}
            </span>
          </div>
          <p class="text-foreground mt-3 text-2xl font-bold tabular-nums">{{ k.value }}</p>
          <p class="text-muted-foreground text-sm">{{ $t(`statistics.kpi.${k.key}`) }}</p>
        </div>
      </div>

      <!-- Overall -->
      <div class="animate-fade-in-up mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4" data-test="lifetime-kpis">
        <div v-for="k in lifetimeKpis" :key="k.key" class="bg-secondary/50 rounded-2xl p-4">
          <div class="flex items-center gap-3">
            <component :is="k.icon" class="text-primary h-5 w-5" />
            <div>
              <p class="text-foreground text-lg font-bold tabular-nums">{{ k.value }}</p>
              <p class="text-muted-foreground text-xs">{{ $t(`statistics.lifetime.${k.key}`) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:gap-8">
        <!-- Activity -->
        <div class="bg-card border-border flex flex-col rounded-2xl border p-6 lg:col-span-2">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-foreground flex items-center gap-2 font-semibold">
              <Activity class="text-primary h-5 w-5" />
              {{ $t('statistics.activity.title') }}
            </h3>
            <div class="flex items-center gap-4 text-xs">
              <span class="flex items-center gap-1.5"><span class="bg-chart-1 h-2.5 w-2.5 rounded-full" />{{ $t('statistics.activity.flashcards') }}</span>
              <span class="flex items-center gap-1.5"><span class="bg-chart-2 h-2.5 w-2.5 rounded-full" />{{ $t('statistics.activity.quizzes') }}</span>
              <span class="text-muted-foreground">{{ $t('statistics.activity.total', { n: stats.summary.words }) }}</span>
            </div>
          </div>
          <div v-if="maxWords === 0" class="bg-secondary/30 flex min-h-52 flex-1 flex-col items-center justify-center gap-2 rounded-xl text-center">
            <BarChart3 class="text-muted-foreground/40 h-8 w-8" />
            <p class="text-muted-foreground text-sm">{{ $t('statistics.activity.empty') }}</p>
          </div>
          <template v-else>
            <div class="relative flex min-h-52 flex-1 items-stretch gap-1 pl-8" data-test="activity-chart">
              <div
                v-for="g in gridLines"
                :key="g.pct"
                class="border-border/70 pointer-events-none absolute inset-x-0 border-t border-dashed"
                :style="{ bottom: `${g.pct}%` }"
              >
                <span class="text-muted-foreground absolute -top-2 left-0 w-6 text-right text-[10px] tabular-nums">{{ g.label }}</span>
              </div>
              <div
                v-for="b in stats.activity"
                :key="b.date"
                class="group relative flex flex-1 flex-col items-center justify-end"
              >
                <div
                  class="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                >
                  {{ tooltipDate(b.date) }} — {{ $t('statistics.activity.tooltip', { flashcards: b.flashcards, quizzes: b.quizzes }) }}
                  <template v-if="b.accuracy !== null"> · {{ $t('statistics.activity.accuracy', { n: b.accuracy }) }}</template>
                </div>
                <div v-if="b.flashcards + b.quizzes === 0" class="bg-border h-[3px] w-full rounded-t" />
                <template v-else>
                  <div class="bg-chart-2 w-full" :style="{ height: `${(b.quizzes / maxWords) * 100}%` }" />
                  <div class="bg-chart-1 w-full rounded-t" :style="{ height: `${(b.flashcards / maxWords) * 100}%` }" />
                </template>
              </div>
            </div>
            <div class="mt-2 flex gap-1 pl-8">
              <div v-for="(b, i) in stats.activity" :key="b.date" class="text-muted-foreground flex-1 text-center text-[11px]">
                {{ showLabel(i) ? bucketLabel(b.date) : '' }}
              </div>
            </div>
          </template>
        </div>

        <!-- Streak calendar -->
        <div class="bg-card border-border rounded-2xl border p-6">
          <div class="mb-5 flex items-center justify-between">
            <h3 class="text-foreground flex items-center gap-2 font-semibold">
              <Flame class="text-chart-1 h-5 w-5" />
              {{ $t('statistics.streak.title') }}
            </h3>
            <span class="text-muted-foreground text-xs">{{ $t('statistics.streak.last28') }}</span>
          </div>
          <div class="grid grid-cols-7 gap-1.5" data-test="streak-calendar">
            <div
              v-for="d in calendar"
              :key="d.iso"
              class="aspect-square rounded-md"
              :class="[d.active ? 'bg-primary' : 'bg-secondary', d.today ? 'ring-primary/60 ring-2' : '']"
              :title="`${tooltipDate(d.iso)}`"
            />
          </div>
          <div class="border-border mt-5 flex items-center justify-around border-t pt-4">
            <div class="text-center">
              <p class="text-foreground text-lg font-bold">{{ progressStore.streakCount }}</p>
              <p class="text-muted-foreground text-xs">{{ $t('statistics.streak.current') }}</p>
            </div>
            <div class="bg-border h-8 w-px" />
            <div class="text-center">
              <p class="text-foreground text-lg font-bold">{{ progressStore.longestStreak }}</p>
              <p class="text-muted-foreground text-xs">{{ $t('statistics.streak.best') }}</p>
            </div>
          </div>
        </div>

        <!-- Accuracy by mode -->
        <div class="bg-card border-border rounded-2xl border p-6">
          <h3 class="text-foreground mb-5 flex items-center gap-2 font-semibold">
            <Target class="text-primary h-5 w-5" />
            {{ $t('statistics.modes.title') }}
          </h3>
          <p v-if="!stats.byMode.length" class="text-muted-foreground bg-secondary/30 rounded-xl p-6 text-center text-sm">
            {{ $t('statistics.modes.empty') }}
          </p>
          <div v-else class="space-y-4" data-test="mode-list">
            <div v-for="m in stats.byMode" :key="m.modeId">
              <div class="mb-1.5 flex items-center justify-between gap-3">
                <span class="text-foreground truncate text-sm font-medium">{{ modeLabel(m.modeId) }}</span>
                <span class="text-muted-foreground shrink-0 text-xs">
                  {{ $t('statistics.modes.plays', { n: m.sessions }, m.sessions) }} ·
                  <span class="text-foreground font-semibold">{{ m.accuracy === null ? '—' : `${m.accuracy}%` }}</span>
                </span>
              </div>
              <div class="bg-secondary h-2 overflow-hidden rounded-full">
                <div class="bg-primary h-2 rounded-full transition-all duration-700" :style="{ width: `${m.accuracy ?? 0}%` }" />
              </div>
            </div>
          </div>
        </div>

        <!-- Words to practise -->
        <div class="bg-card border-border rounded-2xl border p-6">
          <div class="mb-1 flex items-center justify-between gap-2">
            <h3 class="text-foreground flex items-center gap-2 font-semibold">
              <Brain class="text-chart-5 h-5 w-5" />
              {{ $t('statistics.weak.title') }}
            </h3>
            <button class="text-primary text-xs font-medium hover:underline" @click="router.push('/flashcards/history')">
              {{ $t('statistics.weak.history') }}
            </button>
          </div>
          <p class="text-muted-foreground mb-4 text-xs">{{ $t('statistics.weak.desc') }}</p>
          <p v-if="!stats.vocabulary.weakWords.length" class="text-muted-foreground bg-secondary/30 rounded-xl p-6 text-center text-sm">
            {{ $t('statistics.weak.empty') }}
          </p>
          <ul v-else class="space-y-2" data-test="weak-words">
            <li v-for="w in stats.vocabulary.weakWords" :key="w.term" class="bg-secondary/50 flex items-center justify-between gap-3 rounded-xl px-3 py-2">
              <div class="min-w-0">
                <p class="text-foreground truncate text-sm font-medium">{{ w.term }}</p>
                <p class="text-muted-foreground truncate text-xs">{{ w.meaning || '—' }}</p>
              </div>
              <span class="text-destructive shrink-0 text-xs font-medium">{{ $t('statistics.weak.missed', { missed: w.missed, seen: w.seen }) }}</span>
            </li>
          </ul>
        </div>

        <!-- Class tests + IELTS skills -->
        <div class="bg-card border-border rounded-2xl border p-6">
          <div class="mb-4 flex items-center justify-between gap-2">
            <h3 class="text-foreground flex items-center gap-2 font-semibold">
              <Trophy class="text-primary h-5 w-5" />
              {{ $t('statistics.tests.title') }}
            </h3>
            <span v-if="stats.tests.average !== null" class="text-muted-foreground text-xs">{{ $t('statistics.tests.average', { n: stats.tests.average }) }}</span>
          </div>
          <p v-if="!stats.tests.recent.length" class="text-muted-foreground bg-secondary/30 rounded-xl p-6 text-center text-sm">
            {{ $t('statistics.tests.empty') }}
          </p>
          <div v-else class="space-y-3" data-test="recent-tests">
            <div v-for="tst in stats.tests.recent" :key="tst.title + tst.at">
              <div class="mb-1 flex items-center justify-between gap-3">
                <span class="text-foreground truncate text-sm font-medium">{{ tst.title }}</span>
                <span class="text-foreground shrink-0 text-sm font-semibold tabular-nums">{{ tst.score }}/{{ tst.total }}</span>
              </div>
              <div class="bg-secondary h-1.5 overflow-hidden rounded-full">
                <div class="bg-chart-2 h-1.5 rounded-full" :style="{ width: `${tst.total ? (tst.score / tst.total) * 100 : 0}%` }" />
              </div>
            </div>
          </div>

          <h3 class="text-foreground mb-3 mt-6 flex items-center gap-2 font-semibold">
            <Lightbulb class="text-chart-5 h-5 w-5" />
            {{ $t('statistics.skills.title') }}
          </h3>
          <p v-if="!stats.skills.length" class="text-muted-foreground bg-secondary/30 rounded-xl p-4 text-center text-sm">
            {{ $t('statistics.skills.empty') }}
          </p>
          <div v-else class="space-y-3" data-test="skill-list">
            <div v-for="s in stats.skills" :key="s.name">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-foreground text-sm font-medium">{{ skillLabel(s.name) }}</span>
                <span class="text-muted-foreground text-xs">{{ $t('statistics.skills.attempts', { n: s.attempts }, s.attempts) }} · <span class="text-foreground font-semibold">{{ s.avgScore }}%</span></span>
              </div>
              <div class="bg-secondary h-1.5 overflow-hidden rounded-full">
                <div class="bg-chart-3 h-1.5 rounded-full" :style="{ width: `${s.avgScore}%` }" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Target, BarChart3, Flame, Download, Sparkles, TrendingUp, TrendingDown, BookOpen, Trophy, Activity,
  Lightbulb, Brain, Clock, Layers, AlertCircle, Check,
} from '@/components/icons'
import { api } from '@/utils/api'
import { useProgressStore } from '@/stores/progress.store'
import type { MyStatistics, StatPeriod } from '@/types/statistics'

const PERIODS: StatPeriod[] = ['week', 'month', 'year']
const STREAK_CALENDAR_DAYS = 28
const DAY_MS = 24 * 60 * 60 * 1000

const { t, te, locale } = useI18n()
const router = useRouter()
const progressStore = useProgressStore()

const period = ref<StatPeriod>('week')
const stats = ref<MyStatistics | null>(null)
const loading = ref(true)
const loadError = ref(false)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    stats.value = await api.getMyStatistics(period.value)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}
// The level / streak figures come from the progress record: refresh it, it may be stale when this page is opened directly.
onMounted(() => {
  void progressStore.fetchProgress()
  void load()
})
watch(period, load)

// Nothing recorded anywhere yet (the lifetime counters of the progress record count too).
const isEmpty = computed(
  () =>
    !!stats.value &&
    !stats.value.hasHistory &&
    stats.value.tests.taken === 0 &&
    stats.value.skills.length === 0 &&
    progressStore.totalCardsStudied === 0 &&
    progressStore.totalQuizzesCompleted === 0,
)

// ── Formatting ───────────────────────────────────────────────────────────────
const formatMinutes = (minutes: number) => {
  if (minutes < 60) return t('statistics.minutes', { n: minutes })
  return t('statistics.hoursMinutes', { h: Math.floor(minutes / 60), m: minutes % 60 })
}
const trendText = (trend: number, unit: 'percent' | 'points') => {
  const sign = trend > 0 ? '+' : ''
  return t(unit === 'percent' ? 'statistics.trendPercent' : 'statistics.trendPoints', {
    n: `${sign}${trend}`,
    period: t(`statistics.previous.${period.value}`),
  })
}

const periodKpis = computed(() => {
  const s = stats.value!
  return [
    { key: 'words', icon: BookOpen, value: s.summary.words.toLocaleString(), trend: s.trends.words, unit: 'percent' as const },
    { key: 'accuracy', icon: Target, value: s.summary.accuracy === null ? '—' : `${s.summary.accuracy}%`, trend: s.trends.accuracy, unit: 'points' as const },
    { key: 'time', icon: Clock, value: formatMinutes(s.summary.minutes), trend: s.trends.minutes, unit: 'percent' as const },
    { key: 'sessions', icon: Layers, value: s.summary.sessions.toLocaleString(), trend: s.trends.sessions, unit: 'percent' as const },
  ]
})

const lifetimeKpis = computed(() => {
  const s = stats.value!
  return [
    { key: 'learned', icon: Check, value: s.vocabulary.learned.toLocaleString() },
    { key: 'streak', icon: Flame, value: progressStore.streakCount },
    { key: 'bestStreak', icon: Trophy, value: progressStore.longestStreak },
    { key: 'tests', icon: Activity, value: s.tests.average === null ? '—' : `${s.tests.average}%` },
  ]
})

// ── Activity chart ───────────────────────────────────────────────────────────
const maxWords = computed(() => Math.max(0, ...(stats.value?.activity ?? []).map((b) => b.flashcards + b.quizzes)))
const gridLines = computed(() => {
  const max = maxWords.value
  const lines = [0, Math.ceil(max / 2), max].map((value) => ({ pct: max ? (value / max) * 100 : 0, label: value, value }))
  return lines.filter((l, i) => lines.findIndex((o) => o.value === l.value) === i)
})
const bucketLabel = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`)
  const options: Intl.DateTimeFormatOptions =
    period.value === 'week' ? { weekday: 'short' } : period.value === 'month' ? { day: 'numeric' } : { month: 'short' }
  return date.toLocaleDateString(locale.value, { ...options, timeZone: 'UTC' })
}
// A month has 30 bars: label every fifth one so the axis stays readable.
const showLabel = (i: number) => period.value !== 'month' || i % 5 === 0 || i === (stats.value?.activity.length ?? 0) - 1
const tooltipDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(
    locale.value,
    period.value === 'year' ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { dateStyle: 'medium', timeZone: 'UTC' },
  )

// ── Streak calendar: the last 28 days, filled where the student really studied ───
const calendar = computed(() => {
  const active = new Set(stats.value?.activeDays ?? [])
  const today = Date.now()
  return Array.from({ length: STREAK_CALENDAR_DAYS }, (_, i) => {
    const iso = new Date(today - (STREAK_CALENDAR_DAYS - 1 - i) * DAY_MS).toISOString().slice(0, 10)
    return { iso, active: active.has(iso), today: i === STREAK_CALENDAR_DAYS - 1 }
  })
})

// ── Labels ───────────────────────────────────────────────────────────────────
const modeLabel = (id: string) => (te(`history.modes.${id}`) ? t(`history.modes.${id}`) : id)
const skillLabel = (name: string) => (te(`teacher.analytics.skillNames.${name}`) ? t(`teacher.analytics.skillNames.${name}`) : name)

const exportData = () => {
  if (!stats.value) return
  const data = { exportedAt: new Date().toISOString(), level: progressStore.level, xp: progressStore.xp, ...stats.value }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `studyspark-stats-${period.value}-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
