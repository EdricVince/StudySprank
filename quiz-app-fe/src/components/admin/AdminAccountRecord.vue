<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="userId !== null"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        @click.self="emit('close')"
      >
        <div class="bg-card border-border flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border shadow-xl">
          <div class="border-border flex items-start justify-between gap-4 border-b px-6 py-4">
            <div class="min-w-0">
              <h3 class="adm-h3 text-base">{{ $t('staff.account.title') }}</h3>
              <p v-if="record" class="adm-text mt-0.5 truncate">{{ record.name || record.email }} · {{ record.email }}</p>
            </div>
            <button type="button" class="text-muted-foreground hover:text-foreground" :aria-label="$t('common.close')" @click="emit('close')">✕</button>
          </div>

          <div class="space-y-6 overflow-y-auto px-6 py-5">
            <p v-if="loading" class="adm-text">{{ $t('common.loading') }}</p>
            <p v-else-if="failed" class="text-sm text-red-500" role="alert">{{ $t('staff.account.loadFailed') }}</p>

            <template v-else-if="record">
              <!-- Account -->
              <section>
                <h4 class="adm-meta mb-2 font-semibold uppercase tracking-wider">{{ $t('staff.account.sections.account') }}</h4>
                <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div v-for="row in accountRows" :key="row.label" class="flex justify-between gap-3">
                    <dt class="text-muted-foreground">{{ row.label }}</dt>
                    <dd class="text-foreground text-right font-medium">{{ row.value }}</dd>
                  </div>
                </dl>
              </section>

              <!-- Teacher application and the decision on it -->
              <section v-if="record.role === 'teacher'">
                <h4 class="adm-meta mb-2 font-semibold uppercase tracking-wider">{{ $t('staff.account.sections.application') }}</h4>
                <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div v-for="row in applicationRows" :key="row.label" class="flex justify-between gap-3">
                    <dt class="text-muted-foreground">{{ row.label }}</dt>
                    <dd class="text-foreground text-right font-medium">{{ row.value }}</dd>
                  </div>
                </dl>
                <p v-if="record.teacher_reject_reason" class="info-box info-box-red mt-3 text-sm">
                  <span class="font-semibold">{{ $t('staff.account.fields.reason') }}:</span> {{ record.teacher_reject_reason }}
                </p>
              </section>

              <!-- Everything that happened to this account -->
              <section>
                <h4 class="adm-meta mb-2 font-semibold uppercase tracking-wider">{{ $t('staff.account.sections.history') }}</h4>
                <p v-if="!history.length" class="adm-text">{{ $t('staff.account.historyEmpty') }}</p>
                <ol v-else class="border-border space-y-3 border-l pl-4">
                  <li v-for="ev in history" :key="ev.id" class="relative">
                    <span class="bg-primary absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"></span>
                    <p class="text-foreground text-sm font-medium">{{ eventText(ev) }}</p>
                    <p class="adm-meta">
                      {{ formatDateTime(ev.created_at) }}
                      <template v-if="ev.actor_email"> · {{ $t('staff.account.by', { name: ev.actor_name || ev.actor_email }) }}</template>
                    </p>
                    <p v-if="ev.metadata.reason" class="adm-meta">“{{ ev.metadata.reason }}”</p>
                  </li>
                </ol>
              </section>

              <p class="adm-meta">{{ $t('staff.account.dbHint') }}</p>
            </template>
          </div>

          <div class="border-border flex justify-end border-t px-6 py-3">
            <button type="button" class="adm-btn-ghost" @click="emit('close')">{{ $t('common.close') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/stores/admin.store'
import type { AccountEvent, AccountRecord } from '@/stores/admin.store'

/** The whole record of one account (what the `user_accounts` view and the activity trail hold in the database). */
const props = defineProps<{ userId: number | null }>()
const emit = defineEmits<{ close: [] }>()

const { t, te, locale } = useI18n()
const adminStore = useAdminStore()

const record = ref<AccountRecord | null>(null)
const history = ref<AccountEvent[]>([])
const loading = ref(false)
const failed = ref(false)

watch(
  () => props.userId,
  async (id) => {
    record.value = null
    history.value = []
    failed.value = false
    if (id === null) return
    loading.value = true
    try {
      const detail = await adminStore.getAccountDetail(id)
      // Ignore a slow answer for an account that is no longer the open one.
      if (props.userId === id) {
        record.value = detail.account
        history.value = detail.history
      }
    } catch {
      if (props.userId === id) failed.value = true
    } finally {
      if (props.userId === id) loading.value = false
    }
  },
  { immediate: true },
)

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' }) : t('staff.account.never')

const accountRows = computed(() => {
  const r = record.value
  if (!r) return []
  return [
    { label: t('staff.account.fields.role'), value: t(`staff.roles.${r.role}`) },
    { label: t('staff.account.fields.status'), value: r.is_active ? t('staff.users.profile.active') : t('staff.users.profile.inactive') },
    { label: t('staff.account.fields.registered'), value: formatDateTime(r.created_at) },
    { label: t('staff.account.fields.lastLogin'), value: formatDateTime(r.last_login_at) },
    { label: t('staff.account.fields.classesOwned'), value: String(r.classes_owned) },
    { label: t('staff.account.fields.classesJoined'), value: String(r.classes_joined) },
  ]
})

const applicationRows = computed(() => {
  const r = record.value
  if (!r) return []
  return [
    { label: t('staff.account.fields.decision'), value: t(`staff.status.${r.teacher_status}`) },
    { label: t('staff.account.fields.organization'), value: r.teacher_organization || '—' },
    { label: t('staff.account.fields.applied'), value: formatDateTime(r.teacher_applied_at) },
    { label: t('staff.account.fields.document'), value: r.has_teacher_card ? t('staff.account.fields.onFile') : t('staff.account.fields.missing') },
    { label: t('staff.account.fields.decidedAt'), value: r.teacher_reviewed_at ? formatDateTime(r.teacher_reviewed_at) : '—' },
    { label: t('staff.account.fields.decidedBy'), value: r.teacher_reviewed_by_email || '—' },
  ]
})

// "teacher.review" -> staff.account.events.teacher_review; unknown actions fall back to the server's summary.
function eventText(ev: AccountEvent): string {
  const key = `staff.account.events.${ev.action.replace('.', '_')}`
  if (!te(key)) return ev.summary
  const status = typeof ev.metadata.status === 'string' ? t(`staff.status.${ev.metadata.status}`) : ''
  const active = ev.metadata.is_active === false ? t('staff.users.profile.inactive') : t('staff.users.profile.active')
  return t(key, { status, active })
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
