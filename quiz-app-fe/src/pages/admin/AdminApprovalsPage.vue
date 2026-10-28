<template>
  <div class="adm-page space-y-5 p-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="adm-h1">{{ $t('staff.approvals.title') }}</h2>
        <p class="adm-text mt-0.5">{{ $t('staff.approvals.subtitle') }}</p>
      </div>
      <button class="adm-btn-ghost" :disabled="loading" @click="load">{{ $t('staff.refresh') }}</button>
    </div>

    <!-- Status tabs -->
    <div class="adm-tabs w-fit">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="adm-tab"
        :class="{ 'adm-tab-on': filter === tab.value }"
        @click="filter = tab.value"
      >
        {{ tab.label }}
        <span class="ml-1 text-[10px] opacity-60">({{ tab.count }})</span>
      </button>
    </div>

    <div v-if="message" class="adm-alert" :class="messageOk ? 'adm-alert-success' : 'adm-alert-error'" role="status">
      {{ message }}
    </div>

    <!-- List -->
    <div v-if="loading && !teachers.length" class="space-y-3">
      <div v-for="i in 3" :key="i" class="adm-card h-28 animate-pulse" />
    </div>
    <p v-else-if="loadFailed" class="text-sm text-red-500">{{ $t('staff.approvals.loadFailed') }}</p>
    <div v-else-if="!visible.length" class="adm-card p-10 text-center">
      <p class="adm-text">{{ $t('staff.approvals.empty') }}</p>
    </div>
    <ul v-else class="space-y-3">
      <li v-for="tc in visible" :key="tc.id" class="adm-card p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="adm-h3 truncate">{{ tc.name || tc.email }}</h3>
              <span class="adm-badge" :class="statusClass(tc.teacher_status)">{{ $t(`staff.status.${tc.teacher_status}`) }}</span>
              <span v-if="!tc.is_active" class="adm-badge adm-badge-inactive">{{ $t('staff.status.inactive') }}</span>
            </div>
            <p class="adm-text truncate">{{ tc.email }}</p>
            <p class="adm-meta mt-1">
              {{ $t('staff.approvals.organization') }}:
              <span class="text-foreground font-medium">{{ tc.teacher_organization || '—' }}</span>
              · {{ $t('staff.approvals.applied', { date: formatDate(tc.created_at) }) }}
              <template v-if="tc.teacher_reviewed_at"> · {{ $t('staff.approvals.reviewed', { date: formatDate(tc.teacher_reviewed_at) }) }}</template>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button class="adm-btn-ghost" @click="openDocument(tc)">{{ $t('staff.approvals.viewDocument') }}</button>
            <button
              v-if="tc.teacher_status !== 'approved'"
              class="adm-btn-primary"
              :disabled="busyId === tc.id"
              @click="review(tc, 'approved')"
            >{{ $t('staff.approvals.approve') }}</button>
            <button
              v-if="tc.teacher_status !== 'rejected'"
              class="adm-btn-danger"
              :disabled="busyId === tc.id"
              @click="askReject(tc)"
            >{{ $t('staff.approvals.reject') }}</button>
            <button
              v-if="tc.teacher_status === 'approved' || tc.teacher_status === 'rejected'"
              class="adm-btn-ghost"
              :disabled="busyId === tc.id"
              @click="review(tc, 'pending')"
            >{{ $t('staff.approvals.reopen') }}</button>
          </div>
        </div>

        <!-- What this teacher has created so far -->
        <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div v-for="s in countsOf(tc)" :key="s.label" class="bg-muted/40 rounded-lg px-3 py-2">
            <div class="text-foreground text-lg font-bold leading-none">{{ s.value }}</div>
            <div class="adm-meta mt-1">{{ s.label }}</div>
          </div>
        </div>
      </li>
    </ul>

    <!-- Document viewer -->
    <Teleport to="body">
      <div v-if="doc.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" @click.self="doc.open = false">
        <div class="bg-card max-h-full w-full max-w-2xl overflow-auto rounded-2xl p-4 shadow-xl">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="adm-h3">{{ doc.title }}</h3>
            <button class="adm-icon-btn adm-icon-btn-close" :aria-label="$t('common.close')" @click="doc.open = false">✕</button>
          </div>
          <p v-if="doc.loading" class="adm-text">{{ $t('common.loading') }}</p>
          <img v-else-if="doc.image" :src="doc.image" alt="" class="mx-auto max-h-[70vh] rounded-lg" />
          <p v-else class="adm-text">{{ $t('staff.approvals.noDocument') }}</p>
        </div>
      </div>
    </Teleport>

    <!-- Reject dialog -->
    <Teleport to="body">
      <div v-if="rejecting" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="rejecting = null">
        <div class="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl">
          <h3 class="adm-h3">{{ $t('staff.approvals.rejectTitle', { name: rejecting.name || rejecting.email }) }}</h3>
          <label class="adm-form-label mt-4 block" for="reject-reason">{{ $t('staff.approvals.reasonLabel') }}</label>
          <textarea
            id="reject-reason"
            v-model.trim="reason"
            rows="4"
            maxlength="500"
            class="adm-input mt-1 w-full"
            :placeholder="$t('staff.approvals.reasonPlaceholder')"
          />
          <div class="mt-4 flex justify-end gap-2">
            <button class="adm-btn-ghost" @click="rejecting = null">{{ $t('common.cancel') }}</button>
            <button class="adm-btn-danger" :disabled="!reason || busyId === rejecting.id" @click="confirmReject">
              {{ $t('staff.approvals.confirmReject') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore, type TeacherOverviewRow } from '@/stores/admin.store'
import { errorText } from '@/utils/skills'

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

const { t, locale } = useI18n()
const adminStore = useAdminStore()

const loading = ref(false)
const loadFailed = ref(false)
const filter = ref<Filter>('pending')
const busyId = ref<number | null>(null)
const message = ref('')
const messageOk = ref(true)
const rejecting = ref<TeacherOverviewRow | null>(null)
const reason = ref('')
const doc = reactive({ open: false, loading: false, image: '', title: '' })

const teachers = computed(() => adminStore.teacherOverview)
const count = (s: Filter) => (s === 'all' ? teachers.value.length : teachers.value.filter((x) => x.teacher_status === s).length)
const tabs = computed(() =>
  (['pending', 'approved', 'rejected', 'all'] as Filter[]).map((value) => ({
    value,
    label: t(`staff.approvals.tabs.${value}`),
    count: count(value),
  })),
)
const visible = computed(() =>
  filter.value === 'all' ? teachers.value : teachers.value.filter((x) => x.teacher_status === filter.value),
)

const statusClass = (s: string) =>
  s === 'approved' ? 'adm-badge-active' : s === 'rejected' ? 'adm-badge-error' : 'adm-badge-warning'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })

