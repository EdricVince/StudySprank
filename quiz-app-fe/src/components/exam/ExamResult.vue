<template>
  <div class="space-y-6">
    <AiGeneratedBadge />

    <!-- Overall band -->
    <div class="bg-card border-border flex flex-wrap items-center gap-8 rounded-2xl border p-6" data-test="overall">
      <div class="flex flex-col items-center gap-1 text-center">
        <span class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{{ $t('exam.res.overall') }}</span>
        <span class="text-6xl font-black leading-none tabular-nums" :style="{ color: bandColor }" data-test="overall-band">{{ overallText }}</span>
        <span class="text-muted-foreground text-sm">{{ result.level }}</span>
        <span class="bg-primary/15 text-primary mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold">{{ examType.toUpperCase() }}</span>
      </div>

      <div class="flex flex-1 flex-wrap items-stretch gap-3" data-test="skill-bands">
        <div
          v-for="s in skillRows"
          :key="s.skill"
          class="border-border min-w-32 flex-1 rounded-xl border px-4 py-3"
        >
          <div class="text-muted-foreground text-xs font-semibold">{{ s.icon }} {{ $t(`exam.skillNames.${s.skill}`) }}</div>
          <div class="mt-1 text-3xl font-extrabold tabular-nums" :style="{ color: colorOfBand(s.band) }">{{ bandText(s.band) }}</div>
          <div v-if="s.total" class="text-muted-foreground mt-0.5 text-xs">{{ $t('exam.res.correctOf', { correct: s.correct, total: s.total }) }}</div>
        </div>
      </div>

      <div class="text-muted-foreground w-full text-xs leading-relaxed">
        {{ $t('exam.res.score', { percent: result.score_percent, correct: result.correct, total: result.total }) }}
        · {{ $t('exam.res.bandNote') }}
      </div>
    </div>

    <!-- Section Breakdown -->
    <div class="bg-card border-border space-y-4 rounded-2xl border p-5">
      <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">{{ $t('exam.breakdown') }}</h3>
      <div v-for="b in result.breakdown" :key="b.section" class="space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-foreground text-sm font-medium">{{ sectionLabel(b.section) }}</span>
          <span class="text-muted-foreground font-mono text-xs">{{ b.correct }}/{{ b.total }}</span>
        </div>
        <div class="bg-border h-2 overflow-hidden rounded-full">
          <div
            class="h-full rounded-full transition-all duration-700"
            :style="{ width: (b.total ? (b.correct / b.total) * 100 : 0) + '%', background: barColor(b.total ? b.correct / b.total : 0) }"
          />
        </div>
      </div>
    </div>

    <!-- Writing feedback (marked by the AI against the public band descriptors) -->
    <div v-if="result.writing_feedback?.length" class="bg-card border-border space-y-5 rounded-2xl border p-5" data-test="writing-feedback">
      <h3 class="text-xs font-bold uppercase tracking-wider text-violet-400">✍️ {{ $t('exam.res.writingFeedback') }}</h3>
      <div v-for="fb in result.writing_feedback" :key="fb.task" class="space-y-3" :data-test="`feedback-${fb.task}`">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-400">
            {{ fb.task === 'writing-task1' ? $t('exam.take.taskN', { n: 1 }) : $t('exam.take.taskN', { n: 2 }) }}
          </span>
          <span class="text-muted-foreground text-xs">{{ $t('exam.take.wordsN', { n: fb.words }) }}</span>
          <span class="ml-auto text-lg font-extrabold tabular-nums" :style="{ color: colorOfBand(fb.band) }">{{ bandText(fb.band) }}</span>
        </div>
        <ul v-if="fb.criteria.length" class="space-y-2">
          <li v-for="c in fb.criteria" :key="c.key" class="border-border rounded-xl border p-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-foreground text-sm font-semibold">{{ criterionLabel(fb.task, c.key) }}</span>
              <span class="text-sm font-bold tabular-nums" :style="{ color: colorOfBand(c.band) }">{{ bandText(c.band) }}</span>
            </div>
            <p v-if="c.comment" class="text-muted-foreground mt-1 text-xs leading-relaxed">{{ c.comment }}</p>
          </li>
        </ul>
        <p v-else class="text-muted-foreground text-xs">{{ $t('exam.res.tooShort') }}</p>
        <div v-if="fb.strengths.length" class="text-sm">
          <div class="mb-1 text-xs font-bold uppercase tracking-wider text-green-500">{{ $t('exam.res.strengths') }}</div>
          <ul class="space-y-1">
            <li v-for="(s, i) in fb.strengths" :key="i" class="text-foreground">+ {{ s }}</li>
          </ul>
        </div>
        <div v-if="fb.improvements.length" class="text-sm">
          <div class="mb-1 text-xs font-bold uppercase tracking-wider text-amber-500">{{ $t('exam.res.improvements') }}</div>
          <ul class="space-y-1">
            <li v-for="(s, i) in fb.improvements" :key="i" class="text-foreground">→ {{ s }}</li>
          </ul>
        </div>
      </div>
    </div>
    <div
      v-else-if="result.writing_responses?.length"
      class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400"
      data-test="writing-not-marked"
    >{{ $t('exam.res.writingNotMarked') }}</div>

    <!-- Weak Areas -->
    <div v-if="result.weak_areas.length" class="bg-card border-border space-y-3 rounded-2xl border p-5">
      <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">{{ $t('exam.weakAreas') }}</h3>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="area in result.weak_areas"
          :key="area"
          class="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-400"
        >{{ sectionLabel(area) }}</span>
      </div>
    </div>

    <!-- Recommendations -->
    <div class="bg-card border-border space-y-3 rounded-2xl border p-5">
      <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">{{ $t('exam.recommendations') }}</h3>
      <ul class="space-y-2">
        <li
          v-for="(rec, i) in result.recommendations"
          :key="i"
          class="text-foreground before:text-primary relative pl-5 text-sm leading-relaxed before:absolute before:left-0 before:content-['→']"
        >{{ rec }}</li>
      </ul>
    </div>

    <!-- Answer review (answer key is revealed only after submission) -->
    <div v-if="result.review?.length" class="bg-card border-border space-y-4 rounded-2xl border p-5">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">{{ $t('exam.review.title') }}</h3>
        <button
          type="button"
          class="border-border text-foreground hover:bg-accent rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          :aria-expanded="showReview"
          @click="showReview = !showReview"
        >{{ showReview ? $t('exam.review.hide') : $t('exam.review.show') }}</button>
      </div>
      <div v-if="showReview" class="space-y-4">
        <div
          v-for="(item, i) in result.review"
          :key="item.question_id"
          class="border-border space-y-2 rounded-xl border p-4"
        >
          <div class="flex items-start gap-2">
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              :class="isRight(item) ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'"
            >{{ isRight(item) ? '✓' : '✗' }}</span>
            <p class="text-foreground text-sm font-medium leading-relaxed">
              <span class="text-muted-foreground">{{ sectionLabel(item.section) }} ·</span> {{ i + 1 }}. {{ item.question }}
            </p>
          </div>
          <p class="text-sm">
            <span class="text-muted-foreground">{{ $t('exam.review.yourAnswer') }}: </span>
            <span :class="isRight(item) ? 'text-green-500' : 'text-red-400'">{{ yourAnswer(item) ?? $t('exam.review.notAnswered') }}</span>
          </p>
          <p v-if="!isRight(item)" class="text-sm">
            <span class="text-muted-foreground">{{ $t('exam.review.correctAnswer') }}: </span>
            <span class="text-green-500">{{ rightAnswer(item) }}</span>
          </p>
          <p v-if="item.explanation" class="text-muted-foreground text-xs leading-relaxed">
            <span class="font-semibold">{{ $t('exam.review.explanation') }}:</span> {{ item.explanation }}
          </p>
        </div>
      </div>
    </div>

    <!-- Writing Responses -->
    <div v-if="result.writing_responses?.length" class="bg-card border-border space-y-4 rounded-2xl border p-5">
      <h3 class="text-muted-foreground text-xs font-bold uppercase tracking-wider">✍️ {{ $t('exam.res.yourWriting') }}</h3>
      <div v-for="(wr, i) in result.writing_responses" :key="i" class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-400">
            {{ $t('exam.take.taskN', { n: wr.task === 'writing-task1' ? 1 : 2 }) }}
          </span>
          <span class="text-muted-foreground text-xs">{{ $t('exam.take.wordsN', { n: countWords(wr.text) }) }}</span>
        </div>
        <div class="border-border bg-muted/20 text-foreground max-h-48 overflow-y-auto rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap">{{ wr.text }}</div>
      </div>
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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AiGeneratedBadge from '@/components/common/AiGeneratedBadge.vue'
import { bandText, countWords, overallBandOf, partNumber, skillOfSection } from '@/utils/ielts'
import type { ExamResultView, ExamReviewRow } from '@/types/content'

