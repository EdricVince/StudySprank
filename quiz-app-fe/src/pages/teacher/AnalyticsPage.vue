<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <TeacherPageHeader :title="$t('teacher.analytics.title')" :subtitle="$t('teacher.analytics.subtitle')" :icon="BarChart2">
      <template #actions>
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
      </template>
    </TeacherPageHeader>

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
          <!-- Only shown when there is a previous period to compare with -->
          <div v-if="kpi.trend !== null" class="mt-1.5 flex items-center gap-1">
            <TrendingUp v-if="kpi.trend >= 0" class="h-3 w-3 text-chart-2" />
            <TrendingDown v-else class="h-3 w-3 text-destructive" />
            <p class="text-xs" :class="kpi.trend >= 0 ? 'text-chart-2' : 'text-destructive'">
              {{ $t('teacher.analytics.vsLast', { n: Math.abs(kpi.trend), period: $t('teacher.analytics.periods.' + selectedPeriod) }) }}
            </p>
          </div>
          <div v-else class="mt-1.5 h-4"></div>
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
                class="group relative flex h-full flex-1 flex-col items-center justify-end"
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
                {{ bucketLabel(bar.date) }}
              </div>
            </div>
          </template>
        </div>

        <!-- Class Performance Bars -->
        <div class="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
          <h3 class="text-foreground mb-5 font-semibold">{{ $t('teacher.analytics.avgScoreByClass') }}</h3>
          <div v-if="!classScoresView.length" class="flex h-32 items-center justify-center rounded-xl bg-secondary/30">
            <p class="text-muted-foreground text-sm">{{ $t('teacher.analytics.noClassesYet') }}</p>
          </div>
          <div v-else class="space-y-4">
            <div v-for="cls in classScoresView" :key="cls.name">
              <div class="mb-1.5 flex items-center justify-between">
                <span class="text-foreground truncate mr-2 text-sm font-medium">{{ cls.name }}</span>
                <span class="text-foreground shrink-0 text-sm font-bold">{{ cls.score === null ? '—' : `${cls.score}%` }}</span>
              </div>
              <div class="bg-secondary h-2.5 overflow-hidden rounded-full">
                <div
                  class="h-2.5 rounded-full transition-all duration-700"
                  :class="cls.barColor"
                  :style="{ width: `${cls.score ?? 0}%` }"
                ></div>
              </div>
            </div>
          </div>
          <div class="mt-5 space-y-1.5">
            <div v-for="cls in classScoresView" :key="cls.name" class="flex items-center gap-2">
              <div class="h-2.5 w-2.5 rounded-full" :class="cls.barColor"></div>
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
          </div>
          <div v-if="!topStudents.length" class="flex h-32 items-center justify-center rounded-xl bg-secondary/30">
            <p class="text-muted-foreground text-sm">{{ $t('teacher.analytics.noScoresYet') }}</p>
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
                <p class="text-foreground truncate font-medium">{{ student.name }}</p>
                <p class="text-muted-foreground text-xs">{{ student.class ?? '—' }}</p>
              </div>
              <div class="text-right">
                <p class="text-foreground font-bold">{{ student.score }}%</p>
                <p class="text-muted-foreground text-xs">{{ $t('teacher.analytics.quizzesN', { n: student.quizzes }) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- How each test is doing -->
        <div class="bg-card border-border rounded-2xl border p-6">
          <h3 class="text-foreground mb-4 font-semibold">{{ $t('teacher.analytics.testPerformance') }}</h3>
          <div v-if="!testScores.length" class="flex h-32 items-center justify-center rounded-xl bg-secondary/30">
            <p class="text-muted-foreground text-sm">{{ $t('teacher.analytics.noSubmissionsYet') }}</p>
          </div>
          <div v-else class="space-y-4">
            <div v-for="(test, i) in testScores" :key="test.id">
              <div class="mb-1.5 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-foreground truncate text-sm font-medium">{{ test.title }}</p>
                  <p class="text-muted-foreground truncate text-xs">{{ test.class ?? $t('teacher.dashboard.allClasses') }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <span class="text-foreground text-sm font-bold">{{ test.avg }}%</span>
                  <span class="text-muted-foreground ml-1 text-xs">{{ $t('teacher.analytics.submissionsCount', { n: test.count }) }}</span>
                </div>
              </div>
              <div class="bg-secondary h-2 rounded-full">
                <div
                  class="h-2 rounded-full transition-all duration-700"
                  :class="BAR_COLORS[i % BAR_COLORS.length]"
                  :style="{ width: `${test.avg}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Skills Monitor Section: section results of the students' IELTS mock exams -->
      <div class="mb-6 bg-card border-border rounded-2xl border p-6">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="text-foreground font-semibold">{{ $t('teacher.analytics.skillsMonitor') }}</h3>
            <p class="text-muted-foreground mt-0.5 text-xs">{{ $t('teacher.analytics.skillsMonitorDesc') }}</p>
          </div>
        </div>
        <div v-if="!skillsView.length" class="flex h-24 items-center justify-center rounded-xl bg-secondary/30">
          <p class="text-muted-foreground text-sm">{{ $t('teacher.analytics.noSkillData') }}</p>
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="skill in skillsView" :key="skill.name" class="rounded-2xl border p-4" :class="skill.borderColor">
            <div class="mb-3 flex items-center gap-2.5">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl text-xl" :class="skill.bgColor">{{ skill.icon }}</div>
              <div class="min-w-0">
                <p class="text-foreground truncate font-semibold">{{ skill.label }}</p>
                <p class="text-muted-foreground text-xs">{{ $t('teacher.analytics.attemptsN', { n: skill.attempts }) }}</p>
              </div>
            </div>
            <div class="mb-3 flex items-end gap-1.5">
              <p class="text-foreground text-3xl font-black tabular-nums">{{ skill.avgScore }}</p>
              <p class="text-muted-foreground mb-1 text-sm">%</p>
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
                <p class="text-foreground truncate text-sm font-medium">{{ student.name }}</p>
                <p class="text-muted-foreground text-xs">{{ student.class ?? '—' }}</p>
              </div>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-muted-foreground">{{ $t('teacher.analytics.avgScore2') }}</span>
                <span class="text-chart-1 font-semibold">{{ student.score === null ? '—' : `${student.score}%` }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-muted-foreground">{{ $t('teacher.analytics.lastActive') }}</span>
                <span class="text-foreground">{{ lastActiveText(student.lastActiveDate) }}</span>
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
  AlertCircle, BarChart2,
} from '@/components/icons'
import { api } from '@/utils/api'
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.vue'

type Period = 'week' | 'month' | 'year'

interface Kpi { students: number; quizzes: number; avgScore: number; trends: (number | null)[] }
interface ActivityBucket { date: string; value: number }
interface ClassScore { name: string; score: number | null; students: number }
interface TopStudent { id: number; name: string; class: string | null; score: number; quizzes: number }
interface TestScore { id: number; title: string; class: string | null; avg: number; count: number }
interface StrugglingStudent { id: number; name: string; class: string | null; score: number | null; quizzes: number; lastActiveDate: string | null }
interface SkillScore { name: string; avgScore: number; attempts: number; classes: { name: string; score: number }[] }

interface TeacherAnalytics {
  kpiData: Record<Period, Kpi>
  activityDataMap: Record<Period, ActivityBucket[]>
  classScores: ClassScore[]
  topStudents: TopStudent[]
  testScores: TestScore[]
  strugglingStudents: StrugglingStudent[]
  skillsData: SkillScore[]
}

const { t, te, locale } = useI18n()

const selectedPeriod = ref<Period>('week')
const periods = computed(() => [
  { label: t('teacher.analytics.periods.week'), value: 'week' as const },
  { label: t('teacher.analytics.periods.month'), value: 'month' as const },
  { label: t('teacher.analytics.periods.year'), value: 'year' as const },
])

const DAY_MS = 24 * 60 * 60 * 1000
const BAR_COLORS = ['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5']
const avatarBg = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-primary']

// Exam sections are free text written by the exam generator; known skills get an icon and colour.
const SKILL_STYLES: Record<string, { icon: string; bgColor: string; borderColor: string; barColor: string }> = {
  reading: { icon: '📖', bgColor: 'bg-chart-2/10', borderColor: 'border-chart-2/20', barColor: 'bg-chart-2' },
  listening: { icon: '🎧', bgColor: 'bg-chart-3/10', borderColor: 'border-chart-3/20', barColor: 'bg-chart-3' },
  writing: { icon: '✍️', bgColor: 'bg-chart-1/10', borderColor: 'border-chart-1/20', barColor: 'bg-chart-1' },
  speaking: { icon: '🎙️', bgColor: 'bg-primary/10', borderColor: 'border-primary/20', barColor: 'bg-primary' },
}
const DEFAULT_SKILL_STYLE = { icon: '🎯', bgColor: 'bg-chart-4/10', borderColor: 'border-chart-4/20', barColor: 'bg-chart-4' }

const loading = ref(true)
const analyticsError = ref('')

const EMPTY_KPI: Kpi = { students: 0, quizzes: 0, avgScore: 0, trends: [null, null, null] }
const kpiDataMap = ref<Record<Period, Kpi>>({ week: EMPTY_KPI, month: EMPTY_KPI, year: EMPTY_KPI })
const activityDataMap = ref<Record<Period, ActivityBucket[]>>({ week: [], month: [], year: [] })
const classScores = ref<ClassScore[]>([])
const topStudents = ref<TopStudent[]>([])
const testScores = ref<TestScore[]>([])
const strugglingStudents = ref<StrugglingStudent[]>([])
const skillsData = ref<SkillScore[]>([])

const kpiCards = computed(() => {
  const d = kpiDataMap.value[selectedPeriod.value]
  return [
    { label: t('teacher.analytics.kpi.activeStudents'), value: d.students, trend: d.trends[0] ?? null, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: t('teacher.analytics.kpi.quizzesPlayed'), value: d.quizzes, trend: d.trends[1] ?? null, icon: FileText, color: 'text-chart-2', bg: 'bg-chart-2/10' },
    { label: t('teacher.analytics.kpi.avgScore'), value: `${d.avgScore}%`, trend: d.trends[2] ?? null, icon: Trophy, color: 'text-chart-3', bg: 'bg-chart-3/10' },
  ]
})

const activityData = computed(() => activityDataMap.value[selectedPeriod.value])
const maxActivity = computed(() => Math.max(0, ...activityData.value.map((d) => d.value)))

// The server sends ISO dates; each bucket is labelled in the user's language.
const bucketLabel = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00Z`)
  const options: Intl.DateTimeFormatOptions =
    selectedPeriod.value === 'week' ? { weekday: 'short' }
    : selectedPeriod.value === 'month' ? { day: 'numeric', month: 'short' }
    : { month: 'short' }
  return date.toLocaleDateString(locale.value, { ...options, timeZone: 'UTC' })
}

const classScoresView = computed(() =>
  classScores.value.map((c, i) => ({ ...c, barColor: BAR_COLORS[i % BAR_COLORS.length] })),
)

const skillsView = computed(() =>
  skillsData.value.map((s) => {
    const key = `teacher.analytics.skillNames.${s.name}`
    return { ...s, ...(SKILL_STYLES[s.name.toLowerCase()] ?? DEFAULT_SKILL_STYLE), label: te(key) ? t(key) : s.name }
  }),
)

const lastActiveText = (isoDate: string | null) => {
  if (!isoDate) return t('teacher.analytics.never')
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(`${isoDate}T00:00:00Z`)) / DAY_MS))
  return new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' }).format(-days, 'day')
}

onMounted(async () => {
  try {
    const data = (await api.getTeacherAnalytics()) as TeacherAnalytics
    kpiDataMap.value = data.kpiData
    activityDataMap.value = data.activityDataMap
    classScores.value = data.classScores
    topStudents.value = data.topStudents
    testScores.value = data.testScores
    strugglingStudents.value = data.strugglingStudents
    skillsData.value = data.skillsData
  } catch (e: unknown) {
    console.error('Failed to load analytics:', e)
    const status = (e as { status?: number })?.status
    if (status === 403) {
      analyticsError.value = t('teacher.analytics.errAccessDenied')
    } else if (status === 503) {
      analyticsError.value = t('teacher.analytics.errServiceUnavailable')
    } else {
      analyticsError.value = (e as { errorMessage?: string; message?: string })?.errorMessage
        || (e as { message?: string })?.message
        || t('teacher.analytics.errLoadFailed')
    }
  } finally {
    loading.value = false
  }
})
</script>