const countsOf = (tc: TeacherOverviewRow) => [
  { label: t('staff.approvals.stats.classes'), value: tc.classes },
  { label: t('staff.approvals.stats.students'), value: tc.students },
  { label: t('staff.approvals.stats.tests'), value: tc.tests },
  { label: t('staff.approvals.stats.assignments'), value: tc.assignments },
  { label: t('staff.approvals.stats.lessons'), value: tc.lessons },
]

function notify(text: string, ok: boolean) {
  message.value = text
  messageOk.value = ok
}

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    await adminStore.fetchTeacherOverview()
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

async function openDocument(tc: TeacherOverviewRow) {
  Object.assign(doc, { open: true, loading: true, image: '', title: tc.name || tc.email })
  try {
    doc.image = (await adminStore.getTeacherCard(tc.id)) ?? ''
  } catch {
    doc.image = ''
  } finally {
    doc.loading = false
  }
}

async function review(tc: TeacherOverviewRow, status: 'approved' | 'pending', why?: string) {
  busyId.value = tc.id
  try {
    await adminStore.reviewTeacher(tc.id, status, why)
    notify(status === 'approved' ? t('staff.approvals.approvedToast') : t('staff.approvals.reopenedToast'), true)
  } catch (e) {
    notify(errorText(e, t('staff.approvals.failed')), false)
  } finally {
    busyId.value = null
  }
}

function askReject(tc: TeacherOverviewRow) {
  reason.value = ''
  rejecting.value = tc
}

async function confirmReject() {
  const tc = rejecting.value
  if (!tc || !reason.value) return
  busyId.value = tc.id
  try {
    await adminStore.reviewTeacher(tc.id, 'rejected', reason.value)
    notify(t('staff.approvals.rejectedToast'), true)
    rejecting.value = null
  } catch (e) {
    notify(errorText(e, t('staff.approvals.failed')), false)
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>
