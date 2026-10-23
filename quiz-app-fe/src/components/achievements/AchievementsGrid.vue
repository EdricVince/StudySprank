<template>
  <div>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <div
        v-for="(achievement, index) in achievements"
        :key="achievement.id"
        role="button"
        tabindex="0"
        class="bg-card border-border group relative flex cursor-pointer flex-col items-center overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
        :class="[
          { 'opacity-60': !achievement.earned },
          `animate-fade-in-up delay-${Math.min(index * 50, 300)}`
        ]"
        @click="$emit('select', achievement)"
        @keydown.enter.prevent="$emit('select', achievement)"
        @keydown.space.prevent="$emit('select', achievement)"
      >
      <div
        v-if="achievement.earned"
        class="absolute inset-0 rounded-xl bg-linear-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
      />

        <div class="relative z-10 flex flex-col items-center">
          <!-- Selection is handled by the card itself (a click on the badge bubbles up to it). -->
          <AchievementBadge :achievement="achievement" tabindex="-1" />
          <p class="text-foreground mt-3 text-center text-sm font-medium">
            {{ achievement.name }}
          </p>
          <p class="text-muted-foreground mt-1 line-clamp-2 text-center text-xs">
            {{ achievement.description }}
          </p>

          <!-- Points indicator -->
          <div
            v-if="achievement.earned"
            class="mt-2 flex items-center gap-1 text-xs"
            :class="getRarityTextClass(achievement.rarity)"
          >
            <Sparkles class="h-3 w-3" />
            <span>+{{ getPoints(achievement.rarity) }} pts</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="achievements.length === 0"
      class="bg-card border-border rounded-xl border py-12 text-center"
    >
      <Trophy class="text-muted-foreground mx-auto h-12 w-12" />
      <p class="text-muted-foreground mt-4">{{ $t('achievements.noInCategory') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, Trophy } from '@/components/icons'
import AchievementBadge from '@/components/achievements/AchievementBadge.vue'
import type { EnhancedAchievement, AchievementRarity } from '@/types/profile'

defineProps<{
  achievements: EnhancedAchievement[]
}>()

defineEmits<{
  select: [achievement: EnhancedAchievement]
}>()

const pointsMap: Record<AchievementRarity, number> = {
  common: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
}

const getPoints = (rarity: AchievementRarity): number => pointsMap[rarity]

const getRarityTextClass = (rarity: AchievementRarity): string => {
  const classes: Record<AchievementRarity, string> = {
    common: 'text-muted-foreground',
    rare: 'text-chart-2',
    epic: 'text-chart-4',
    legendary: 'text-chart-1',
  }
  return classes[rarity]
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
