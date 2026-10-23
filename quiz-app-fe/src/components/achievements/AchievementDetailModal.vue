<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show && achievement"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <!-- Backdrop -->
        <div class="bg-foreground/50 absolute inset-0" />

        <!-- Modal -->
        <div class="bg-card border-border relative w-full max-w-sm rounded-2xl border p-6 shadow-xl">
          <!-- Close button -->
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground absolute right-4 top-4 transition-colors"
            :aria-label="$t('common.close')"
            @click="$emit('close')"
          >
            <X class="h-5 w-5" />
          </button>

          <!-- Content -->
          <div class="flex flex-col items-center text-center">
            <!-- Badge -->
            <div
              class="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-2"
              :class="getBadgeClasses()"
            >
              <component
                :is="achievement.icon"
                class="h-10 w-10"
                :class="getIconClasses()"
              />
            </div>

            <!-- Rarity badge -->
            <span
              class="mb-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide"
              :class="getRarityBadgeClasses()"
            >
              {{ achievement.rarity }}
            </span>

            <!-- Name -->
            <h3 class="text-foreground mb-1 text-lg font-semibold">
              {{ achievement.name }}
            </h3>

            <!-- Description -->
            <p class="text-muted-foreground mb-4 text-sm">
              {{ achievement.description }}
            </p>

            <!-- Status -->
            <div v-if="achievement.earned" class="w-full">
              <div class="bg-primary/10 flex items-center justify-center gap-2 rounded-lg py-3">
                <Check class="text-primary h-5 w-5" />
                <span class="text-primary text-sm font-medium">{{ $t('achievements.earned') }}</span>
              </div>
              <p v-if="achievement.earnedAt" class="text-muted-foreground mt-2 text-xs">
                {{ formatDate(achievement.earnedAt) }}
              </p>
              <button
                type="button"
                class="bg-secondary text-foreground hover:bg-secondary/80 mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                @click="$emit('share', achievement)"
              >
                <Share2 class="h-4 w-4" />
                {{ $t('achievements.share') }}
              </button>
            </div>

            <!-- Progress for unearned -->
            <div v-else class="w-full">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-muted-foreground text-sm">{{ $t('achievements.progress') }}</span>
                <span class="text-foreground text-sm font-medium">
                  {{ achievement.progress || 0 }} / {{ achievement.target || 0 }}
                </span>
              </div>
              <div class="bg-secondary h-2 w-full overflow-hidden rounded-full">
                <div
                  class="h-full rounded-full transition-all"
                  :class="getProgressBarClasses()"
                  :style="{ width: `${getProgressPercent()}%` }"
                />
              </div>
              <p class="text-muted-foreground mt-2 text-xs">
                {{ $t('achievements.percentComplete', { n: Math.round(getProgressPercent()) }) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X, Check, Share2 } from '@/components/icons'
import type { EnhancedAchievement } from '@/types/profile'

interface Props {
  show: boolean
  achievement: EnhancedAchievement | null
}

const props = defineProps<Props>()

defineEmits<{
  close: []
  share: [achievement: EnhancedAchievement]
}>()

const getBadgeClasses = (): string => {
  if (!props.achievement) return ''

  if (!props.achievement.earned) {
    return 'bg-secondary border-border'
  }

  const rarityClasses: Record<string, string> = {
    common: 'bg-secondary border-border',
    rare: 'bg-chart-2/10 border-chart-2',
    epic: 'bg-chart-4/10 border-chart-4',
    legendary: 'bg-chart-1/10 border-chart-1',
  }

  return rarityClasses[props.achievement.rarity] ?? rarityClasses.common ?? ''
}

const getIconClasses = (): string => {
  if (!props.achievement) return ''

  if (!props.achievement.earned) {
    return 'text-muted-foreground'
  }

  const rarityClasses: Record<string, string> = {
    common: 'text-foreground',
    rare: 'text-chart-2',
    epic: 'text-chart-4',
    legendary: 'text-chart-1',
  }

  return rarityClasses[props.achievement.rarity] ?? rarityClasses.common ?? ''
}

const getRarityBadgeClasses = (): string => {
  if (!props.achievement) return ''

  const rarityClasses: Record<string, string> = {
    common: 'bg-secondary text-muted-foreground',
    rare: 'bg-chart-2/10 text-chart-2',
    epic: 'bg-chart-4/10 text-chart-4',
    legendary: 'bg-chart-1/10 text-chart-1',
  }

  return rarityClasses[props.achievement.rarity] ?? rarityClasses.common ?? ''
}

const getProgressBarClasses = (): string => {
  if (!props.achievement) return 'bg-muted-foreground'

  const rarityClasses: Record<string, string> = {
    common: 'bg-muted-foreground',
    rare: 'bg-chart-2',
    epic: 'bg-chart-4',
    legendary: 'bg-chart-1',
  }

  return rarityClasses[props.achievement.rarity] ?? rarityClasses.common ?? ''
}

const getProgressPercent = (): number => {
  if (!props.achievement?.progress || !props.achievement?.target) return 0
  return Math.min((props.achievement.progress / props.achievement.target) * 100, 100)
}

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.2s ease;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>
