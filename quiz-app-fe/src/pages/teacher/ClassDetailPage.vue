<template>
  <div class="p-6 lg:p-8">
    <!-- Back -->
    <button
      class="group mb-6 flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
      @click="router.push('/teacher/classes')"
    >
      <svg class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      {{ $t('teacher.nav.classes') }}
    </button>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
    </div>

    <template v-else-if="classData">
      <!-- Header -->
      <div class="animate-fade-in-down mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div class="mb-2 flex items-center gap-3">
            <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ classData.name }}</h1>
            <span
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="classData.is_active ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'"
            >{{ classData.is_active ? $t('teacher.classDetail.active') : $t('teacher.classDetail.inactive') }}</span>
          </div>
          <p class="text-muted-foreground">{{ classData.description || $t('teacher.classDetail.noDescription') }}</p>
        </div>

        <!-- Class Code Card -->
        <div class="bg-card border-border rounded-xl border p-4 text-center lg:min-w-40">
          <p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">{{ $t('teacher.classDetail.joinCode') }}</p>
          <p class="text-foreground font-mono text-2xl font-bold tracking-widest">{{ classData.class_code }}</p>
          <button
            class="text-primary hover:text-primary/80 mt-2 flex items-center justify-center gap-1 text-sm w-full"
            @click="copyCode"
          >
            <Copy class="h-4 w-4" />
            {{ $t('teacher.classDetail.copyCode') }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="animate-fade-in-up delay-100 mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div class="bg-card border-border rounded-2xl border p-5">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-chart-1/10">
            <Users class="text-chart-1 h-4 w-4" />
          </div>
          <p class="text-foreground tabular-nums text-2xl font-bold">{{ students.length }}/{{ classData.student_limit }}</p>
          <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.classDetail.stats.students') }}</p>
        </div>
        <div class="bg-card border-border rounded-2xl border p-5">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-chart-3/10">
            <BookOpen class="text-chart-3 h-4 w-4" />
          </div>
          <p class="text-foreground tabular-nums text-2xl font-bold">{{ classData.subject || '—' }}</p>
          <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.classDetail.stats.subject') }}</p>
        </div>
        <div class="bg-card border-border rounded-2xl border p-5">
          <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-chart-4/10">
            <GraduationCap class="text-chart-4 h-4 w-4" />
          </div>
          <p class="text-foreground tabular-nums text-2xl font-bold">{{ classData.student_limit }}</p>
          <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.classDetail.stats.maxStudents') }}</p>
        </div>
      </div>

      <!-- Tab: Students -->
      <div class="animate-fade-in-up delay-200 bg-card border-border rounded-2xl border">
        <div class="border-border border-b p-4">
          <h2 class="text-foreground font-semibold">{{ $t('teacher.classDetail.studentsCount', { count: students.length }) }}</h2>
        </div>
        <div class="divide-border divide-y">
          <div v-for="student in students" :key="student.id" class="flex items-center gap-4 p-4">
            <div class="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <span class="text-primary font-medium">{{ getInitials(student.student_name || student.student_email) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-foreground font-medium truncate">{{ student.student_name || student.student_email }}</p>
              <p class="text-muted-foreground text-sm">{{ student.student_email }} · {{ $t('teacher.classDetail.joinedOn', { date: formatDate(student.joined_at) }) }}</p>
            </div>
            <button
              class="hover:bg-destructive/10 rounded-lg p-2 transition-colors"
              @click="handleRemoveStudent(student)"
            >
              <UserMinus class="text-destructive h-4 w-4" />
            </button>
          </div>
          <div v-if="students.length === 0" class="p-10 text-center">
            <Users class="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p class="text-muted-foreground text-sm">{{ $t('teacher.classDetail.noStudents') }}</p>
            <p class="text-muted-foreground mt-1 text-xs">{{ $t('teacher.classDetail.noStudentsShare', { code: classData.class_code }) }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Class not found -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <p class="text-muted-foreground">{{ $t('teacher.classDetail.classNotFound') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Copy, UserMinus, Users, BookOpen, GraduationCap } from '@/components/icons'
import { useToast } from '@/composables/useToast'
import { api } from '@/utils/api'
import type { Class, ClassStudent } from '@/types/class'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const classId = Number(route.params.id)
const loading = ref(true)
const classData = ref<Class | null>(null)
const students = ref<ClassStudent[]>([])

onMounted(async () => {
  try {
    const [cls, studs] = await Promise.all([
      api.getClass(classId) as Promise<Class>,
      api.getClassStudents(classId) as Promise<ClassStudent[]>,
    ])
    classData.value = cls
    students.value = studs
  } catch {
    toast.error(t('teacher.classDetail.toast.loadFailed'))
  } finally {
    loading.value = false
  }
})

const copyCode = () => {
  if (!classData.value) return
  navigator.clipboard.writeText(classData.value.class_code)
  toast.success(t('teacher.classDetail.toast.codeCopied'))
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const handleRemoveStudent = async (student: ClassStudent) => {
  try {
    await api.removeStudent(classId, student.student_id)
    students.value = students.value.filter(s => s.id !== student.id)
    toast.success(t('teacher.classDetail.toast.studentRemoved'))
  } catch {
    toast.error(t('teacher.classDetail.toast.removeFailed'))
  }
}
</script>
