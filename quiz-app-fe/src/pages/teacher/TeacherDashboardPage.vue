<template>
  <div class="p-6 lg:p-8">

    <!-- Hero -->
    <div class="animate-fade-in-down border-border from-primary/10 via-card to-card relative mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br p-6 lg:p-8">
      <div class="bg-primary/10 pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"></div>
      <div class="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0">
          <p class="text-muted-foreground mb-1 text-sm font-medium">{{ greeting }}</p>
          <h1 class="text-foreground truncate text-2xl font-bold tracking-tight lg:text-3xl">{{ userName }}</h1>
          <p class="text-muted-foreground mt-2 text-sm">{{ $t('teacher.dashboard.heroSubtitle') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm transition-colors"
            @click="router.push('/teacher/classes')"
          >
            <Plus class="h-4 w-4" />
            {{ $t('teacher.dashboard.newClass') }}
          </button>
          <button
            class="border-border bg-card hover:bg-accent flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors"
            @click="router.push('/teacher/tests/new')"
          >
            <FileText class="h-4 w-4" />
            {{ $t('teacher.dashboard.newTest') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Dashboard error -->
    <div v-if="dashboardError" class="info-box info-box-red mb-6 flex items-center gap-3 text-sm text-red-400">
      <span>⚠</span> {{ dashboardError }}
      <button class="ml-auto text-red-400/50 hover:text-red-400" @click="dashboardError = ''">✕</button>
    </div>

    <!-- Stats -->
    <TeacherStatRow :stats="stats" />

    <!-- Quick actions (same bar as the student dashboard) -->
    <div class="animate-fade-in-up delay-100 bg-card border-border mb-6 rounded-2xl border p-4">
      <div class="flex items-center justify-between gap-3 overflow-x-auto">
        <button
          v-for="action in quickActions"
          :key="action.path"
          class="group hover:bg-accent flex min-w-[110px] flex-1 flex-col items-center gap-2 rounded-xl p-4 transition-all"
          @click="router.push(action.path)"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl transition-all group-hover:scale-110" :class="action.iconBg">
            <component :is="action.icon" class="h-6 w-6" :class="action.iconColor" />
          </div>
          <span class="text-foreground text-sm font-medium">{{ action.label }}</span>
        </button>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid gap-6 xl:grid-cols-3">

      <!-- Left: classes, tests, assignments -->
      <div class="space-y-6 xl:col-span-2">

        <!-- My classes -->
        <section class="animate-fade-in-up delay-150 bg-card border-border rounded-2xl border p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-foreground text-sm font-semibold uppercase tracking-wider">{{ $t('teacher.dashboard.activeClasses') }}</h2>
            <button class="text-primary hover:text-primary/70 text-sm font-medium transition-colors" @click="router.push('/teacher/classes')">
              {{ $t('teacher.dashboard.viewAll') }}
            </button>
          </div>

          <div v-if="recentClasses.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
            <div class="bg-secondary mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
              <BookOpen class="text-muted-foreground h-7 w-7" />
            </div>
            <p class="text-foreground mb-1 font-medium">{{ $t('teacher.dashboard.noClassesYet') }}</p>
            <p class="text-muted-foreground text-sm">{{ $t('teacher.dashboard.createFirstClassDesc') }}</p>
            <button
              class="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              @click="router.push('/teacher/classes')"
            >
              {{ $t('teacher.dashboard.createClass') }}
            </button>
          </div>

          <div v-else class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="cls in recentClasses"
              :key="cls.id"
              class="border-border hover:border-primary/40 group cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md"
              @click="router.push(`/teacher/classes/${cls.id}`)"
            >
              <div class="mb-3 flex items-center gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" :class="cls.bgColor">
                  {{ cls.emoji }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-foreground truncate font-semibold">{{ cls.name }}</p>
                  <p class="text-muted-foreground text-xs">{{ $t('teacher.dashboard.studentsN', { n: cls.studentCount }) }}</p>
                </div>
                <ArrowRight class="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div class="bg-primary/5 border-primary/20 flex items-center justify-between rounded-lg border px-3 py-1.5">
                <div>
                  <p class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">{{ $t('teacher.dashboard.joinCode') }}</p>
                  <p class="text-primary font-mono text-sm font-bold tracking-wider">{{ cls.joinCode }}</p>
                </div>
                <button
                  type="button"
                  class="text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
                  :title="$t('teacher.dashboard.copyCode')"
                  @click.stop="copyCode(cls)"
                >
                  <component :is="copiedId === cls.id ? Check : Copy" class="h-3.5 w-3.5" />
                  {{ copiedId === cls.id ? $t('teacher.dashboard.codeCopied') : $t('teacher.dashboard.copyCode') }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Tests -->
        <section class="animate-fade-in-up delay-200 bg-card border-border rounded-2xl border p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-foreground text-sm font-semibold uppercase tracking-wider">{{ $t('teacher.dashboard.upcomingTests') }}</h2>
            <button class="text-primary hover:text-primary/70 text-sm font-medium transition-colors" @click="router.push('/teacher/tests')">
              {{ $t('teacher.dashboard.viewAll') }}
            </button>
          </div>

          <div v-if="upcomingTests.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
            <FileText class="text-muted-foreground/40 mb-3 h-10 w-10" />
            <p class="text-muted-foreground text-sm">{{ $t('teacher.dashboard.noUpcomingTests') }}</p>
            <button
              class="text-primary hover:text-primary/70 mt-3 text-sm font-medium underline-offset-4 transition-colors hover:underline"
              @click="router.push('/teacher/tests/new')"
            >
              {{ $t('teacher.dashboard.createATest') }}
            </button>
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="test in upcomingTests"
              :key="test.id"
              class="bg-secondary/40 hover:bg-secondary/70 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors"
              @click="router.push(test.published ? `/teacher/tests/${test.id}/results` : `/teacher/tests/${test.id}/edit`)"
            >
              <div class="bg-chart-1/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <FileText class="text-chart-1 h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-foreground truncate text-sm font-medium">{{ test.title }}</p>
                <div class="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                  <span class="flex items-center gap-1"><BookOpen class="h-3 w-3" /> {{ test.class }}</span>
                  <span>{{ $t('teacher.dashboard.questionsCount', { count: test.questions }) }}</span>
                  <span v-if="test.duration" class="flex items-center gap-1"><Clock class="h-3 w-3" /> {{ $t('teacher.dashboard.durationMin', { min: test.duration }) }}</span>
                </div>
              </div>
              <span
                class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="test.published ? 'bg-chart-2/10 text-chart-2' : 'bg-secondary text-muted-foreground'"
              >{{ test.status }}</span>
            </button>
          </div>
        </section>

        <!-- Assignments (read-only overview — created & managed on the Tests page) -->
        <section class="animate-fade-in-up delay-250 bg-card border-border rounded-2xl border p-6">
          <div class="mb-4 flex items-center justify-between">
            <div>
              <h2 class="text-foreground text-sm font-semibold uppercase tracking-wider">{{ $t('teacher.dashboard.activeAssignments') }}</h2>
              <p class="text-muted-foreground mt-0.5 text-xs">{{ $t('teacher.dashboard.activeAssignmentsDesc') }}</p>
            </div>
            <button class="text-primary hover:text-primary/70 text-sm font-medium transition-colors" @click="router.push('/teacher/tests')">
              {{ $t('teacher.dashboard.viewAll') }}
            </button>
          </div>

          <div v-if="assignments.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
            <div class="bg-secondary mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
              <List class="text-muted-foreground h-7 w-7" />
            </div>
            <p class="text-foreground mb-1 font-medium">{{ $t('teacher.dashboard.noAssignmentsYet') }}</p>
            <p class="text-muted-foreground text-sm">{{ $t('teacher.dashboard.noAssignmentsDesc') }}</p>
            <button
              class="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              @click="router.push('/teacher/tests')"
            >
              {{ $t('teacher.dashboard.newAssignment') }}
            </button>
          </div>

          <div v-else class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="a in assignments"
              :key="a.id"
              class="bg-secondary/40 hover:bg-secondary/60 flex flex-col rounded-2xl p-4 text-left transition-colors"
              @click="router.push(a.class_id != null ? `/teacher/classes/${a.class_id}` : '/teacher/tests')"
            >
              <div class="mb-2 flex min-w-0 items-center gap-2.5">
                <div class="bg-chart-2/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <FileText class="text-chart-2 h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-foreground truncate text-sm font-semibold">{{ a.title }}</p>
                  <p class="text-muted-foreground text-xs">{{ classNameFor(a.class_id) }}</p>
                </div>
              </div>
              <p v-if="a.description" class="text-muted-foreground mb-3 line-clamp-2 text-xs">{{ a.description }}</p>
              <img v-if="a.attachment" :src="a.attachment" class="mb-3 max-h-28 w-full rounded-lg object-cover" :alt="a.attachment_name || a.title" />
              <div class="mt-auto">
                <span
                  class="rounded-md px-2 py-0.5 text-xs"
                  :class="a.is_published ? 'bg-chart-2/10 text-chart-2' : 'bg-secondary text-muted-foreground'"
                >{{ a.is_published ? $t('teacher.dashboard.publishedBadge') : $t('teacher.dashboard.draftBadge') }}</span>
              </div>
            </button>
          </div>
        </section>
      </div>

      <!-- Right: attention + activity -->
      <div class="space-y-6">

        <!-- Needs attention -->
        <section class="animate-fade-in-up delay-150 bg-card border-border rounded-2xl border p-6">
          <h2 class="text-foreground mb-4 text-sm font-semibold uppercase tracking-wider">{{ $t('teacher.dashboard.attentionTitle') }}</h2>
          <div v-if="attention.length === 0" class="flex items-center gap-3 rounded-xl bg-emerald-500/5 p-4">
            <Check class="h-5 w-5 shrink-0 text-emerald-500" />
            <p class="text-muted-foreground text-sm">{{ $t('teacher.dashboard.attentionAllGood') }}</p>
          </div>
          <div v-else class="space-y-2">
            <button
              v-for="a in attention"
              :key="a.key"
              class="hover:bg-secondary/60 flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors"
              @click="router.push(a.path)"
            >
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle class="h-4 w-4 text-amber-500" />
              </div>
              <p class="text-foreground flex-1 text-sm">{{ a.text }}</p>
              <ArrowRight class="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
            </button>
          </div>
        </section>

        <!-- Recent Activity -->
        <section class="animate-fade-in-up delay-200 bg-card border-border rounded-2xl border p-6">
          <h2 class="text-foreground mb-4 text-sm font-semibold uppercase tracking-wider">{{ $t('teacher.dashboard.recentActivity') }}</h2>

          <div v-if="recentActivity.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
            <Activity class="text-muted-foreground/40 mb-3 h-10 w-10" />
            <p class="text-muted-foreground text-sm">{{ $t('teacher.dashboard.noActivity') }}</p>
          </div>

          <div v-else class="space-y-4">
            <div v-for="activity in recentActivity" :key="activity.id" class="flex items-start gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="activity.bg">
                <component :is="activity.icon" class="h-4 w-4" :class="activity.color" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-foreground text-sm">{{ activity.text }}</p>
                <p class="text-muted-foreground text-xs">{{ activity.time }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  BookOpen, Users, FileText, GraduationCap, Plus,
  Languages, Clock, UserCheck, Activity,
  List, BarChart2, Copy, Check, ArrowRight, AlertTriangle,
} from '@/components/icons'
import TeacherStatRow from '@/components/teacher/TeacherStatRow.vue'
import type { TeacherStat } from '@/components/teacher/TeacherStatRow.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useTeacherClasses } from '@/composables/useTeacherClasses'
import { api } from '@/utils/api'
import type { Class } from '@/types/class'
import type { AssignmentData, TestData } from '@/types/content'

const router = useRouter()
const authStore = useAuthStore()
const { t, locale } = useI18n()
const { setTeacherClasses } = useTeacherClasses()

const userName = computed(() => {
  if (authStore.user?.name) return authStore.user.name
  if (authStore.user?.email) return authStore.user.email.split('@')[0]
  return 'Teacher'
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('dashboard.greeting.morning')
  if (h < 18) return t('dashboard.greeting.afternoon')
  return t('dashboard.greeting.evening')
})

const CLASS_EMOJIS = ['📚', '🎓', '🌟', '💡', '🔬', '🎨', '📖', '🏆']
const CLASS_COLORS = ['bg-primary/10', 'bg-chart-2/10', 'bg-chart-3/10', 'bg-chart-4/10', 'bg-chart-5/10', 'bg-chart-1/10']
const DASHBOARD_CLASSES = 6
const DASHBOARD_TESTS = 4
const DASHBOARD_ACTIVITY = 6
const COPIED_FLASH_MS = 1500

type DashboardClass = Class & { student_count: number }

const classList = ref<DashboardClass[]>([])
const allTests = ref<TestData[]>([])
const assignments = ref<AssignmentData[]>([])

const stats = computed<TeacherStat[]>(() => [
  { label: t('teacher.dashboard.stats.classes'), value: classList.value.length, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
  { label: t('teacher.dashboard.stats.students'), value: classList.value.reduce((sum, c) => sum + (c.student_count ?? 0), 0), icon: Users, color: 'text-chart-2', bg: 'bg-chart-2/10' },
  { label: t('teacher.dashboard.stats.tests'), value: allTests.value.length, icon: FileText, color: 'text-chart-1', bg: 'bg-chart-1/10' },
  { label: t('teacher.dashboard.stats.assignments'), value: assignments.value.length, icon: List, color: 'text-chart-3', bg: 'bg-chart-3/10' },
])

const quickActions = computed(() => [
  { label: t('teacher.dashboard.actions.newClass'), path: '/teacher/classes', icon: BookOpen, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: t('teacher.dashboard.actions.addLesson'), path: '/teacher/lessons', icon: GraduationCap, iconBg: 'bg-chart-2/10', iconColor: 'text-chart-2' },
  { label: t('teacher.dashboard.actions.buildTest'), path: '/teacher/tests/new', icon: FileText, iconBg: 'bg-chart-1/10', iconColor: 'text-chart-1' },
  { label: t('teacher.dashboard.actions.vocabulary'), path: '/teacher/vocabulary', icon: Languages, iconBg: 'bg-chart-3/10', iconColor: 'text-chart-3' },
  { label: t('teacher.dashboard.actions.students'), path: '/teacher/students', icon: UserCheck, iconBg: 'bg-chart-5/10', iconColor: 'text-chart-5' },
  { label: t('teacher.nav.analytics'), path: '/teacher/analytics', icon: BarChart2, iconBg: 'bg-chart-4/10', iconColor: 'text-chart-4' },
])

const recentClasses = computed(() =>
  classList.value.slice(0, DASHBOARD_CLASSES).map((c, i) => ({
    id: c.id,
    name: c.name,
    studentCount: c.student_count ?? 0,
    joinCode: c.class_code,
    emoji: CLASS_EMOJIS[i % CLASS_EMOJIS.length] ?? '📚',
    bgColor: CLASS_COLORS[i % CLASS_COLORS.length] ?? 'bg-chart-1/10',
  })),
)

const classNameFor = (classId: number | null) => {
  if (classId == null) return t('teacher.dashboard.allClasses')
  return classList.value.find((c) => c.id === classId)?.name ?? t('teacher.dashboard.allClasses')
}

// The latest tests, newest first, with the class each belongs to.
const upcomingTests = computed(() =>
  allTests.value.slice(0, DASHBOARD_TESTS).map((x) => ({
    id: x.id,
    title: x.title,
    class: classNameFor(x.class_id),
    questions: x.question_count ?? x.questions?.length ?? 0,
    duration: x.time_limit ?? 0,
    published: x.is_published,
    status: x.is_published ? t('classHub.published') : t('classHub.draft'),
  })),
)

// Things a teacher has probably forgotten: content students cannot see yet, classes nobody has joined.
const attention = computed(() => {
  const items: { key: string; text: string; path: string }[] = []
  const draftTests = allTests.value.filter((x) => !x.is_published).length
  if (draftTests) items.push({ key: 'tests', text: t('teacher.dashboard.attentionDraftTests', { n: draftTests }), path: '/teacher/tests' })
  const draftAssignments = assignments.value.filter((a) => !a.is_published).length
  if (draftAssignments) items.push({ key: 'assignments', text: t('teacher.dashboard.attentionDraftAssignments', { n: draftAssignments }), path: '/teacher/tests' })
  const emptyClasses = classList.value.filter((c) => (c.student_count ?? 0) === 0).length
  if (emptyClasses) items.push({ key: 'classes', text: t('teacher.dashboard.attentionEmptyClasses', { n: emptyClasses }), path: '/teacher/classes' })
  return items
})

const recentActivity = ref<{ id: number; text: string; time: string; icon: typeof Users; color: string; bg: string }[]>([])
const dashboardError = ref('')

// Copy a class's join code so it can be pasted straight to students.
const copiedId = ref<number | null>(null)
async function copyCode(cls: { id: number; joinCode: string }) {
  try {
    await navigator.clipboard.writeText(cls.joinCode)
    copiedId.value = cls.id
    setTimeout(() => { if (copiedId.value === cls.id) copiedId.value = null }, COPIED_FLASH_MS)
  } catch {
    /* clipboard blocked: the code is still visible on the card */
  }
}

onMounted(async () => {
  try {
    const [classes, assigns, tests] = await Promise.all([
      api.getClasses() as Promise<DashboardClass[]>,
      api.getAssignments().catch(() => [] as AssignmentData[]),
      api.getTests().catch(() => [] as TestData[]),
    ])
    classList.value = classes
    setTeacherClasses(classes)
    assignments.value = assigns
    allTests.value = tests
  } catch (e: any) {
    dashboardError.value = e?.errorMessage || e?.message || t('teacher.dashboard.loadFailed')
  }

  // Recent activity comes from the activity trail stored in the database.
  try {
    const feed = await api.getMyActivity()
    recentActivity.value = feed.slice(0, DASHBOARD_ACTIVITY).map((a) => ({
      id: a.id,
      text: a.class_name ? `${a.summary} · ${a.class_name}` : a.summary,
      time: new Date(a.created_at).toLocaleString(locale.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      icon: a.action.startsWith('class') ? BookOpen : a.action.startsWith('test') ? FileText : Activity,
      color: 'text-primary',
      bg: 'bg-primary/10',
    }))
  } catch {
    /* the feed is optional */
  }
})
</script>