const props = defineProps<{ result: ExamResultView; examType: string }>()
defineEmits<{ (e: 'retry'): void; (e: 'schedule'): void }>()
const { t } = useI18n({ useScope: 'global' })

const overall = computed(() =>
  overallBandOf({ overall_band: props.result.overall_band, estimated_band: props.result.estimated_band }),
)
/** Older sittings only have a range ("6.0–6.5"): it is shown as it was. */
const overallText = computed(() =>
  typeof props.result.overall_band === 'number' ? bandText(props.result.overall_band) : props.result.estimated_band,
)

function colorOfBand(band: number | null | undefined): string {
  if (typeof band !== 'number') return 'currentColor'
  if (band >= 7) return '#22c55e'
  if (band >= 5.5) return '#f59e0b'
  return '#ef4444'
}
const bandColor = computed(() => colorOfBand(overall.value))

function barColor(ratio: number): string {
  if (ratio >= 0.8) return '#22c55e'
  if (ratio >= 0.6) return '#f59e0b'
  return '#ef4444'
}

const ICONS = { Listening: '🎧', Reading: '📖', Writing: '✍️' } as const
const skillRows = computed(() =>
  (props.result.skills ?? []).map((s) => ({ ...s, icon: ICONS[s.skill] })),
)

/** "Listening Part 3" → "🎧 Listening · Part 3"; older papers' "Reading" → "📖 Reading". */
function sectionLabel(section: string): string {
  const skill = skillOfSection(section)
  if (!skill) return section
  const name = t(`exam.skillNames.${skill}`)
  const isPart = /\d+\s*$/.test(section)
  const part = !isPart || skill === 'Writing'
    ? ''
    : ` · ${t(skill === 'Listening' ? 'exam.take.partN' : 'exam.take.passageN', { n: partNumber(section) })}`
  return `${ICONS[skill]} ${name}${part}`
}

/** Task Achievement is called Task Response in Task 2. */
const criterionLabel = (task: string, key: string) =>
  t(`exam.res.criteria.${key === 'task_achievement' && task === 'writing-task2' ? 'task_response' : key}`)

const showReview = ref(false)

const isRight = (item: ExamReviewRow) =>
  item.is_correct ?? (item.selected !== null && item.selected === item.correct_answer)

const optionText = (item: ExamReviewRow, index: number | null) =>
  index !== null && index >= 0 ? (item.options[index] ?? null) : null

/** What the student gave: the option for choice questions, the typed text for the others. */
const yourAnswer = (item: ExamReviewRow) =>
  item.options.length ? optionText(item, item.selected) : item.written?.trim() || null

/** The right answer: the option, or the (first) accepted spelling for typed questions. */
const rightAnswer = (item: ExamReviewRow) =>
  item.options.length ? optionText(item, item.correct_answer) : (item.accepted_answers ?? []).join(' / ')
</script>
