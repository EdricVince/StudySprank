<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <TeacherPageHeader :title="$t('teacher.classes.title')" :subtitle="$t('teacher.classes.manageSubtitle')" :icon="BookOpen">
      <template #actions>
        <button
          class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm transition-colors"
          @click="openCreateModal"
        >
          <Plus class="h-4 w-4" />
          {{ $t('teacher.classes.createClass') }}
        </button>
      </template>
    </TeacherPageHeader>

    <!-- Stats -->
    <TeacherStatRow :stats="stats" />

    <!-- Search & Filter -->
    <div class="mb-6 flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('teacher.classes.searchPlaceholder')"
          class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div class="flex gap-2">
        <button
          v-for="f in filters"
          :key="f.value"
          class="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          :class="activeFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
          @click="activeFilter = f.value"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
    </div>

    <!-- Classes Grid -->
    <div v-else-if="filteredClasses.length > 0" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="cls in filteredClasses"
        :key="cls.id"
        class="bg-card border-border rounded-2xl border p-6 transition-all hover:shadow-md"
      >
        <!-- Card Header -->
        <div class="mb-4 flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl text-xl" :class="getClassBg(cls.id)">
              {{ getClassEmoji(cls.id) }}
            </div>
            <div>
              <h3 class="text-foreground font-semibold">{{ cls.name }}</h3>
              <p class="text-muted-foreground text-xs">{{ cls.subject || $t('teacher.classes.noSubject') }}</p>
            </div>
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-medium"
            :class="cls.is_active ? 'bg-chart-2/10 text-chart-2' : 'bg-secondary text-muted-foreground'"
          >
            {{ cls.is_active ? $t('teacher.classes.status.active') : $t('teacher.classes.status.inactive') }}
          </span>
        </div>

        <!-- Join Code -->
        <div class="bg-primary/5 border-primary/20 mb-4 flex items-center justify-between rounded-xl border px-4 py-3">
          <div>
            <p class="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wide">{{ $t('teacher.classes.joinCode') }}</p>
            <p class="text-primary font-mono text-2xl font-bold tracking-widest">{{ cls.class_code }}</p>
          </div>
          <button
            class="hover:bg-primary/10 rounded-lg p-2 transition-colors"
            :title="$t('teacher.classes.copyCode')"
            @click="copyCode(cls.class_code)"
          >
            <Check v-if="copiedCode === cls.class_code" class="text-primary h-5 w-5" />
            <Copy v-else class="text-muted-foreground h-5 w-5" />
          </button>
        </div>

        <!-- Mini Stats -->
        <div class="mb-4 grid grid-cols-2 gap-2 text-center">
          <div class="bg-secondary/50 rounded-lg p-2">
            <p class="text-foreground tabular-nums text-sm font-bold">{{ cls.student_count ?? 0 }}/{{ cls.student_limit }}</p>
            <p class="text-muted-foreground text-xs">{{ $t('teacher.classes.studentsLabel') }}</p>
          </div>
          <div class="bg-secondary/50 rounded-lg p-2">
            <p class="text-foreground text-sm font-bold">{{ cls.is_active ? $t('teacher.classes.status.active') : $t('teacher.classes.status.inactive') }}</p>
            <p class="text-muted-foreground text-xs">{{ $t('teacher.classes.statusLabel') }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
            @click="router.push(`/teacher/classes/${cls.id}`)"
          >
            {{ $t('teacher.classes.viewDetails') }}
          </button>
          <button
            class="bg-secondary hover:bg-secondary/80 rounded-xl p-2.5 transition-colors"
            @click="openEditModal(cls)"
          >
            <Pencil class="text-muted-foreground h-4 w-4" />
          </button>
          <button
            class="hover:bg-destructive/10 rounded-xl p-2.5 transition-colors"
            @click="confirmDelete(cls)"
          >
            <Trash2 class="text-destructive h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <div class="bg-secondary mb-4 flex h-20 w-20 items-center justify-center rounded-2xl">
        <BookOpen class="text-muted-foreground h-10 w-10" />
      </div>
      <h3 class="text-foreground mb-2 text-lg font-semibold">{{ $t('teacher.classes.noClassesYet') }}</h3>
      <p class="text-muted-foreground mb-6 max-w-sm text-sm">
        {{ $t('teacher.classes.noClassesDesc') }}
      </p>
      <button
        class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-colors"
        @click="openCreateModal"
      >
        <Plus class="h-4 w-4" />
        {{ $t('teacher.classes.createFirstClassBtn') }}
      </button>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false" />
          <div class="bg-card border-border relative z-10 w-full max-w-md rounded-2xl border shadow-xl">
            <div class="border-border flex items-center justify-between border-b p-6">
              <h3 class="text-foreground text-lg font-semibold">
                {{ editingClass ? $t('teacher.classes.modal.editTitle') : $t('teacher.classes.modal.createTitle') }}
              </h3>
              <button class="text-muted-foreground hover:text-foreground" @click="showModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="space-y-4 p-6">
              <div>
                <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.classes.modal.classNameLabel') }}</label>
                <input
                  v-model="form.name"
                  type="text"
                  :placeholder="$t('teacher.classes.modal.classNamePlaceholder')"
                  class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.classes.modal.subjectLabel') }}</label>
                <select
                  v-model="form.subject"
                  class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div>
                <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.classes.modal.descriptionLabel') }}</label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  :placeholder="$t('teacher.classes.modal.descriptionPlaceholder')"
                  class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.classes.modal.maxStudentsLabel') }}</label>
                <input
                  v-model.number="form.student_limit"
                  type="number" min="1" max="200"
                  class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <!-- Join Code Preview (create only) -->
              <div v-if="!editingClass" class="bg-primary/5 border-primary/20 rounded-xl border p-4">
                <p class="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">{{ $t('teacher.classes.joinCodeAutoGen') }}</p>
                <p class="text-primary font-mono text-2xl font-bold tracking-widest">{{ $t('teacher.classes.autoCode') }}</p>
                <p class="text-muted-foreground mt-1 text-xs">{{ $t('teacher.classes.joinCodeAutoGenDesc') }}</p>
              </div>
            </div>

            <div class="border-border flex gap-3 border-t p-6">
              <button
                class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-3 font-medium transition-colors"
                @click="showModal = false"
              >{{ $t('teacher.classes.modal.cancel') }}</button>
              <button
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
                :disabled="!form.name.trim() || saving"
                @click="saveClass"
              >
                {{ saving ? $t('teacher.classes.modal.saving') : (editingClass ? $t('teacher.classes.modal.saveChanges') : $t('teacher.classes.modal.createClass')) }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteModal = false" />
          <div class="bg-card border-border relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-xl">
            <div class="bg-destructive/10 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
              <Trash2 class="text-destructive h-6 w-6" />
            </div>
            <h3 class="text-foreground mb-2 font-semibold">{{ $t('teacher.classes.deleteModal.title') }}</h3>
            <p class="text-muted-foreground mb-6 text-sm">
              {{ $t('teacher.classes.deleteModal.message', { name: deletingClass?.name }) }}
            </p>
            <div class="flex gap-3">
              <button
                class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-2.5 font-medium transition-colors"
                @click="showDeleteModal = false"
              >{{ $t('teacher.classes.deleteModal.cancel') }}</button>
              <button
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 rounded-xl py-2.5 font-medium transition-colors"
                :disabled="deleting"
                @click="deleteClass"
              >{{ deleting ? $t('teacher.classes.deleteModal.deleting') : $t('teacher.classes.deleteModal.delete') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Plus, Search, BookOpen, Users, GraduationCap, FileText,
  Copy, Check, Pencil, Trash2, X,
} from '@/components/icons'
import { useToast } from '@/composables/useToast'
import { usePolling } from '@/composables/usePolling'
import { useTeacherClasses } from '@/composables/useTeacherClasses'
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.vue'
import TeacherStatRow from '@/components/teacher/TeacherStatRow.vue'
import { api } from '@/utils/api'
import type { Class } from '@/types/class'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const classes = ref<Class[]>([])

// Keep the sidebar's "My classes" shortcuts in step with what this page shows.
const { setTeacherClasses } = useTeacherClasses()
watch(classes, (list) => setTeacherClasses(list), { deep: true })
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const searchQuery = ref('')
const activeFilter = ref('all')
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingClass = ref<Class | null>(null)
const deletingClass = ref<Class | null>(null)
const copiedCode = ref('')

const subjects = ['English', 'IELTS', 'Chinese', 'Vietnamese', 'Other']
const filters = computed(() => [
  { value: 'all', label: t('teacher.classes.filters.all') },
  { value: 'active', label: t('teacher.classes.filters.active') },
  { value: 'inactive', label: t('teacher.classes.filters.inactive') },
])

const emojis = ['📚', '💼', '🎯', '🌸', '⭐', '🔥', '💡', '🎓', '🧠', '🌍']
const bgs = ['bg-chart-2/10', 'bg-chart-4/10', 'bg-chart-3/10', 'bg-chart-5/10', 'bg-chart-1/10']
const getClassEmoji = (id: number) => emojis[id % emojis.length]
const getClassBg = (id: number) => bgs[id % bgs.length]

const stats = computed(() => [
  { label: t('teacher.classes.stats.total'), value: classes.value.length, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
  { label: t('teacher.classes.stats.active'), value: classes.value.filter(c => c.is_active).length, icon: GraduationCap, color: 'text-chart-2', bg: 'bg-chart-2/10' },
  { label: t('teacher.classes.stats.students'), value: classes.value.reduce((s, c) => s + (c.student_count ?? 0), 0), icon: Users, color: 'text-chart-3', bg: 'bg-chart-3/10' },
  { label: t('teacher.classes.stats.classesFull'), value: classes.value.filter(c => (c.student_count ?? 0) >= c.student_limit).length, icon: FileText, color: 'text-chart-1', bg: 'bg-chart-1/10' },
])

const filteredClasses = computed(() => {
  let list = classes.value
  if (activeFilter.value === 'active') list = list.filter(c => c.is_active)
  if (activeFilter.value === 'inactive') list = list.filter(c => !c.is_active)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.name.toLowerCase().includes(q) || (c.subject ?? '').toLowerCase().includes(q))
  }
  return list
})

const form = ref({ name: '', subject: 'English', description: '', student_limit: 30 })

async function load() {
  try {
    classes.value = (await api.getClasses()) as Class[]
  } catch {
    toast.error(t('teacher.classes.toast.loadFailed'))
  } finally {
    loading.value = false
  }
}

// Live class list + student counts: refresh every 15s (skips while a modal is
// open so it doesn't disrupt editing).
usePolling(() => { if (!showModal.value) return load() }, 15000)

const openCreateModal = () => {
  editingClass.value = null
  form.value = { name: '', subject: 'English', description: '', student_limit: 30 }
  showModal.value = true
}

const openEditModal = (cls: Class) => {
  editingClass.value = cls
  form.value = {
    name: cls.name,
    subject: cls.subject ?? 'English',
    description: cls.description ?? '',
    student_limit: cls.student_limit,
  }
  showModal.value = true
}

const saveClass = async () => {
  if (!form.value.name.trim() || saving.value) return
  saving.value = true
  try {
    if (editingClass.value) {
      const updated = (await api.updateClass(editingClass.value.id, {
        name: form.value.name,
        subject: form.value.subject,
        description: form.value.description,
        student_limit: form.value.student_limit,
      })) as Class
      const idx = classes.value.findIndex(c => c.id === editingClass.value!.id)
      if (idx !== -1) classes.value[idx] = updated
      toast.success(t('teacher.classes.toast.updated'))
    } else {
      const created = (await api.createClass({
        name: form.value.name,
        subject: form.value.subject,
        description: form.value.description,
        student_limit: form.value.student_limit,
      })) as Class
      classes.value.unshift(created)
      toast.success(t('teacher.classes.toast.created'))
    }
    showModal.value = false
  } catch {
    toast.error(t('teacher.classes.toast.saveFailed'))
  } finally {
    saving.value = false
  }
}

const confirmDelete = (cls: Class) => {
  deletingClass.value = cls
  showDeleteModal.value = true
}

const deleteClass = async () => {
  if (!deletingClass.value || deleting.value) return
  deleting.value = true
  try {
    await api.deleteClass(deletingClass.value.id)
    classes.value = classes.value.filter(c => c.id !== deletingClass.value!.id)
    toast.success(t('teacher.classes.toast.deleted'))
    showDeleteModal.value = false
  } catch {
    toast.error(t('teacher.classes.toast.deleteFailed'))
  } finally {
    deleting.value = false
  }
}

const copyCode = (code: string) => {
  navigator.clipboard.writeText(code)
  copiedCode.value = code
  setTimeout(() => { copiedCode.value = '' }, 2000)
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
