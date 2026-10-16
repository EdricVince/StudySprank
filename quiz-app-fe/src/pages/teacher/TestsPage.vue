<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ $t('teacher.tests.title') }}</h1>
        <p class="text-muted-foreground mt-2">{{ $t('teacher.tests.subtitle') }}</p>
      </div>
      <Button @click="$router.push('/teacher/tests/new')">
        <Plus class="mr-2 h-4 w-4" />
        {{ $t('teacher.tests.createTest') }}
      </Button>
    </div>

    <!-- Stats -->
    <div class="animate-fade-in-up delay-100 mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="bg-card border-border rounded-2xl border p-5">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-chart-4/10">
          <FileText class="text-chart-4 h-4 w-4" />
        </div>
        <p class="text-foreground text-2xl font-bold">{{ tests.length }}</p>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.tests.stats.total') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-chart-3/10">
          <HelpCircle class="text-chart-3 h-4 w-4" />
        </div>
        <p class="text-foreground text-2xl font-bold">{{ totalQuestions }}</p>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.tests.stats.questions') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-chart-1/10">
          <Users class="text-chart-1 h-4 w-4" />
        </div>
        <p class="text-foreground text-2xl font-bold">{{ totalSubmissions }}</p>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.tests.stats.submissions') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5">
        <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-chart-2/10">
          <BarChart2 class="text-chart-2 h-4 w-4" />
        </div>
        <p class="text-foreground text-2xl font-bold">{{ avgScore }}%</p>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.tests.stats.avgScore') }}</p>
      </div>
    </div>

    <!-- Tests List -->
    <div class="animate-fade-in-up delay-150 space-y-4">
      <div
        v-for="test in tests"
        :key="test.id"
        class="bg-card border-border rounded-2xl border p-6 transition-all hover:shadow-lg"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-start gap-4">
            <div class="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
              <FileText class="text-primary h-6 w-6" />
            </div>
            <div>
              <h3 class="text-foreground text-lg font-semibold">{{ test.title }}</h3>
              <p class="text-muted-foreground text-sm">{{ test.description }}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span class="bg-secondary text-foreground rounded-full px-2 py-0.5 text-xs">
                  {{ $t('teacher.tests.questionsCount', { n: test.question_count ?? test.questions?.length ?? 0 }) }}
                </span>
                <span v-if="test.time_limit" class="bg-secondary text-foreground rounded-full px-2 py-0.5 text-xs">
                  {{ $t('teacher.tests.minutesCount', { n: test.time_limit }) }}
                </span>
                <span class="bg-chart-1/10 text-chart-1 rounded-full px-2 py-0.5 text-xs">
                  {{ $t('teacher.tests.submissionsCount', { n: test.submission_count ?? 0 }) }}
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs"
                  :class="test.is_published ? 'bg-chart-2/10 text-chart-2' : 'bg-secondary text-muted-foreground'"
                >
                  {{ test.is_published ? $t('teacher.tests.status.active') : $t('teacher.tests.status.draft') }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button size="sm" :variant="test.is_published ? 'outline' : 'default'" @click="togglePublish(test)">
              {{ test.is_published ? $t('teacher.tests.unpublish') : $t('teacher.tests.publish') }}
            </Button>
            <Button variant="outline" size="sm" @click="$router.push(`/teacher/tests/${test.id}/results`)">
              <BarChart class="mr-2 h-4 w-4" />
              {{ $t('teacher.tests.results') }}
            </Button>
            <Button variant="outline" size="sm" @click="$router.push(`/teacher/tests/${test.id}/edit`)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" @click="deleteTest(test.id)">
              <Trash2 class="text-destructive h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>

      <!-- Empty State -->
      <div
        v-if="tests.length === 0"
        class="bg-card border-border flex flex-col items-center justify-center rounded-2xl border p-12"
      >
        <div class="bg-secondary mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <FileText class="text-muted-foreground h-8 w-8" />
        </div>
        <h3 class="text-foreground mb-2 font-medium">{{ $t('teacher.tests.noTestsYet') }}</h3>
        <p class="text-muted-foreground mb-4 text-sm">{{ $t('teacher.tests.createFirstTest') }}</p>
        <Button @click="$router.push('/teacher/tests/new')">
          <Plus class="mr-2 h-4 w-4" />
          {{ $t('teacher.tests.createTest') }}
        </Button>
      </div>
    </div>

    <!-- Document assignments (prompt/handout — created & managed here alongside tests) -->
    <div class="animate-fade-in-up delay-200 mt-10">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-foreground text-lg font-semibold">{{ $t('teacher.tests.assignments.title') }}</h2>
          <p class="text-muted-foreground text-sm">{{ $t('teacher.tests.assignments.subtitle') }}</p>
        </div>
        <Button variant="outline" @click="openAssignModal">
          <Plus class="mr-2 h-4 w-4" />
          {{ $t('teacher.tests.assignments.new') }}
        </Button>
      </div>

      <div v-if="assignments.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="a in assignments" :key="a.id" class="bg-card border-border flex flex-col rounded-2xl border p-5">
          <div class="mb-2 flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2.5">
              <div class="bg-chart-2/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <BookOpen class="text-chart-2 h-5 w-5" />
              </div>
              <div class="min-w-0">
                <p class="text-foreground truncate font-semibold">{{ a.title }}</p>
                <p class="text-muted-foreground text-xs">{{ classNameFor(a.class_id) }}</p>
              </div>
            </div>
            <button class="text-muted-foreground hover:text-destructive rounded-lg p-1 transition-colors" @click="removeAssignment(a.id)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          <p v-if="a.description" class="text-muted-foreground mb-3 line-clamp-2 text-sm">{{ a.description }}</p>
          <img v-if="a.attachment" :src="a.attachment" class="mb-3 max-h-32 w-full rounded-lg object-cover" :alt="a.attachment_name || a.title" />
          <div class="mt-auto flex items-center justify-between">
            <span class="rounded-md px-2 py-0.5 text-xs" :class="a.is_published ? 'bg-chart-2/10 text-chart-2' : 'bg-secondary text-muted-foreground'">
              {{ a.is_published ? $t('teacher.dashboard.publishedBadge') : $t('teacher.dashboard.draftBadge') }}
            </span>
            <button v-if="!a.is_published" class="text-primary hover:text-primary/70 text-xs font-medium transition-colors" @click="publishAssignment(a)">
              {{ $t('teacher.dashboard.publishNow') }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="bg-card border-border flex flex-col items-center justify-center rounded-2xl border p-10 text-center">
        <div class="bg-secondary mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
          <BookOpen class="text-muted-foreground h-7 w-7" />
        </div>
        <p class="text-foreground mb-1 font-medium">{{ $t('teacher.tests.assignments.empty') }}</p>
        <p class="text-muted-foreground text-sm">{{ $t('teacher.tests.assignments.emptyDesc') }}</p>
      </div>
    </div>

    <!-- Create Assignment Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showAssignModal = false" />
          <div class="bg-card border-border relative z-10 w-full max-w-md rounded-2xl border shadow-xl">
            <div class="border-border flex items-center justify-between border-b p-6">
              <h3 class="text-foreground text-lg font-semibold">{{ $t('teacher.dashboard.assignModal.title') }}</h3>
              <button class="text-muted-foreground hover:text-foreground" @click="showAssignModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              <p class="text-muted-foreground text-sm">{{ $t('teacher.dashboard.assignModal.documentDesc') }}</p>

              <div v-if="assignError" class="info-box info-box-red flex items-center gap-2 text-sm text-red-400">
                <span>⚠</span> {{ assignError }}
              </div>

              <div>
                <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.dashboard.assignModal.titleLabel') }}</label>
                <input
v-model="newAssign.title" type="text" :placeholder="$t('teacher.dashboard.assignModal.titlePlaceholder')"
                  class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.dashboard.assignModal.descriptionLabel') }}</label>
                <textarea
v-model="newAssign.description" rows="4" :placeholder="$t('teacher.dashboard.assignModal.descriptionPlaceholder')"
                  class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-y rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"></textarea>
              </div>
              <div>
                <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.dashboard.assignModal.attachment') }}</label>
                <div v-if="newAssign.attachment" class="relative">
                  <img :src="newAssign.attachment" class="max-h-48 w-full rounded-xl object-contain" :alt="newAssign.attachment_name" />
                  <button type="button" class="bg-background/80 text-foreground hover:bg-background absolute right-2 top-2 rounded-lg p-1.5 shadow" @click="clearAttachment">
                    <X class="h-4 w-4" />
                  </button>
                </div>
                <label v-else class="border-border hover:border-primary/60 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors">
                  <List class="text-muted-foreground h-6 w-6" />
                  <span class="text-muted-foreground text-xs">{{ $t('teacher.dashboard.assignModal.attachmentHint') }}</span>
                  <input type="file" accept="image/*" class="hidden" @change="onAttachmentPick" />
                </label>
              </div>
              <div>
                <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.dashboard.assignModal.assignToClass') }}</label>
                <select v-model="newAssign.classId" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">{{ $t('teacher.dashboard.allClasses') }}</option>
                  <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
                </select>
              </div>
              <label class="flex cursor-pointer items-center gap-2.5">
                <input v-model="newAssign.isPublished" type="checkbox" class="accent-primary h-4 w-4 rounded" />
                <span class="text-foreground text-sm">{{ $t('teacher.dashboard.assignModal.publish') }}</span>
              </label>
            </div>
            <div class="border-border flex gap-3 border-t p-6">
              <button class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-3 font-medium transition-colors" @click="showAssignModal = false">{{ $t('teacher.dashboard.assignModal.cancel') }}</button>
              <button class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-3 font-medium transition-colors disabled:opacity-50" :disabled="!newAssign.title.trim() || assignSaving" @click="createAssignment">
                {{ assignSaving ? $t('teacher.dashboard.assignModal.creating') : $t('teacher.dashboard.assignModal.create') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, FileText, BarChart, Pencil, Trash2, HelpCircle, Users, BarChart2, BookOpen, List, X } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import { useToast } from '@/composables/useToast'
import { api, ApiError } from '@/utils/api'
import type { TestData, AssignmentData } from '@/types/content'
import type { Class } from '@/types/class'

const { t } = useI18n()
const toast = useToast()
const tests = ref<TestData[]>([])
const loading = ref(true)

// Document assignments — created & managed here so tests + handouts live together.
const assignments = ref<AssignmentData[]>([])
const classes = ref<(Class & { student_count?: number })[]>([])
const showAssignModal = ref(false)
const assignSaving = ref(false)
const assignError = ref('')
const newAssign = ref({
  title: '', description: '', attachment: '' as string, attachment_name: '' as string,
  classId: '' as number | '', isPublished: true,
})

const classNameFor = (classId: number | null) => {
  if (classId == null) return t('teacher.dashboard.allClasses')
  return classes.value.find(c => c.id === classId)?.name ?? t('teacher.dashboard.allClasses')
}

const openAssignModal = () => {
  newAssign.value = { title: '', description: '', attachment: '', attachment_name: '', classId: '', isPublished: true }
  assignError.value = ''
  showAssignModal.value = true
}

const onAttachmentPick = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  // Keep attachments small so the base64 payload stays reasonable (~2MB cap).
  if (file.size > 2 * 1024 * 1024) {
    assignError.value = t('teacher.dashboard.assignModal.imageTooLarge')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    newAssign.value.attachment = reader.result as string
    newAssign.value.attachment_name = file.name
    assignError.value = ''
  }
  reader.readAsDataURL(file)
}

const clearAttachment = () => {
  newAssign.value.attachment = ''
  newAssign.value.attachment_name = ''
}

const createAssignment = async () => {
  if (!newAssign.value.title.trim() || assignSaving.value) return
  assignSaving.value = true
  assignError.value = ''
  try {
    const created = await api.createAssignment({
      title: newAssign.value.title.trim(),
      description: newAssign.value.description.trim() || undefined,
      attachment: newAssign.value.attachment || undefined,
      attachment_name: newAssign.value.attachment_name || undefined,
      class_id: newAssign.value.classId === '' ? undefined : Number(newAssign.value.classId),
      is_published: newAssign.value.isPublished,
    })
    assignments.value.unshift(created)
    showAssignModal.value = false
  } catch (e) {
    assignError.value = errMsg(e, t('teacher.dashboard.assignModal.createFailed'))
  } finally {
    assignSaving.value = false
  }
}

const publishAssignment = async (a: AssignmentData) => {
  try {
    const updated = await api.updateAssignment(a.id, { is_published: true })
    const i = assignments.value.findIndex(x => x.id === a.id)
    if (i !== -1) assignments.value[i] = updated
  } catch (e) { toast.error(errMsg(e, t('teacher.tests.toast.assignPublishFailed'))) }
}

const removeAssignment = async (id: number) => {
  const prev = assignments.value
  assignments.value = assignments.value.filter(a => a.id !== id)
  try {
    await api.deleteAssignment(id)
  } catch (e) {
    assignments.value = prev
    toast.error(errMsg(e, t('teacher.tests.toast.assignDeleteFailed')))
  }
}

const totalQuestions = computed(() => tests.value.reduce((s, t) => s + (t.question_count ?? t.questions?.length ?? 0), 0))
const totalSubmissions = computed(() => tests.value.reduce((s, t) => s + (t.submission_count ?? 0), 0))
const avgScore = computed(() => {
  const withSubs = tests.value.filter(t => (t.submission_count ?? 0) > 0)
  return withSubs.length ? Math.round(withSubs.reduce((s, t) => s + (t.avg_score ?? 0), 0) / withSubs.length) : 0
})

const errMsg = (e: unknown, fb: string) => (e instanceof ApiError ? e.errorMessage : fb)

const load = async () => {
  loading.value = true
  try {
    const [ts, asg, cls] = await Promise.all([
      api.getTests(),
      api.getAssignments().catch(() => [] as AssignmentData[]),
      api.getClasses().catch(() => [] as (Class & { student_count?: number })[]),
    ])
    tests.value = ts
    assignments.value = asg
    classes.value = cls as (Class & { student_count?: number })[]
  } catch (e) {
    toast.error(errMsg(e, t('teacher.tests.toast.loadFailed')))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const togglePublish = async (test: TestData) => {
  try {
    const u = await api.updateTest(test.id, { is_published: !test.is_published })
    test.is_published = u.is_published
    toast.success(u.is_published ? t('teacher.tests.toast.published') : t('teacher.tests.toast.unpublished'))
  } catch (e) { toast.error(errMsg(e, t('teacher.tests.toast.updateFailed'))) }
}

const deleteTest = async (id: number) => {
  try {
    await api.deleteTest(id)
    tests.value = tests.value.filter(t => t.id !== id)
    toast.success(t('teacher.tests.toast.deleted'))
  } catch (e) { toast.error(errMsg(e, t('teacher.tests.toast.deleteFailed'))) }
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.98); }
</style>
