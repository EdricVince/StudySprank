<template>
  <div class="animate-fade-in-up mb-6 grid gap-4" :class="columns">
    <div
      v-for="s in stats"
      :key="s.label"
      class="bg-card border-border group rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div class="mb-4 flex items-center justify-between gap-2">
        <span class="text-muted-foreground text-sm font-medium">{{ s.label }}</span>
        <div class="rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110" :class="s.bg">
          <component :is="s.icon" class="h-4 w-4" :class="s.color" />
        </div>
      </div>
      <p class="text-foreground text-3xl font-bold tabular-nums">{{ s.value }}{{ s.suffix ?? '' }}</p>
      <p v-if="s.sub" class="text-muted-foreground mt-1 text-xs">{{ s.sub }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import type { Component } from 'vue'

export interface TeacherStat {
  label: string
  value: number | string
  icon: Component
  /** Icon colour class, e.g. `text-primary`. */
  color: string
  /** Icon tile background class, e.g. `bg-primary/10`. */
  bg: string
  suffix?: string
  /** Small helper line under the number. */
  sub?: string
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

/** A row of summary cards; three cards share one line from `sm`, four from `lg`. */
const props = defineProps<{ stats: TeacherStat[] }>()

const columns = computed(() =>
  props.stats.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4',
)
</script>
