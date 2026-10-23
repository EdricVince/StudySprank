<template>
  <div class="p-6 lg:p-8">

    <!-- Header -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-muted-foreground mb-1 text-sm font-medium">{{ greeting }}</p>
        <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ userName }}</h1>
      </div>
      <button
        class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-medium transition-colors sm:self-auto"
        @click="router.push('/teacher/classes')"
      >
        <Plus class="h-4 w-4" />
        {{ $t('teacher.dashboard.newClass') }}
      </button>
    </div>

    <!-- Dashboard error -->
    <div v-if="dashboardError" class="info-box info-box-red mb-6 flex items-center gap-3 text-sm text-red-400">
      <span>⚠</span> {{ dashboardError }}
      <button class="ml-auto text-red-400/50 hover:text-red-400" @click="dashboardError = ''">✕</button>
    </div>

    <!-- Stats -->
    <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-card border-border group rounded-2xl border p-5 transition-all hover:shadow-md"
      >
        <div class="mb-4 flex items-center justify-between">
          <span class="text-muted-foreground text-sm">{{ stat.label }}</span>
          <div class="rounded-xl p-2.5 transition-transform group-hover:scale-110" :class="stat.bg">
            <component :is="stat.icon" class="h-4 w-4" :class="stat.color" />
          </div>
        </div>
        <p class="text-foreground text-3xl font-bold tabular-nums">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid gap-6 lg:grid-cols-3">

      <!-- Quick Actions — 2-column grid -->
      <div class="bg-card border-border rounded-2xl border p-6">
        <h2 class="text-foreground mb-4 text-sm font-semibold uppercase tracking-wider">{{ $t('teacher.dashboard.quickActions') }}</h2>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="action in quickActions"
            :key="action.label"
            class="hover:bg-secondary/70 flex flex-col items-start gap-2.5 rounded-xl p-3 text-left transition-colors"
            @click="router.push(action.path)"
          >
            <div class="flex h-9 w-9 items-center justify-center rounded-xl" :class="action.iconBg">
              <component :is="action.icon" class="h-4 w-4" :class="action.iconColor" />
            </div>
            <div>
              <p class="text-foreground text-sm font-medium leading-tight">{{ action.label }}</p>
              <p class="text-muted-foreground mt-0.5 text-xs">{{ action.desc }}</p>
            </div>
          </button>
        </div>
      </div>

      <!-- Active Classes -->
      <div class="bg-card border-border rounded-2xl border p-6 lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-foreground text-sm font-semibold uppercase tracking-wider">{{ $t('teacher.dashboard.activeClasses') }}</h2>
          <button
            class="text-primary hover:text-primary/70 text-sm font-medium transition-colors"
            @click="router.push('/teacher/classes')"
          >
            {{ $t('teacher.dashboard.viewAll') }}
          </button>
        </div>

        <!-- Empty -->
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

        <!-- List -->
        <div v-else class="space-y-2">
          <div
            v-for="cls in recentClasses"
            :key="cls.id"
            class="hover:bg-secondary/50 flex cursor-pointer items-center gap-4 rounded-xl px-3 py-3 transition-colors"
            @click="router.push(`/teacher/classes/${cls.id}`)"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" :class="cls.bgColor">
              {{ cls.emoji }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-foreground font-medium">{{ cls.name }}</p>
              <p class="text-muted-foreground text-xs">{{ cls.studentCount }} {{ $t('teacher.dashboard.stats.students').toLowerCase() }} · {{ cls.lessonCount }} lessons</p>
            </div>
            <div class="bg-primary/5 border-primary/20 rounded-lg border px-3 py-1.5">
              <p class="text-primary font-mono text-sm font-bold tracking-wider">{{ cls.joinCode }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Assignments Section (read-only overview — created & managed on the Tests page) -->
    <div class="mt-6 bg-card border-border rounded-2xl border p-6">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-foreground text-sm font-semibold uppercase tracking-wider">{{ $t('teacher.dashboard.activeAssignments') }}</h2>
          <p class="text-muted-foreground mt-0.5 text-xs">{{ $t('teacher.dashboard.activeAssignmentsDesc') }}</p>
        </div>
        <button
          class="text-primary hover:text-primary/70 text-sm font-medium transition-colors"
          @click="router.push('/teacher/tests')"
        >
          {{ $t('teacher.dashboard.viewAll') }}
        </button>
      </div>

      <div v-if="assignments.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
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

      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="a in assignments"
          :key="a.id"
          class="bg-secondary/40 hover:bg-secondary/60 flex flex-col rounded-2xl p-4 text-left transition-colors"
          @click="router.push('/teacher/tests')"
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
    </div>

    <!-- Bottom Grid: Activity + Upcoming Tests -->
    <div class="mt-6 grid gap-6 lg:grid-cols-2">

      <!-- Recent Activity -->
      <div class="bg-card border-border rounded-2xl border p-6">
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
      </div>

      <!-- Upcoming Tests -->
      <div class="bg-card border-border rounded-2xl border p-6">
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
            class="text-primary hover:text-primary/70 mt-3 text-sm font-medium underline-offset-4 hover:underline transition-colors"
            @click="router.push('/teacher/tests')"
          >
            {{ $t('teacher.dashboard.createATest') }}
          </button>
        </div>

        <div v-else class="space-y-3">
          <div v-for="test in upcomingTests" :key="test.id" class="bg-secondary/40 rounded-xl p-4">
            <div class="mb-2 flex items-start justify-between gap-2">
              <p class="text-foreground text-sm font-medium">{{ test.title }}</p>
              <span class="bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
                {{ test.status }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <BookOpen class="h-3 w-3" /> {{ test.class }}
              </span>
              <span class="flex items-center gap-1">
                <FileText class="h-3 w-3" /> {{ $t('teacher.dashboard.questionsCount', { count: test.questions }) }}
              </span>
              <span class="flex items-center gap-1">
                <Clock class="h-3 w-3" /> {{ $t('teacher.dashboard.durationMin', { min: test.duration }) }}
              </span>
            </div>
          </div>
        </div>
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
  List,
} from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/utils/api'
import type { Class } from '@/types/class'
import type { AssignmentData } from '@/types/content'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

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

const statsValues = ref({ classes: 0, students: 0, tests: 0 })
const stats = computed(() => [
  { label: t('teacher.dashboard.stats.classes'), value: statsValues.value.classes, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
  { label: t('teacher.dashboard.stats.students'), value: statsValues.value.students, icon: Users, color: 'text-chart-2', bg: 'bg-chart-2/10' },
  { label: t('teacher.dashboard.stats.tests'), value: statsValues.value.tests, icon: FileText, color: 'text-chart-1', bg: 'bg-chart-1/10' },
])

const quickActions = computed(() => [
  { label: t('teacher.dashboard.actions.newClass'), desc: t('teacher.dashboard.actions.newClassDesc'), path: '/teacher/classes', icon: BookOpen, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: t('teacher.dashboard.actions.addLesson'), desc: t('teacher.dashboard.actions.addLessonDesc'), path: '/teacher/lessons', icon: GraduationCap, iconBg: 'bg-chart-2/10', iconColor: 'text-chart-2' },
  { label: t('teacher.dashboard.actions.buildTest'), desc: t('teacher.dashboard.actions.buildTestDesc'), path: '/teacher/tests', icon: FileText, iconBg: 'bg-chart-1/10', iconColor: 'text-chart-1' },
  { label: t('teacher.dashboard.actions.vocabulary'), desc: t('teacher.dashboard.actions.vocabularyDesc'), path: '/teacher/vocabulary', icon: Languages, iconBg: 'bg-chart-3/10', iconColor: 'text-chart-3' },
  { label: t('teacher.dashboard.actions.students'), desc: t('teacher.dashboard.actions.studentsDesc'), path: '/teacher/students', icon: UserCheck, iconBg: 'bg-chart-5/10', iconColor: 'text-chart-5' },
])

interface DashClass {
  id: number; name: string; studentCount: number; lessonCount: number; joinCode: string; emoji: string; bgColor: string
}
const recentClasses = ref<DashClass[]>([])
const recentActivity = ref<{ id: number; text: string; time: string; icon: typeof Users; color: string; bg: string }[]>([])
const upcomingTests = ref<{ id: number; title: string; class: string; questions: number; duration: number; status: string }[]>([])
const dashboardError = ref('')

// Assignments — a read-only overview; they are created & managed on the Tests page.
const assignments = ref<AssignmentData[]>([])

const classNameFor = (classId: number | null) => {
  if (classId == null) return t('teacher.dashboard.allClasses')
  return recentClasses.value.find(c => c.id === classId)?.name ?? t('teacher.dashboard.allClasses')
}

onMounted(async () => {
  try {
    const [classes, assigns] = await Promise.all([
      api.getClasses() as Promise<(Class & { student_count: number })[]>,
      api.getAssignments().catch(() => [] as AssignmentData[]),
    ])
    statsValues.value.classes = classes.length
    statsValues.value.students = classes.reduce((sum, c) => sum + (c.student_count ?? 0), 0)
    recentClasses.value = classes.slice(0, 5).map((c, i) => ({
      id: c.id,
      name: c.name,
      studentCount: c.student_count ?? 0,
      lessonCount: 0,
      joinCode: c.class_code,
      emoji: CLASS_EMOJIS[i % CLASS_EMOJIS.length] ?? '📚',
      bgColor: CLASS_COLORS[i % CLASS_COLORS.length] ?? 'bg-chart-1/10',
    }))
    assignments.value = assigns
  } catch (e: any) {
    dashboardError.value = e?.errorMessage || e?.message || 'Failed to load dashboard data.'
  }
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
