<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>
        <div class="bg-card border-border relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-xl">
          <h3 class="text-foreground mb-1 text-lg font-semibold">{{ $t('quizzesPage.joinModal.title') }}</h3>
          <p class="text-muted-foreground mb-5 text-sm">{{ $t('quizzesPage.joinModal.desc') }}</p>

          <input
            v-model="code"
            type="text"
            :placeholder="$t('quizzesPage.joinModal.placeholder')"
            maxlength="10"
            class="border-border bg-background text-foreground placeholder:text-muted-foreground mb-2 h-12 w-full rounded-xl border px-4 text-center font-mono text-lg font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
            @input="code = code.toUpperCase()"
            @keyup.enter="join"
          />
          <p v-if="error" class="text-destructive mb-3 text-center text-sm">{{ error }}</p>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-3 font-medium transition-colors"
              @click="emit('close')"
            >{{ $t('quizzesPage.joinModal.cancel') }}</button>
            <button
              type="button"
              class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
              :disabled="code.trim().length < 4 || joining"
              @click="join"
            >{{ joining ? $t('quizzesPage.joinModal.joining') : $t('quizzesPage.joinModal.join') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/utils/api'
import { useToast } from '@/composables/useToast'
import { errorText } from '@/utils/skills'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: []; joined: [] }>()

const { t } = useI18n()
const toast = useToast()
const code = ref('')
const error = ref('')
const joining = ref(false)

// Start from a clean form every time the modal opens.
watch(() => props.show, (open) => {
  if (open) { code.value = ''; error.value = '' }
})

async function join() {
  const value = code.value.trim()
  if (value.length < 4 || joining.value) return
  joining.value = true
  error.value = ''
  try {
    const joined = (await api.joinClass(value)) as { name?: string }
    toast.success(t('quizzesPage.joinModal.success', { name: joined?.name ?? '' }))
    emit('joined')
    emit('close')
  } catch (e) {
    error.value = errorText(e, t('quizzesPage.joinModal.invalid'))
  } finally {
    joining.value = false
  }
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
