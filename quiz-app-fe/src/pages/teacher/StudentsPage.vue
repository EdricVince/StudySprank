<template>
  <div class="p-6 lg:p-8">

    <!-- Header -->
    <TeacherPageHeader :title="$t('teacher.students.title')" :subtitle="$t('teacher.students.pageSubtitle')" :icon="Users">
      <template #actions>
        <button
          class="border-border bg-card hover:bg-accent flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
          @click="exportCSV"
        >
          <Download class="h-4 w-4" />
          {{ $t('teacher.students.export') }}
        </button>
      </template>
    </TeacherPageHeader>

    <!-- Stats -->
    <TeacherStatRow :stats="statsCards" />

    <!-- Filters -->
    <div class="mb-5 flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('teacher.students.searchPlaceholder')"
          class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <select
        v-model="selectedClass"
        class="border-border bg-background text-foreground rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">{{ $t('teacher.students.filters.allClasses') }}</option>
        <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
      </select>
      <select
        v-model="sortBy"
        class="border-border bg-background text-foreground rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="name">{{ $t('teacher.students.sortName') }}</option>
        <option value="joined">{{ $t('teacher.students.sortRecentlyJoined') }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
    </div>

    <!-- Student Grid -->
    <div v-else class="grid gap-3">
      <div
        v-for="student in sortedStudents"
        :key="student.student_id"
        class="bg-card border-border hover:border-primary/30 hover:shadow-md cursor-pointer rounded-2xl border p-4 transition-all"
        :class="selectedStudent?.student_id === student.student_id ? 'border-primary/50 ring-1 ring-primary/20' : ''"
        @click="openStudent(student)"
      >
        <div class="flex items-center gap-4">
          <!-- Avatar -->
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
            :style="{ backgroundColor: avatarColor(student.student_id) }"
          >
            {{ getInitials(student.name) }}
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <p class="text-foreground truncate font-semibold">{{ student.name }}</p>
            <p class="text-muted-foreground truncate text-xs">{{ student.email }}</p>
          </div>

          <!-- Joined -->
          <div class="hidden text-right sm:block">
            <p class="text-foreground text-sm font-medium">{{ formatJoined(student.joined_at) }}</p>
            <p class="text-muted-foreground text-xs">{{ $t('teacher.students.joinedSmall') }}</p>
          </div>

          <!-- Classes + Arrow -->
          <div class="flex shrink-0 items-center gap-3">
            <div class="hidden flex-wrap gap-1 lg:flex">
              <span
                v-for="cls in student.classes.slice(0,2)"
                :key="cls"
                class="bg-secondary text-muted-foreground rounded-md px-2 py-0.5 text-xs"
              >{{ cls }}</span>
              <span v-if="student.classes.length > 2" class="bg-secondary text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                +{{ student.classes.length - 2 }}
              </span>
            </div>
            <ChevronRight class="text-muted-foreground h-4 w-4" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="sortedStudents.length === 0" class="bg-card border-border flex flex-col items-center justify-center rounded-2xl border py-16 text-center">
        <div class="bg-secondary mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <Users class="text-muted-foreground h-7 w-7" />
        </div>
        <p class="text-foreground mb-1 font-medium">{{ $t('teacher.students.noStudentsFound') }}</p>
        <p class="text-muted-foreground text-sm">{{ searchQuery ? $t('teacher.students.tryDifferentSearch') : $t('teacher.students.noStudentsDesc') }}</p>
      </div>
    </div>

    <!-- Student Detail Side Panel -->
    <Teleport to="body">
      <Transition name="slide-panel">
        <div v-if="selectedStudent" class="fixed inset-0 z-50 flex justify-end">
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="selectedStudent = null" />
          <div class="bg-card border-border relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l shadow-2xl">

            <!-- Panel Header -->
            <div class="border-border flex items-center justify-between border-b px-6 py-5">
              <h2 class="text-foreground font-semibold">{{ $t('teacher.students.studentProfile') }}</h2>
              <button class="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg p-1.5 transition-colors" @click="selectedStudent = null">
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Avatar + Identity -->
            <div class="px-6 py-6">
              <div class="mb-6 flex items-center gap-4">
                <div
                  class="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-md"
                  :style="{ backgroundColor: avatarColor(selectedStudent.student_id) }"
                >
                  {{ getInitials(selectedStudent.name) }}
                </div>
                <div>
                  <h3 class="text-foreground text-lg font-bold">{{ selectedStudent.name }}</h3>
                  <p class="text-muted-foreground text-sm">{{ selectedStudent.email }}</p>
                </div>
              </div>

              <!-- Classes -->
              <div class="mb-5">
                <h4 class="text-foreground mb-3 text-sm font-semibold">{{ $t('teacher.students.enrolledClasses') }}</h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="cls in selectedStudent.classes"
                    :key="cls"
                    class="bg-primary/10 text-primary rounded-lg px-3 py-1.5 text-sm font-medium"
                  >{{ cls }}</span>
                </div>
              </div>

              <!-- Joined -->
              <div class="bg-secondary/40 rounded-xl p-4">
                <span class="text-muted-foreground text-xs">{{ $t('teacher.students.joinedLabel') }}</span>
                <p class="text-foreground mt-0.5 text-sm font-semibold">{{ formatJoined(selectedStudent.joined_at) }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Users, BookOpen, CheckSquare, ChevronRight, Download, X } from '@/components/icons'
import { api } from '@/utils/api'
import { usePolling } from '@/composables/usePolling'
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.vue'
import TeacherStatRow from '@/components/teacher/TeacherStatRow.vue'
import type { Class, ClassStudent } from '@/types/class'

const { t } = useI18n()

const searchQuery = ref('')
const selectedClass = ref('')
const sortBy = ref('name')
const loading = ref(true)

interface StudentRow {
  id: number; student_id: number; name: string; email: string
  classes: string[]; joined_at: string
}

const classes = ref<Class[]>([])
const students = ref<StudentRow[]>([])
const selectedStudent = ref<StudentRow | null>(null)

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length] ?? '#6366f1'

