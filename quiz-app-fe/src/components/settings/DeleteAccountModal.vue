<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="$emit('close')"
      >
        <div class="bg-card border-border w-full max-w-md rounded-2xl border p-6 shadow-xl">
          <div class="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <AlertTriangle class="text-destructive h-6 w-6" />
          </div>
          <h3 class="text-foreground mb-2 text-center text-lg font-semibold">
            {{ $t('settings.deleteModal.title') }}
          </h3>
          <p class="text-muted-foreground mb-6 text-center text-sm">
            {{ $t('settings.deleteModal.message') }}
          </p>

          <div class="mb-4">
            <label class="text-foreground mb-2 block text-sm font-medium">
              {{ $t('settings.deleteModal.typeToConfirm') }}
            </label>
            <input
              v-model="confirmText"
              type="text"
              :placeholder="$t('settings.deleteModal.confirmPlaceholder')"
              data-test="delete-confirm-text"
              class="bg-secondary border-border text-foreground w-full rounded-lg border px-4 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-destructive/50"
            />
          </div>

          <div class="mb-4">
            <label class="text-foreground mb-2 block text-sm font-medium">
              {{ $t('settings.deleteModal.password') }}
            </label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              :placeholder="$t('settings.deleteModal.passwordPlaceholder')"
              data-test="delete-password"
              class="bg-secondary border-border text-foreground w-full rounded-lg border px-4 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-destructive/50"
              @keyup.enter="handleDelete"
            />
            <p v-if="error" class="text-destructive mt-2 text-sm" data-test="delete-error">{{ error }}</p>
          </div>

          <div class="flex gap-3">
            <button
              class="bg-secondary text-foreground flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:bg-secondary/80"
              @click="$emit('close')"
            >
              {{ $t('settings.deleteModal.cancel') }}
            </button>
            <button
              class="bg-destructive text-destructive-foreground flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              :disabled="!canDelete"
              data-test="delete-confirm"
              @click="handleDelete"
            >
              {{ $t('settings.deleteModal.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AlertTriangle } from '@/components/icons'

const props = withDefaults(
  defineProps<{
    show: boolean
    /** The request is running. */
    busy?: boolean
    /** Why the last attempt failed (e.g. a wrong password). */
    error?: string
  }>(),
  { busy: false, error: '' },
)

const emit = defineEmits<{
  close: []
  /** The learner typed DELETE and their password. */
  confirm: [password: string]
}>()

const confirmText = ref('')
const password = ref('')

const canDelete = computed(() => confirmText.value === 'DELETE' && password.value.length > 0 && !props.busy)

watch(() => props.show, (newVal) => {
  if (!newVal) {
    confirmText.value = ''
    password.value = ''
  }
})

const handleDelete = () => {
  if (canDelete.value) emit('confirm', password.value)
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
