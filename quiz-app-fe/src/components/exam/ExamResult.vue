<template>
  <div class="space-y-6">
    <AiGeneratedBadge />
    <!-- Score Header -->
    <div class="bg-card border-border flex flex-wrap items-center gap-8 rounded-2xl border p-6">
      <!-- Ring -->
      <div class="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="8" class="text-border" />
          <circle
            cx="50" cy="50" r="42" fill="none" :stroke="scoreColor" stroke-width="8"
            stroke-linecap="round" stroke-dasharray="263.9"
            :stroke-dashoffset="263.9 - (263.9 * result.score_percent / 100)"
            class="transition-all duration-1000"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-foreground text-2xl font-extrabold">{{ result.score_percent }}%</span>
          <span class="text-muted-foreground text-xs">{{ result.correct }}/{{ result.total }}</span>
        </div>
      </div>

      <!-- Band -->
      <div class="flex flex-col gap-1.5">
        <span class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{{ $t('exam.estimatedBand') }}</span>
        <span class="text-4xl font-extrabold leading-none" :style="{ color: scoreColor }">{{ result.estimated_band }}</span>
        <span class="text-muted-foreground text-sm">{{ result.level }}</span>
        <span class="bg-primary/15 text-primary mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold">{{ examType.toUpperCase() }}</span>
      </div>
    </div>

    <!-- Section Breakdown -->
    <div class="bg-card border-border rounded-2xl border p-5 space-y-4">
      <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">{{ $t('exam.breakdown') }}</h3>
      <div v-for="b in result.breakdown" :key="b.section" class="space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-foreground text-sm font-medium">{{ sectionLabel(b.section) }}</span>
          <span class="text-muted-foreground text-xs font-mono">{{ b.correct }}/{{ b.total }}</span>
        </div>
        <div class="bg-border h-2 overflow-hidden rounded-full">
          <div
            class="h-full rounded-full transition-all duration-700"
            :style="{ width: (b.correct / b.total * 100) + '%', background: barColor(b.correct / b.total) }"
          />
        </div>
        <div class="text-muted-foreground text-xs text-right">{{ Math.round(b.correct / b.total * 100) }}%</div>
      </div>
    </div>

    <!-- Weak Areas -->
    <div v-if="result.weak_areas.length" class="bg-card border-border rounded-2xl border p-5 space-y-3">
      <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">{{ $t('exam.weakAreas') }}</h3>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="area in result.weak_areas"
          :key="area"
          class="border-red-500/30 bg-red-500/10 text-red-400 rounded-full border px-3 py-1 text-sm"
        >{{ sectionLabel(area) }}</span>
      </div>
    </div>

    <!-- Recommendations -->
    <div class="bg-card border-border rounded-2xl border p-5 space-y-3">
      <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">{{ $t('exam.recommendations') }}</h3>
      <ul class="space-y-2">
        <li
          v-for="(rec, i) in result.recommendations"
          :key="i"
          class="text-foreground relative pl-5 text-sm leading-relaxed before:absolute before:left-0 before:text-primary before:content-['→']"
        >{{ rec }}</li>
      </ul>
    </div>

    <!-- Writing Responses -->
    <div v-if="result.writing_responses?.length" class="bg-card border-border rounded-2xl border p-5 space-y-4">
      <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">✍️ Writing Responses</h3>
      <div v-for="(wr, i) in result.writing_responses" :key="i" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-400">
            {{ wr.task === 'writing-task1' ? 'Task 1' : 'Task 2' }}
          </span>
          <span class="text-muted-foreground text-xs">{{ wr.text.trim().split(/\s+/).length }} words</span>
        </div>
        <div class="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">{{ wr.text }}</div>
      </div>
      <p class="text-muted-foreground text-xs italic">Writing responses are not automatically scored. Your teacher or AI Study Schedule will provide personalized feedback.</p>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-3">
      <button
        class="border-border text-foreground hover:bg-accent rounded-xl border px-5 py-2.5 font-semibold transition-colors"
        @click="$emit('retry')"
      >{{ $t('exam.retry') }}</button>
      <button
        class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-2.5 font-semibold transition-colors"
        @click="$emit('schedule')"
      >{{ $t('exam.goSchedule') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AiGeneratedBadge from '@/components/common/AiGeneratedBadge.vue'

const props = defineProps<{
  result: {
    total: number
    correct: number
    score_percent: number
    estimated_band: string
    level: string
    breakdown: { section: string; correct: number; total: number }[]
    recommendations: string[]
    weak_areas: string[]
    writing_responses?: { task: string; question: string; text: string }[]
  }
  examType: string
}>()
defineEmits<{ (e: 'retry'): void; (e: 'schedule'): void }>()

const scoreColor = computed(() => {
  if (props.result.score_percent >= 80) return '#22c55e'
  if (props.result.score_percent >= 60) return '#f59e0b'
  return '#ef4444'
})

function barColor(ratio: number): string {
  if (ratio >= 0.8) return '#22c55e'
  if (ratio >= 0.6) return '#f59e0b'
  return '#ef4444'
}

const sectionIconMap: Record<string, string> = {
  'Listening Part 1': '🎧 Listening Part 1',
  'Listening Part 2': '🎧 Listening Part 2',
  'Listening Part 3': '🗣️ Listening Part 3',
  'Listening Part 4': '📢 Listening Part 4',
  'Reading Part 5':   '📝 Reading Part 5',
  'Reading Part 6':   '📄 Reading Part 6',
  'Reading Part 7':   '📰 Reading Part 7',
  Listening:          '🎧 Listening',
  Reading:            '📖 Reading',
  Writing:            '✍️ Writing',
  Speaking:           '🎤 Speaking',
  Grammar:            '📝 Grammar',
  'Text Completion':  '📄 Text Completion',
}

function sectionLabel(s: string): string {
  return sectionIconMap[s] ?? s
}
</script>
