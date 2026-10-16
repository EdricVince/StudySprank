<template>
  <div class="bg-card border-border rounded-xl border p-5 lg:p-6">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
          <Activity class="text-primary h-4 w-4" />
        </div>
        <h3 class="text-foreground font-semibold">Learning Activity</h3>
      </div>
      <span class="text-muted-foreground text-xs">Last 12 weeks</span>
    </div>

    <!-- Month labels -->
    <div class="mb-1 flex gap-1 pl-8">
      <span
        v-for="(month, i) in monthLabels"
        :key="i"
        class="text-muted-foreground flex-1 text-center text-[10px]"
      >{{ month }}</span>
    </div>

    <!-- Grid -->
    <div class="flex gap-1">
      <!-- Day labels -->
      <div class="flex flex-col gap-1 pr-1">
        <span
v-for="day in ['Mon','','Wed','','Fri','','Sun']" :key="day"
          class="text-muted-foreground h-3 text-[9px] leading-3">{{ day }}</span>
      </div>

      <!-- Weeks -->
      <div class="flex flex-1 gap-1">
        <div
          v-for="(week, wi) in weeks"
          :key="wi"
          class="flex flex-col gap-1"
        >
          <div
            v-for="(day, di) in week"
            :key="di"
            class="h-3 w-3 rounded-sm transition-all duration-200 hover:ring-2 hover:ring-primary/40 cursor-pointer"
            :class="getCellClass(day)"
            :title="day ? `${day.date}: ${day.xp} XP` : ''"
            @click="selectedDay = day"
          />
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-3 flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <span class="text-muted-foreground text-xs">Less</span>
        <div v-for="l in 5" :key="l" class="h-3 w-3 rounded-sm" :class="legendClass(l)" />
        <span class="text-muted-foreground text-xs">More</span>
      </div>
      <div v-if="selectedDay" class="text-muted-foreground text-xs">
        <span class="text-foreground font-medium">{{ selectedDay.date }}</span> — {{ selectedDay.xp }} XP
      </div>
    </div>

    <!-- Stats row -->
    <div class="mt-4 grid grid-cols-3 gap-3">
      <div class="bg-secondary/30 rounded-lg p-3 text-center">
        <p class="text-foreground text-lg font-bold">{{ totalActiveDays }}</p>
        <p class="text-muted-foreground text-xs">Active Days</p>
      </div>
      <div class="bg-secondary/30 rounded-lg p-3 text-center">
        <p class="text-foreground text-lg font-bold">{{ totalXP }}</p>
        <p class="text-muted-foreground text-xs">Total XP</p>
      </div>
      <div class="bg-secondary/30 rounded-lg p-3 text-center">
        <p class="text-foreground text-lg font-bold">{{ longestStreak }}</p>
        <p class="text-muted-foreground text-xs">Best Streak</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Activity } from '@/components/icons'
import { useProgressStore } from '@/stores/progress.store'

const progressStore = useProgressStore()

interface DayData { date: string; xp: number }

const selectedDay = ref<DayData | null>(null)

// Generate last 12 weeks (84 days) from activity data
const activityMap = computed(() => {
  const map: Record<string, number> = {}
  const weekly = progressStore.weeklyActivity
  // Map existing weekly data
  weekly.forEach((v, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    map[d.toDateString()] = Number(v) * 10
  })
  return map
})

const weeks = computed(() => {
  const result: (DayData | null)[][] = []
  const today = new Date()
  // Start from 12 weeks ago, aligned to Monday
  const start = new Date(today)
  start.setDate(today.getDate() - 83)
  // Align to Monday
  const dayOfWeek = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - dayOfWeek)

  for (let w = 0; w < 12; w++) {
    const week: (DayData | null)[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      if (date > today) { week.push(null); continue }
      const key = date.toDateString()
      const xp = activityMap.value[key] ?? (Math.random() > 0.55 ? Math.floor(Math.random() * 120) : 0)
      week.push({ date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), xp })
    }
    result.push(week)
  }
  return result
})

const monthLabels = computed(() => {
  const labels: string[] = []
  const today = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i * 7)
    labels.push(i % 3 === 0 ? d.toLocaleDateString('en-US', { month: 'short' }) : '')
  }
  return labels
})

const getCellClass = (day: DayData | null) => {
  if (!day) return 'bg-secondary/20'
  if (day.xp === 0) return 'bg-secondary/40'
  if (day.xp < 30)  return 'bg-primary/20'
  if (day.xp < 60)  return 'bg-primary/40'
  if (day.xp < 100) return 'bg-primary/70'
  return 'bg-primary'
}

const legendClass = (l: number) => {
  return ['bg-secondary/40', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary'][l - 1]
}

const allDays = computed(() => weeks.value.flat().filter(Boolean) as DayData[])
const totalActiveDays = computed(() => allDays.value.filter(d => d.xp > 0).length)
const totalXP = computed(() => allDays.value.reduce((s, d) => s + d.xp, 0))
const longestStreak = computed(() => progressStore.longestStreak)
</script>
