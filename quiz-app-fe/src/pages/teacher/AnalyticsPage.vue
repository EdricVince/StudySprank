<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-foreground text-2xl font-bold">{{ $t('teacher.analytics.title') }}</h2>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.analytics.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        <button
          v-for="p in periods"
          :key="p.value"
          class="rounded-lg px-4 py-2 text-sm font-medium transition-all"
          :class="selectedPeriod === p.value
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'"
          @click="selectedPeriod = p.value"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="bg-card border-border animate-pulse rounded-2xl border p-5 h-28" />
      </div>
      <div class="mb-6 grid gap-6 lg:grid-cols-5">
        <div class="bg-card border-border animate-pulse rounded-2xl border p-6 h-64 lg:col-span-3" />
        <div class="bg-card border-border animate-pulse rounded-2xl border p-6 h-64 lg:col-span-2" />
      </div>
    </template>

    <div v-if="analyticsError" class="info-box info-box-red mb-6 flex items-center gap-3 text-sm text-red-400">
      <span class="text-lg">⚠</span>
      <div>
        <div class="font-semibold">{{ $t('teacher.analytics.failedToLoad') }}</div>
        <div class="text-red-400/70 mt-0.5">{{ analyticsError }}</div>
      </div>
      <button class="ml-auto text-red-400/50 hover:text-red-400" @click="analyticsError = ''">✕</button>
    </div>

    <template v-else>
      <!-- KPI Cards -->
      <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div
          v-for="kpi in kpiCards"
          :key="kpi.label"
          class="bg-card border-border rounded-2xl border p-5 transition-all hover:shadow-md"
        >
          <div class="mb-4 flex items-center justify-between">
            <span class="text-muted-foreground text-sm">{{ kpi.label }}</span>
            <div class="rounded-xl p-2.5" :class="kpi.bg">
              <component :is="kpi.icon" class="h-4 w-4" :class="kpi.color" />
            </div>
          </div>
          <p class="text-foreground text-3xl font-bold tabular-nums">{{ kpi.value }}</p>
          <div class="mt-1.5 flex items-center gap-1">
            <TrendingUp v-if="(kpi.trend ?? 0) >= 0" class="h-3 w-3 text-chart-2" />
            <TrendingDown v-else class="h-3 w-3 text-destructive" />
            <p class="text-xs" :class="(kpi.trend ?? 0) >= 0 ? 'text-chart-2' : 'text-destructive'">
              {{ $t('teacher.analytics.vsLast', { n: Math.abs(kpi.trend ?? 0), period: $t('teacher.analytics.periods.' + selectedPeriod) }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Charts Row 1 -->
      <div class="mb-6 grid gap-6 lg:grid-cols-5">
        <!-- Activity Bar Chart -->
        <div class="bg-card border-border rounded-2xl border p-6 lg:col-span-3">
          <div class="mb-5 flex items-center justify-between">
            <h3 class="text-foreground font-semibold">{{ $t('teacher.analytics.studentActivity') }}</h3>
            <span class="text-muted-foreground text-xs">{{ $t('teacher.analytics.activePerPeriod') }}</span>
          </div>

          <div v-if="maxActivity === 0" class="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-secondary/30 text-center">
            <BarChart2 class="text-muted-foreground/40 h-8 w-8" />
            <p class="text-muted-foreground text-sm">{{ $t('teacher.analytics.noActivityData') }}</p>
          </div>

          <template v-else>
            <div class="flex h-40 items-end gap-1.5">
              <div
                v-for="(bar, i) in activityData"
                :key="i"
                class="group relative flex flex-1 flex-col items-center"
              >
                <div
                  class="bg-primary/20 hover:bg-primary w-full rounded-t-lg transition-all duration-300"
                  :style="{ height: `${(bar.value / maxActivity) * 100}%` }"
                >
                  <div class="bg-foreground text-background pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {{ $t('teacher.analytics.barTooltip', { value: bar.value }) }}
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-2 flex gap-1.5">
              <div v-for="(bar, i) in activityData" :key="i" class="text-muted-foreground flex-1 text-center text-xs">
                {{ bar.label }}
              </div>
            </div>
          </template>
        </div>

        <!-- Class Performance Bars -->
        <div class="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
          <h3 class="text-foreground mb-5 font-semibold">{{ $t('teacher.analytics.avgScoreByClass') }}</h3>
          <div v-if="!classScores.length" class="flex h-32 items-center justify-center rounded-xl bg-secondary/30">
            <p class="text-muted-foreground text-sm">{{ $t('teacher.analytics.noClassesYet') }}</p>
          </div>
          <div v-else class="space-y-4">
            <div v-for="cls in classScores" :key="cls.name">
              <div class="mb-1.5 flex items-center justify-between">
                <span class="text-foreground truncate mr-2 text-sm font-medium">{{ cls.name }}</span>
                <span class="text-foreground shrink-0 text-sm font-bold">{{ cls.score }}%</span>
              </div>
              <div class="bg-secondary h-2.5 overflow-hidden rounded-full">
                <div
                  class="h-2.5 rounded-full transition-all duration-700"
                  :class="cls.barColor"
                  :style="{ width: `${cls.score}%` }"
                ></div>
              </div>
            </div>
          </div>
          <div class="mt-5 space-y-1.5">
            <div v-for="cls in classScores" :key="cls.name" class="flex items-center gap-2">
              <div class="h-2.5 w-2.5 rounded-full" :class="cls.dotColor"></div>
              <span class="text-muted-foreground text-xs">{{ $t('teacher.analytics.classDotLabel', { name: cls.name, n: cls.students }) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row 2 -->
      <div class="mb-6 grid gap-6 lg:grid-cols-2">
        <!-- Top Students -->
        <div class="bg-card border-border rounded-2xl border p-6">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-foreground font-semibold">{{ $t('teacher.analytics.topStudents') }}</h3>
            <span class="text-muted-foreground text-xs">{{ $t('teacher.analytics.thisPeriod', { period: $t('teacher.analytics.periods.' + selectedPeriod) }) }}</span>
          </div>
          <div v-if="!topStudents.length" class="flex h-32 items-center justify-center rounded-xl bg-secondary/30">
            <p class="text-muted-foreground text-sm">{{ $t('teacher.analytics.noStudentsEnrolled') }}</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="(student, i) in topStudents"
              :key="student.id"
              class="flex items-center gap-4 rounded-xl p-3 transition-colors"
              :class="i < 3 ? 'bg-primary/5' : 'hover:bg-secondary/50'"
            >
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                :class="i === 0 ? 'bg-chart-5/20 text-chart-5'
                       : i === 1 ? 'bg-secondary text-muted-foreground'
                       : i === 2 ? 'bg-chart-1/20 text-chart-1'
                       : 'bg-secondary text-muted-foreground'"
              >
                {{ i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1 }}
              </div>
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground"
                :class="avatarBg[i % avatarBg.length]"
              >
                {{ student.name.charAt(0) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-foreground font-medium">{{ student.name }}</p>
                <p class="text-muted-foreground text-xs">{{ student.class }}</p>
              </div>
              <div class="text-right">
                <p class="text-foreground font-bold">{{ student.score }}%</p>
                <p class="text-muted-foreground text-xs">{{ $t('teacher.analytics.quizzesN', { n: student.quizzes }) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quiz Type Breakdown -->
        <div class="bg-card border-border rounded-2xl border p-6">
          <h3 class="text-foreground mb-4 font-semibold">{{ $t('teacher.analytics.quizTypePerformance') }}</h3>
          <div class="space-y-4">
            <div v-for="qt in quizTypes" :key="qt.type">
              <div class="mb-1.5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="rounded-lg p-1.5" :class="qt.bg">
                    <component :is="qt.icon" class="h-3.5 w-3.5" :class="qt.color" />
                  </div>
                  <span class="text-foreground text-sm font-medium">{{ qt.label }}</span>
                </div>
                <div class="text-right">
                  <span class="text-foreground text-sm font-bold">{{ qt.avg }}%</span>
                  <span class="text-muted-foreground ml-1 text-xs">{{ $t('teacher.analytics.gamesCount', { n: qt.count }) }}</span>
                </div>
              </div>
              <div class="bg-secondary h-2 rounded-full">
                <div
                  class="h-2 rounded-full transition-all duration-700"
                  :class="qt.barColor"
                  :style="{ width: `${qt.avg}%` }"
                ></div>
              </div>
            </div>
          </div>
          <div class="mt-5 flex flex-wrap gap-2">
            <div class="bg-secondary rounded-xl px-3 py-2 text-center">
              <p class="text-foreground text-lg font-bold">{{ totalQuizzes }}</p>
              <p class="text-muted-foreground text-xs">{{ $t('teacher.analytics.totalGames') }}</p>
            </div>
            <div class="bg-secondary rounded-xl px-3 py-2 text-center">
              <p class="text-foreground text-lg font-bold">{{ avgAccuracy }}%</p>
              <p class="text-muted-foreground text-xs">{{ $t('teacher.analytics.avgAccuracy') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Skills Monitor Section -->
      <div class="mb-6 bg-card border-border rounded-2xl border p-6">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="text-foreground font-semibold">{{ $t('teacher.analytics.skillsMonitor') }}</h3>
            <p class="text-muted-foreground mt-0.5 text-xs">{{ $t('teacher.analytics.skillsMonitorDesc') }}</p>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="skill in skillsData" :key="skill.name" class="rounded-2xl border p-4" :class="skill.borderColor">
            <div class="mb-3 flex items-center gap-2.5">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl text-xl" :class="skill.bgColor">{{ skill.icon }}</div>
              <div>
                <p class="text-foreground font-semibold">{{ $t('teacher.analytics.skillNames.' + skill.name) }}</p>
                <p class="text-muted-foreground text-xs">{{ $t('teacher.analytics.skillDescs.' + skill.name) }}</p>
              </div>
            </div>
            <div class="mb-3 flex items-end gap-1.5">
              <p class="text-foreground text-3xl font-black tabular-nums">{{ skill.avgScore }}</p>
              <p class="text-muted-foreground mb-1 text-sm">%</p>
              <div class="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" :class="skill.avgScore >= 70 ? 'bg-chart-2/15 text-chart-2' : 'bg-chart-1/15 text-chart-1'">
                <TrendingUp v-if="skill.avgScore >= 70" class="h-3 w-3" />
                <TrendingDown v-else class="h-3 w-3" />
                {{ skill.change > 0 ? '+' : '' }}{{ skill.change }}%
              </div>
            </div>
            <div class="space-y-2">
              <div v-for="cls in skill.classes" :key="cls.name">
                <div class="mb-1 flex items-center justify-between">
                  <span class="text-muted-foreground truncate text-xs">{{ cls.name }}</span>
                  <span class="text-foreground text-xs font-semibold">{{ cls.score }}%</span>
                </div>
                <div class="bg-secondary h-1.5 overflow-hidden rounded-full">
                  <div class="h-1.5 rounded-full transition-all duration-700" :class="skill.barColor" :style="{ width: `${cls.score}%` }"></div>
                </div>
              </div>
              <div v-if="!skill.classes.length" class="text-muted-foreground text-xs">{{ $t('teacher.analytics.noClassesYet') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Struggling Students -->
      <div class="bg-card border-border rounded-2xl border p-6">
        <div class="mb-4 flex items-center gap-2">
          <AlertCircle class="text-chart-1 h-5 w-5" />
          <h3 class="text-foreground font-semibold">{{ $t('teacher.analytics.studentsNeedingAttention') }}</h3>
          <span class="bg-chart-1/10 text-chart-1 rounded-full px-2.5 py-0.5 text-xs font-medium">{{ strugglingStudents.length }}</span>
        </div>
        <div v-if="!strugglingStudents.length" class="flex h-24 items-center justify-center rounded-xl bg-secondary/30">
          <p class="text-muted-foreground text-sm">{{ $t('teacher.analytics.allPerformingWell') }}</p>
        </div>
        <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(student, i) in strugglingStudents"
            :key="student.id"
            class="bg-secondary/50 border-border border rounded-xl p-4"
          >
            <div class="mb-3 flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground"
                :class="avatarBg[i % avatarBg.length]"
              >
                {{ student.name.charAt(0) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-foreground text-sm font-medium">{{ student.name }}</p>
                <p class="text-muted-foreground text-xs">{{ student.class }}</p>
              </div>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-muted-foreground">{{ $t('teacher.analytics.avgScore2') }}</span>
                <span class="text-chart-1 font-semibold">{{ student.score }}%</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-muted-foreground">{{ $t('teacher.analytics.lastActive') }}</span>
                <span class="text-foreground">{{ student.lastActive }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-muted-foreground">{{ $t('teacher.analytics.quizzesCompleted') }}</span>
                <span class="text-foreground">{{ $t('teacher.analytics.completedSuffix', { n: student.quizzes }) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Users, FileText, Trophy, TrendingUp, TrendingDown,
  AlertCircle, CircleHelp, Shuffle, Timer, CircleCheck, BarChart2,
} from '@/components/icons'
import { api } from '@/utils/api'

const { t } = useI18n()

const selectedPeriod = ref<'week' | 'month' | 'year'>('week')
const periods = computed(() => [
  { label: t('teacher.analytics.periods.week'), value: 'week' as const },
  { label: t('teacher.analytics.periods.month'), value: 'month' as const },
  { label: t('teacher.analytics.periods.year'), value: 'year' as const },
])

// Map a quiz-type name to its i18n key slug (types stay English for API matching).
const QUIZ_TYPE_KEY: Record<string, string> = {
  'Multiple Choice': 'multipleChoice', 'True or False': 'trueFalse',
  'Speed Round': 'speedRound', 'Word Scramble': 'wordScramble',
}

const avatarBg = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-primary']
const loading = ref(true)
const analyticsError = ref('')

// Reactive data populated from API
const kpiDataMap = ref<Record<string, { students: number; quizzes: number; avgScore: number; trends: number[] }>>({
  week:  { students: 0, quizzes: 0, avgScore: 0, trends: [0, 0, 0] },
  month: { students: 0, quizzes: 0, avgScore: 0, trends: [0, 0, 0] },
  year:  { students: 0, quizzes: 0, avgScore: 0, trends: [0, 0, 0] },
})
const activityDataMapRef = ref<Record<string, { label: string; value: number }[]>>({
  week: [
    { label: 'Mon', value: 0 }, { label: 'Tue', value: 0 }, { label: 'Wed', value: 0 },
    { label: 'Thu', value: 0 }, { label: 'Fri', value: 0 }, { label: 'Sat', value: 0 }, { label: 'Sun', value: 0 },
  ],
  month: [
    { label: 'W1', value: 0 }, { label: 'W2', value: 0 }, { label: 'W3', value: 0 },
    { label: 'W4', value: 0 }, { label: 'W5', value: 0 },
  ],
  year: [
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 0 }, { label: 'Mar', value: 0 },
    { label: 'Apr', value: 0 }, { label: 'May', value: 0 }, { label: 'Jun', value: 0 },
    { label: 'Jul', value: 0 }, { label: 'Aug', value: 0 }, { label: 'Sep', value: 0 },
    { label: 'Oct', value: 0 }, { label: 'Nov', value: 0 }, { label: 'Dec', value: 0 },
  ],
})
const classScores = ref<{ name: string; score: number; students: number; barColor: string; dotColor: string }[]>([])
const topStudents = ref<{ id: number; name: string; class: string; score: number; quizzes: number }[]>([])
const quizTypesData = ref([
  { type: 'Multiple Choice', avg: 0, count: 0, icon: CircleHelp,  bg: 'bg-primary/10',  color: 'text-primary',  barColor: 'bg-primary'  },
  { type: 'True or False',   avg: 0, count: 0, icon: CircleCheck, bg: 'bg-chart-2/10', color: 'text-chart-2', barColor: 'bg-chart-2' },
  { type: 'Speed Round',     avg: 0, count: 0, icon: Timer,       bg: 'bg-chart-1/10', color: 'text-chart-1', barColor: 'bg-chart-1' },
  { type: 'Word Scramble',   avg: 0, count: 0, icon: Shuffle,     bg: 'bg-chart-3/10', color: 'text-chart-3', barColor: 'bg-chart-3' },
])
const strugglingStudents = ref<{ id: number; name: string; class: string; score: number; quizzes: number; lastActive: string }[]>([])
const skillsDataRef = ref([
  { name: 'Reading',   desc: 'Comprehension exercises',   icon: '📖', bgColor: 'bg-chart-2/10', borderColor: 'border-chart-2/20', barColor: 'bg-chart-2', avgScore: 0, change: 0, classes: [] as { name: string; score: number }[] },
  { name: 'Listening', desc: 'Audio exercises',            icon: '🎧', bgColor: 'bg-chart-3/10', borderColor: 'border-chart-3/20', barColor: 'bg-chart-3', avgScore: 0, change: 0, classes: [] as { name: string; score: number }[] },
  { name: 'Writing',   desc: 'Text production',            icon: '✍️', bgColor: 'bg-chart-1/10', borderColor: 'border-chart-1/20', barColor: 'bg-chart-1', avgScore: 0, change: 0, classes: [] as { name: string; score: number }[] },
  { name: 'Speaking',  desc: 'Pronunciation & fluency',    icon: '🎙️', bgColor: 'bg-primary/10',  borderColor: 'border-primary/20',  barColor: 'bg-primary',  avgScore: 0, change: 0, classes: [] as { name: string; score: number }[] },
])

const emptyKpi = { students: 0, quizzes: 0, avgScore: 0, trends: [0, 0, 0] }

const kpiCards = computed(() => {
  const d = kpiDataMap.value[selectedPeriod.value] ?? emptyKpi
  return [
    { label: t('teacher.analytics.kpi.activeStudents'), value: d.students, trend: d.trends[0], icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: t('teacher.analytics.kpi.quizzesPlayed'), value: d.quizzes, trend: d.trends[1], icon: FileText, color: 'text-chart-2', bg: 'bg-chart-2/10' },
    { label: t('teacher.analytics.kpi.avgScore'), value: `${d.avgScore}%`, trend: d.trends[2], icon: Trophy, color: 'text-chart-3', bg: 'bg-chart-3/10' },
  ]
})

const activityData = computed(() => activityDataMapRef.value[selectedPeriod.value] ?? [])
const maxActivity = computed(() => activityData.value.length ? Math.max(...activityData.value.map(d => d.value), 0) : 0)

const quizTypes = computed(() => quizTypesData.value.map(qt => ({
  ...qt,
  label: t('teacher.analytics.quizTypeNames.' + (QUIZ_TYPE_KEY[qt.type] ?? 'multipleChoice')),
})))
const skillsData = computed(() => skillsDataRef.value)

const totalQuizzes = computed(() => quizTypesData.value.reduce((s, q) => s + q.count, 0))
const avgAccuracy = computed(() => {
  const withData = quizTypesData.value.filter(q => q.avg > 0)
  return withData.length ? Math.round(withData.reduce((s, q) => s + q.avg, 0) / withData.length) : 0
})

onMounted(async () => {
  try {
    const data = await api.getTeacherAnalytics()

    // KPI
    if (data.kpiData) kpiDataMap.value = data.kpiData

    // Activity
    if (data.activityDataMap) activityDataMapRef.value = data.activityDataMap

    // Class scores
    if (data.classScores) classScores.value = data.classScores

    // Top students
    if (data.topStudents) topStudents.value = data.topStudents

    // Quiz types — merge by type name to avoid index-order bugs
    if (data.quizTypes) {
      const qtMap = new Map((data.quizTypes as { type: string; avg: number; count: number }[]).map(q => [q.type, q]))
      quizTypesData.value = quizTypesData.value.map(qt => {
        const api = qtMap.get(qt.type)
        return api ? { ...qt, avg: api.avg, count: api.count } : qt
      })
    }

    // Struggling students
    if (data.strugglingStudents) strugglingStudents.value = data.strugglingStudents

    // Skills data — merge by skill name to avoid index-order bugs
    if (data.skillsData) {
      const sdMap = new Map((data.skillsData as { name: string; avgScore: number; change: number; classes: { name: string; score: number }[] }[]).map(s => [s.name, s]))
      skillsDataRef.value = skillsDataRef.value.map(skill => {
        const api = sdMap.get(skill.name)
        return api ? { ...skill, avgScore: api.avgScore, change: api.change, classes: api.classes } : skill
      })
    }
  } catch (e: any) {
    console.error('Failed to load analytics:', e)
    const status = e?.status ?? e?.response?.status
    if (status === 403) {
      analyticsError.value = t('teacher.analytics.errAccessDenied')
    } else if (status === 503) {
      analyticsError.value = t('teacher.analytics.errServiceUnavailable')
    } else {
      analyticsError.value = e?.errorMessage || e?.message || t('teacher.analytics.errLoadFailed')
    }
  } finally {
    loading.value = false
  }
})
</script>
