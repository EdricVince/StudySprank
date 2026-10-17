<template>
  <Transition name="combo">
    <div v-if="combo >= 2" class="flex items-center gap-2">
      <div
        class="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow-lg"
        :class="comboClass"
      >
        <Zap class="h-4 w-4" />
        <span>{{ $t('quizPlay.combo', { n: combo }) }}</span>
        <span class="opacity-75 text-xs font-normal">×{{ multiplier }}</span>
      </div>
      <!-- Flame sparks -->
      <div v-if="combo >= 5" class="flex gap-0.5">
        <span v-for="i in Math.min(combo, 5)" :key="i" class="animate-bounce text-sm" :style="{ animationDelay: i * 0.1 + 's' }">🔥</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Zap } from '@/components/icons'

const props = defineProps<{ combo: number }>()

const multiplier = computed(() => {
  if (props.combo >= 10) return '3×'
  if (props.combo >= 5)  return '2×'
  if (props.combo >= 3)  return '1.5×'
  return '1.25×'
})

const comboClass = computed(() => {
  if (props.combo >= 10) return 'bg-red-500 text-white animate-pulse'
  if (props.combo >= 5)  return 'bg-orange-500 text-white'
  if (props.combo >= 3)  return 'bg-amber-500 text-white'
  return 'bg-primary text-primary-foreground'
})
</script>

<style scoped>
.combo-enter-active { animation: combo-pop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.combo-leave-active { transition: all 0.2s ease-in; }
.combo-leave-to    { opacity: 0; transform: scale(0.8); }
@keyframes combo-pop {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
</style>
