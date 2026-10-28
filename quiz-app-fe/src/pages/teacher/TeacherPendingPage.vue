<template>
  <div class="mx-auto flex max-w-xl flex-col gap-6 p-6 lg:p-10">
    <div class="bg-card border-border rounded-3xl border p-8 text-center shadow-sm">
      <div
        class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        :class="rejected ? 'bg-red-500/10' : 'bg-amber-500/10'"
      >
        {{ rejected ? '✗' : '⏳' }}
      </div>
      <h2 class="text-foreground text-xl font-bold">
        {{ rejected ? $t('teacher.pending.titleRejected') : $t('teacher.pending.titlePending') }}
      </h2>
      <p class="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
        {{ rejected ? $t('teacher.pending.descRejected') : $t('teacher.pending.descPending') }}
      </p>

      <dl class="mt-6 grid gap-3 text-left text-sm sm:grid-cols-2">
        <div class="bg-muted/40 rounded-xl p-3">
          <dt class="text-muted-foreground text-xs">{{ $t('teacher.pending.account') }}</dt>
          <dd class="text-foreground truncate font-medium">{{ authStore.user?.email }}</dd>
        </div>
        <div class="bg-muted/40 rounded-xl p-3">
          <dt class="text-muted-foreground text-xs">{{ $t('teacher.pending.organization') }}</dt>
          <dd class="text-foreground truncate font-medium">{{ authStore.user?.teacher_organization || '—' }}</dd>
        </div>
      </dl>

      <div v-if="rejected && authStore.user?.teacher_reject_reason" class="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-left">
        <p class="text-xs font-semibold uppercase tracking-wide text-red-400">{{ $t('teacher.pending.reason') }}</p>
        <p class="text-foreground mt-1 text-sm leading-relaxed">{{ authStore.user.teacher_reject_reason }}</p>
      </div>

      <p v-if="notice" class="text-muted-foreground mt-4 text-sm" role="status">{{ notice }}</p>

      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          :disabled="checking"
          @click="checkStatus(true)"
        >
          {{ checking ? $t('teacher.pending.checking') : $t('teacher.pending.checkStatus') }}
        </button>
        <button
          type="button"
          class="border-border text-foreground hover:bg-accent rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors"
          @click="signOut"
        >
          {{ $t('teacher.nav.signOut') }}
        </button>
      </div>
    </div>

    <!-- Re-submit a better document after a rejection -->
    <div v-if="rejected" class="bg-card border-border rounded-3xl border p-6 shadow-sm">
      <h3 class="text-foreground text-base font-bold">{{ $t('teacher.pending.resubmitTitle') }}</h3>
      <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.pending.resubmitHint') }}</p>

      <div class="border-border bg-background mt-4 flex items-center gap-4 rounded-xl border border-dashed p-3">
        <img v-if="docImage" :src="docImage" alt="" class="h-16 w-24 rounded-lg border object-cover" />
        <div v-else class="bg-muted text-muted-foreground flex h-16 w-24 items-center justify-center rounded-lg text-2xl">🪪</div>
        <label class="bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors">
          {{ docImage ? $t('auth.teacherRegister.replaceFile') : $t('auth.teacherRegister.chooseFile') }}
          <input class="sr-only" type="file" accept="image/*" @change="onFile" />
        </label>
      </div>
      <p v-if="fileError" class="text-destructive mt-2 text-xs">{{ fileError }}</p>

      <button
        type="button"
        class="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
        :disabled="!docImage || submitting"
        @click="resubmit"
      >
        {{ submitting ? $t('teacher.pending.submitting') : $t('teacher.pending.resubmit') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { usePolling } from '@/composables/usePolling'
import { api } from '@/utils/api'
import { errorText } from '@/utils/skills'
import { fileToResizedDataUrl, ImageError } from '@/utils/image'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const rejected = computed(() => authStore.teacherStatus === 'rejected')
const checking = ref(false)
const notice = ref('')
const docImage = ref('')
const fileError = ref('')
const submitting = ref(false)

/** Re-read the account from the server; approval takes us straight to the dashboard. */
async function checkStatus(manual = false) {
  if (checking.value) return
  checking.value = true
  try {
    await authStore.refreshProfile()
    if (authStore.isTeacherApproved) {
      router.replace('/teacher/dashboard')
      return
    }
    notice.value = manual ? t('teacher.pending.stillWaiting') : ''
  } finally {
    checking.value = false
  }
}

// An approval by the admin (seen by any profile refresh) leads straight to the dashboard.
watch(() => authStore.isTeacherApproved, (ok) => { if (ok) router.replace('/teacher/dashboard') })

// An approval by the admin shows up without a manual refresh.
usePolling(() => checkStatus(false), 20000, { immediate: false })

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  fileError.value = ''
  try {
    docImage.value = await fileToResizedDataUrl(file)
  } catch (err) {
    fileError.value = err instanceof ImageError && err.reason === 'type'
      ? t('auth.teacherRegister.errImage')
      : t('auth.teacherRegister.errImageRead')
  }
}

async function resubmit() {
  if (!docImage.value || submitting.value) return
  submitting.value = true
  notice.value = ''
  try {
    await api.submitTeacherApplication({ teacher_card_image: docImage.value })
    docImage.value = ''
    await authStore.refreshProfile()
    notice.value = t('teacher.pending.resubmitted')
  } catch (e) {
    fileError.value = errorText(e, t('teacher.pending.resubmitFailed'))
  } finally {
    submitting.value = false
  }
}

function signOut() {
  authStore.logout()
  router.push('/login')
}
</script>