const statsCards = computed(() => [
  { label: t('teacher.students.stats.total'), value: students.value.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10', sub: t('teacher.students.acrossClasses', { n: classes.value.length }) },
  { label: t('teacher.students.activeClasses'), value: classes.value.length, icon: BookOpen, color: 'text-chart-2', bg: 'bg-chart-2/10', sub: t('teacher.students.classesYouTeach') },
  { label: t('teacher.students.multiClass'), value: students.value.filter(s => s.classes.length > 1).length, icon: CheckSquare, color: 'text-chart-3', bg: 'bg-chart-3/10', sub: t('teacher.students.stats.multiClassDesc') },
])

const filteredStudents = computed(() => {
  let result = students.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
  }
  if (selectedClass.value) {
    const cls = classes.value.find(c => c.id === Number(selectedClass.value))
    if (cls) result = result.filter(s => s.classes.includes(cls.name))
  }
  return result
})

const sortedStudents = computed(() => {
  const arr = [...filteredStudents.value]
  switch (sortBy.value) {
    case 'joined': return arr.sort((a,b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
    default: return arr.sort((a,b) => a.name.localeCompare(b.name))
  }
})

function openStudent(s: StudentRow) {
  selectedStudent.value = selectedStudent.value?.student_id === s.student_id ? null : s
}

const formatJoined = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const getInitials = (name: string) =>
  name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

const exportCSV = () => {
  const rows = [['Name','Email','Classes','Joined']]
  students.value.forEach(s => rows.push([s.name, s.email, s.classes.join('|'), formatJoined(s.joined_at)]))
  const csv = rows.map(r => r.join(',')).join('\n')
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
  a.download = 'students.csv'; a.click()
}

async function load() {
  try {
    const cls = (await api.getClasses()) as Class[]
    classes.value = cls
    const perClass = await Promise.all(
      cls.map(c => api.getClassStudents(c.id).then(s => ({ className: c.name, students: s as ClassStudent[] })))
    )
    const map = new Map<number, StudentRow>()
    for (const { className, students: studs } of perClass) {
      for (const s of studs) {
        if (map.has(s.student_id)) {
          map.get(s.student_id)!.classes.push(className)
        } else {
          map.set(s.student_id, {
            id: s.id, student_id: s.student_id,
            name: s.student_name || s.student_email,
            email: s.student_email,
            classes: [className],
            joined_at: s.joined_at,
          })
        }
      }
    }
    students.value = Array.from(map.values())
  } catch {
    // keep empty
  } finally {
    loading.value = false
  }
}

// Live roster: refresh every 15s so new joins / removals appear without reload.
usePolling(load, 15000)
</script>

<style scoped>
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-panel-enter-from .slide-panel-leave-to {
  opacity: 0;
}
.slide-panel-enter-from > div:last-child,
.slide-panel-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
