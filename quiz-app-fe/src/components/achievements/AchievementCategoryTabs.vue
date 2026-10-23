<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      :aria-pressed="modelValue === tab.value"
      class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
      :class="
        modelValue === tab.value
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-muted-foreground hover:text-foreground'
      "
      @click="$emit('update:modelValue', tab.value)"
    >
      <component :is="tab.icon" class="h-4 w-4" />
      {{ tab.label }}
      <span
        v-if="getCategoryCount(tab.value) > 0"
        class="rounded-full px-1.5 py-0.5 text-xs"
        :class="
          modelValue === tab.value
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        "
      >
        {{ getCategoryCount(tab.value) }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, Flame, Users, GraduationCap, Trophy } from '@/components/icons'
import type { AchievementCategory, EnhancedAchievement } from '@/types/profile'

interface Props {
  modelValue: AchievementCategory | 'all'
  achievements: EnhancedAchievement[]
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: AchievementCategory | 'all']
}>()

const { t } = useI18n()

const tabs = computed(() => [
  { value: 'all' as const, label: t('achievements.tabs.all'), icon: Sparkles },
  { value: 'learning' as const, label: t('achievements.tabs.learning'), icon: GraduationCap },
  { value: 'streak' as const, label: t('achievements.tabs.streak'), icon: Flame },
  { value: 'social' as const, label: t('achievements.tabs.social'), icon: Users },
  { value: 'mastery' as const, label: t('achievements.tabs.mastery'), icon: Trophy },
])

const getCategoryCount = (category: AchievementCategory | 'all'): number => {
  if (category === 'all') {
    return props.achievements.filter((a) => a.earned).length
  }
  return props.achievements.filter((a) => a.category === category && a.earned).length
}
</script>
