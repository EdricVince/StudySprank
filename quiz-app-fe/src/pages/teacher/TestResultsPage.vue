<template>
  <div class="p-6 lg:p-8">
    <TeacherPageHeader :title="test?.title ?? $t('teacher.testResults.testResults')" :subtitle="$t('teacher.testResults.subtitle')" :icon="Users" />

    <div v-if="loading" class="flex items-center justify-center py-20"><Loader2 class="text-primary h-8 w-8 animate-spin" /></div>

    <template v-else>
      <!-- Stats -->
      <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div class="bg-card border-border rounded-2xl border p-5">
          <p class="text-foreground text-2xl font-bold">{{ submissions.length }}</p>
          <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.testResults.stats.submissions') }}</p>
        </div>
        <div class="bg-card border-border rounded-2xl border p-5">
          <p class="text-foreground text-2xl font-bold">{{ avgPct }}%</p>
          <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.testResults.stats.avgScore') }}</p>
        </div>
        <div class="bg-card border-border rounded-2xl border p-5">
          <p class="text-foreground text-2xl font-bold">{{ test?.questions?.length ?? 0 }}</p>
          <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.testResults.stats.questions') }}</p>
        </div>
      </div>

      <!-- Submissions table -->
      <div v-if="submissions.length" class="bg-card border-border overflow-hidden rounded-2xl border">
        <table class="w-full text-sm">
          <thead class="bg-secondary">
            <tr>
              <th class="text-foreground px-5 py-3 text-left font-medium">{{ $t('teacher.testResults.table.student') }}</th>
              <th class="text-foreground px-5 py-3 text-left font-medium">{{ $t('teacher.testResults.table.score') }}</th>
              <th class="text-foreground px-5 py-3 text-left font-medium">{{ $t('teacher.testResults.percent') }}</th>
              <th class="text-foreground px-5 py-3 text-left font-medium">{{ $t('teacher.testResults.table.submitted') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in submissions" :key="s.id" class="border-border border-t">
              <td class="px-5 py-3">
                <p class="text-foreground font-medium">{{ s.student_name }}</p>
                <p class="text-muted-foreground text-xs">{{ s.student_email }}</p>
              </td>
              <td class="text-foreground px-5 py-3">{{ s.score }}/{{ s.total }}</td>
              <td class="px-5 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="pct(s) >= 50 ? 'bg-chart-2/10 text-chart-2' : 'bg-destructive/10 text-destructive'">{{ pct(s) }}%</span>
              </td>
              <td class="text-muted-foreground px-5 py-3">{{ new Date(s.submitted_at).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="bg-card border-border flex flex-col items-center justify-center rounded-2xl border p-12 text-center">
        <Users class="text-muted-foreground mb-3 h-10 w-10" />
        <p class="text-foreground font-medium">{{ $t('teacher.testResults.noSubmissions') }}</p>
        <p class="text-muted-foreground text-sm">{{ $t('teacher.testResults.noSubmissionsDesc') }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/utils/api'
import { useToast } from '@/composables/useToast'
import type { TestData, TestSubmissionData } from '@/types/content'
import { Users, Loader2Icon as Loader2 } from '@/components/icons'
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const testId = Number(route.params.id)

const test = ref<TestData | null>(null)
const submissions = ref<TestSubmissionData[]>([])
const loading = ref(true)

const pct = (s: TestSubmissionData) => (s.total ? Math.round((s.score / s.total) * 100) : 0)
const avgPct = computed(() => submissions.value.length ? Math.round(submissions.value.reduce((a, s) => a + pct(s), 0) / submissions.value.length) : 0)

onMounted(async () => {
  try {
    const [t, subs] = await Promise.all([api.getTest(testId), api.getTestSubmissions(testId)])
    test.value = t
    submissions.value = subs
  } catch (e) {
    toast.error(e instanceof ApiError ? e.errorMessage : t('teacher.testResults.loadFailed'))
    router.push('/teacher/tests')
  } finally {
    loading.value = false
  }
})
</script>
