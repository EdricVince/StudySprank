<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="bg-card border-border w-full max-w-md rounded-3xl border p-6 text-center shadow-xl lg:p-8">
          <div class="bg-destructive/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <Trash2 class="text-destructive h-8 w-8" />
          </div>
          <h2 class="text-foreground mb-2 text-xl font-bold">{{ title }}</h2>
          <p class="text-muted-foreground mb-6">
            {{ message }}
          </p>
          <div class="flex gap-3">
            <Button variant="outline" class="flex-1" @click="close">
              {{ $t('common.cancel') }}
            </Button>
            <Button variant="destructive" class="flex-1" @click="handleConfirm">
              {{ confirmText }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Trash2 } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Delete Item?',
  message: 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText: 'Delete',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const close = () => {
  emit('update:modelValue', false)
}

const handleConfirm = () => {
  emit('confirm')
  close()
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
  transform: scale(0.95) translateY(20px);
}
</style>
