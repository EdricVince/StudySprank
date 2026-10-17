<template>
  <div class="bg-card border-border sticky top-0 z-10 rounded-2xl border p-4 shadow-sm">
    <div class="flex items-center justify-between gap-4">
      <!-- Back Button -->
      <button
        class="bg-secondary hover:bg-secondary/80 flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
        @click="$emit('exit')"
      >
        <X class="text-foreground h-5 w-5" />
      </button>

      <!-- Progress -->
      <div class="flex-1">
        <div class="mb-1 flex items-center justify-between text-sm">
          <span class="text-muted-foreground">
            {{ progressLabel ?? $t('quizPlay.questionOf', { n: currentQuestion, total: totalQuestions }) }}
          </span>
          <span class="text-foreground font-medium">{{ $t('quizPlay.pts', { n: score }) }}</span>
        </div>
        <div class="bg-secondary h-2 overflow-hidden rounded-full">
          <div
            class="bg-primary h-full rounded-full transition-all duration-500"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>

      <!-- Timer -->
      <div
        v-if="showTimer"
        class="flex items-center gap-2 rounded-xl px-4 py-2"
        :class="timerClass"
      >
        <Clock class="h-5 w-5" />
        <span class="font-mono text-lg font-bold">{{ formattedTime }}</span>
      </div>

      <!-- Streak -->
      <div v-if="streak > 0" class="bg-primary/10 flex items-center gap-1.5 rounded-xl px-3 py-2">
        <Flame class="text-primary h-5 w-5" />
        <span class="text-primary font-bold">{{ streak }}x</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X, Clock, Flame } from '@/components/icons'

interface Props {
  currentQuestion: number
  totalQuestions: number
  score: number
  timeRemaining?: number
  showTimer?: boolean
  streak?: number
  /** Overrides the default "Question n of total" text (e.g. "Pair n of total"). */
  progressLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  timeRemaining: 0,
  showTimer: false,
  streak: 0,
  progressLabel: undefined,
})

defineEmits<{
  exit: []
}>()

const progressPercent = computed(() => {
  return ((props.currentQuestion - 1) / props.totalQuestions) * 100
})

const formattedTime = computed(() => {
  const minutes = Math.floor(props.timeRemaining / 60)
  const seconds = props.timeRemaining % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const timerClass = computed(() => {
  if (props.timeRemaining <= 10) {
    return 'bg-destructive/10 text-destructive animate-pulse'
  }
  if (props.timeRemaining <= 30) {
    return 'bg-accent text-accent-foreground'
  }
  return 'bg-secondary text-secondary-foreground'
})
</script>
