<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="emit('update:modelValue', false)"
      >
        <div class="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-xl">
          <h3 class="text-foreground mb-2 text-lg font-semibold">{{ $t('quizPlay.exitTitle') }}</h3>
          <p class="text-muted-foreground mb-6">{{ $t('quizPlay.exitBody') }}</p>
          <div class="flex gap-3">
            <button
              class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-3 font-medium transition-colors"
              @click="emit('update:modelValue', false)"
            >
              {{ $t('quizPlay.continue') }}
            </button>
            <button
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 rounded-xl py-3 font-medium transition-colors"
              @click="emit('confirm')"
            >
              {{ $t('quizPlay.exit') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()
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
</style>
