<template>
  <div class="flex min-h-[80vh] flex-col items-center justify-center p-6">
    <!-- Result Card -->
    <div class="animate-fade-in-up bg-card border-border w-full max-w-md rounded-3xl border p-8 text-center shadow-xl">
      <!-- Trophy/Icon -->
      <div class="mx-auto mb-6">
        <div
          class="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl"
          :class="resultIconClass"
        >
          <component :is="resultIcon" class="h-12 w-12" />
        </div>
      </div>

      <!-- Title -->
      <h1 class="text-foreground mb-2 text-3xl font-bold">{{ resultTitle }}</h1>
      <p class="text-muted-foreground mb-8 text-lg">{{ resultMessage }}</p>

      <!-- Score -->
      <div class="bg-secondary/50 mb-6 rounded-2xl p-6">
        <div class="text-primary mb-1 text-5xl font-bold">{{ result.score }}</div>
        <p class="text-muted-foreground text-sm">{{ $t('quizPlay.result.totalScore') }}</p>
      </div>

      <!-- Stats Grid -->
      <div class="mb-8 grid grid-cols-2 gap-4">
        <div class="bg-secondary/30 rounded-xl p-4">
          <div class="text-foreground text-2xl font-bold">{{ result.correctAnswers }}/{{ result.totalQuestions }}</div>
          <p class="text-muted-foreground text-sm">{{ $t('quizPlay.result.correct') }}</p>
        </div>
        <div class="bg-secondary/30 rounded-xl p-4">
          <div class="text-foreground text-2xl font-bold">{{ result.accuracy }}%</div>
          <p class="text-muted-foreground text-sm">{{ $t('quizPlay.result.accuracy') }}</p>
        </div>
        <div class="bg-secondary/30 rounded-xl p-4">
          <div class="text-foreground text-2xl font-bold">{{ formattedTime }}</div>
          <p class="text-muted-foreground text-sm">{{ $t('quizPlay.result.time') }}</p>
        </div>
        <div class="bg-secondary/30 rounded-xl p-4">
          <div class="text-primary text-2xl font-bold">+{{ result.xpEarned }}</div>
          <p class="text-muted-foreground text-sm">{{ $t('quizPlay.result.xpEarned') }}</p>
        </div>
      </div>

      <!-- Streak Bonus -->
      <div v-if="result.streakBonus > 0" class="bg-primary/10 mb-6 flex items-center justify-center gap-2 rounded-xl p-3">
        <Flame class="text-primary h-5 w-5" />
        <span class="text-primary font-medium">{{ $t('quizPlay.result.streakBonus', { n: result.streakBonus }) }}</span>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3">
        <button
          class="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-colors"
          @click="$emit('playAgain')"
        >
          <RotateCcw class="h-5 w-5" />
          {{ $t('quizPlay.result.playAgain') }}
        </button>
        <button
          class="group flex w-full items-center justify-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 py-3 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
          @click="$emit('goHome')"
        >
          <svg class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          {{ $t('quizPlay.result.quizzes') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trophy, Star, Medal, ThumbsUp, Flame, RotateCcw } from '@/components/icons'
import type { QuizResult } from '@/types/quiz'

const { t } = useI18n()

interface Props {
  result: QuizResult
}

const props = defineProps<Props>()

defineEmits<{
  playAgain: []
  goHome: []
}>()

const formattedTime = computed(() => {
  const minutes = Math.floor(props.result.timeSpent / 60)
  const seconds = props.result.timeSpent % 60
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
})

// One row per accuracy tier (checked top-down): icon, colours and i18n keys.
const TIERS: { min: number; icon: Component; cls: string; title: string; msg: string }[] = [
  { min: 90, icon: Trophy, cls: 'bg-primary/10 text-primary', title: 'excellent', msg: 'msgExcellent' },
  { min: 70, icon: Star, cls: 'bg-accent text-accent-foreground', title: 'great', msg: 'msgGreat' },
  { min: 50, icon: Medal, cls: 'bg-secondary text-secondary-foreground', title: 'good', msg: 'msgGood' },
  { min: 0, icon: ThumbsUp, cls: 'bg-muted text-muted-foreground', title: 'keep', msg: 'msgKeep' },
]
const tier = computed(() => TIERS.find((x) => props.result.accuracy >= x.min) ?? TIERS[TIERS.length - 1]!)

const resultIcon = computed<Component>(() => tier.value.icon)
const resultIconClass = computed(() => tier.value.cls)
const resultTitle = computed(() => t(`quizPlay.result.${tier.value.title}`))
const resultMessage = computed(() => t(`quizPlay.result.${tier.value.msg}`))
</script>
