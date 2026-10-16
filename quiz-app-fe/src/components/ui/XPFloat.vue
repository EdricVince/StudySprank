<template>
  <Teleport to="body">
    <TransitionGroup name="xp-float" tag="div">
      <div
        v-for="item in floats"
        :key="item.id"
        class="pointer-events-none fixed z-[9999] select-none font-bold"
        :style="{ left: item.x + 'px', top: item.y + 'px' }"
      >
        <span
class="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm shadow-lg"
          :class="item.color">
          <Zap class="h-3.5 w-3.5" />
          +{{ item.amount }} XP
        </span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Zap } from '@/components/icons'

interface FloatItem { id: number; x: number; y: number; amount: number; color: string }

const floats = ref<FloatItem[]>([])
let counter = 0

const COLORS = [
  'bg-primary/90 text-primary-foreground',
  'bg-violet-500/90 text-white',
  'bg-amber-500/90 text-white',
]

const trigger = (amount: number, x?: number, y?: number) => {
  const cx = x ?? window.innerWidth / 2
  const cy = y ?? window.innerHeight / 2
  const id = ++counter
  const color = COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#F1C40F'
  floats.value.push({ id, x: cx - 30, y: cy, amount, color })
  setTimeout(() => { floats.value = floats.value.filter(f => f.id !== id) }, 1200)
}

defineExpose({ trigger })
</script>

<style scoped>
.xp-float-enter-active { animation: xp-rise 1.2s ease-out forwards; }
.xp-float-leave-active { display: none; }

@keyframes xp-rise {
  0%   { opacity: 0; transform: translateY(0) scale(0.7); }
  15%  { opacity: 1; transform: translateY(-8px) scale(1.1); }
  80%  { opacity: 1; transform: translateY(-55px) scale(1); }
  100% { opacity: 0; transform: translateY(-75px) scale(0.9); }
}
</style>
