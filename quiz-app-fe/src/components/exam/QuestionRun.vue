<template>
  <section class="space-y-3" :data-test="`run-${run.from}`">
    <header>
      <h3 class="text-foreground text-sm font-bold">
        {{ $t('exam.take.questionsRange', { from: run.from, to: run.to }) }}
        <span class="bg-muted text-muted-foreground ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">{{ $t(`exam.qtype.${run.type}`) }}</span>
      </h3>
      <p v-if="run.instruction" class="text-muted-foreground mt-1.5 text-xs leading-relaxed">{{ run.instruction }}</p>
    </header>

    <!-- Matching: the list is shown once, each question picks from it -->
    <div v-if="shared" class="bg-muted/30 border-border rounded-xl border p-3.5" :data-test="`shared-${run.from}`">
      <div class="text-muted-foreground mb-2 text-[11px] font-bold uppercase tracking-wider">
        {{ run.type === 'matching-headings' ? $t('exam.take.listOfHeadings') : $t('exam.take.listOfOptions') }}
      </div>
      <ul class="space-y-1">
        <li v-for="(opt, i) in shared" :key="i" class="text-foreground flex gap-2 text-sm">
          <span class="text-primary w-6 shrink-0 font-bold">{{ optionLabel(run.type, i) }}</span>
          <span>{{ opt }}</span>
        </li>
      </ul>
    </div>

    <div v-for="q in run.questions" :key="q.id" class="space-y-2" :data-test="`q-${q.id}`">
      <!-- Typed answer: the gap is an inline box -->
      <div v-if="isTyped(q)" class="text-foreground flex flex-wrap items-baseline gap-x-2 gap-y-1.5 text-sm leading-relaxed">
        <span class="bg-primary/10 text-primary inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold">{{ numberOf(q.id) }}</span>
        <template v-if="gapParts(q.question)">
          <span>{{ gapParts(q.question)![0] }}</span>
          <input
            type="text"
            class="border-border bg-card focus:border-primary focus:ring-primary/30 w-44 rounded-lg border px-2.5 py-1 text-sm focus:ring-1 focus:outline-none"
            :value="written[q.id] ?? ''"
            :placeholder="$t('exam.take.answerPlaceholder')"
            :aria-label="$t('exam.take.answerFor', { n: numberOf(q.id) })"
            autocomplete="off"
            spellcheck="false"
            :data-test="`answer-${q.id}`"
            @input="$emit('write', q.id, ($event.target as HTMLInputElement).value)"
          />
          <span>{{ gapParts(q.question)![1] }}</span>
        </template>
        <template v-else>
          <span>{{ q.question }}</span>
          <input
            type="text"
            class="border-border bg-card focus:border-primary focus:ring-primary/30 w-44 rounded-lg border px-2.5 py-1 text-sm focus:ring-1 focus:outline-none"
            :value="written[q.id] ?? ''"
            :placeholder="$t('exam.take.answerPlaceholder')"
            :aria-label="$t('exam.take.answerFor', { n: numberOf(q.id) })"
            autocomplete="off"
            spellcheck="false"
            :data-test="`answer-${q.id}`"
            @input="$emit('write', q.id, ($event.target as HTMLInputElement).value)"
          />
        </template>
      </div>

      <!-- Matching: a drop-down with the letters / numerals of the shared list -->
      <div v-else-if="shared" class="text-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span class="bg-primary/10 text-primary inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold">{{ numberOf(q.id) }}</span>
        <span class="flex-1">{{ q.question }}</span>
        <select
          class="border-border bg-card focus:border-primary rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none"
          :value="selected[q.id] ?? ''"
          :aria-label="$t('exam.take.answerFor', { n: numberOf(q.id) })"
          :data-test="`answer-${q.id}`"
          @change="onPick(q.id, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">—</option>
          <option v-for="(_, i) in shared" :key="i" :value="i">{{ optionLabel(run.type, i) }}</option>
        </select>
      </div>

      <!-- True / False / Not Given and Yes / No / Not Given: three buttons in a row -->
      <div v-else-if="run.type === 'true-false-not-given' || run.type === 'yes-no-not-given'" class="space-y-2">
        <p class="text-foreground flex gap-2 text-sm leading-relaxed">
          <span class="bg-primary/10 text-primary inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold">{{ numberOf(q.id) }}</span>
          <span>{{ q.question }}</span>
        </p>
        <div class="flex flex-wrap gap-2 pl-8">
          <button
            v-for="(opt, i) in q.options"
            :key="i"
            type="button"
            class="rounded-lg border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-all"
            :class="selected[q.id] === i ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'"
            :aria-pressed="selected[q.id] === i"
            :data-test="`option-${q.id}-${i}`"
            @click="$emit('select', q.id, i)"
          >{{ opt }}</button>
        </div>
      </div>

      <!-- Multiple choice -->
      <div v-else class="space-y-2">
        <p class="text-foreground flex gap-2 text-sm font-semibold leading-relaxed">
          <span class="bg-primary/10 text-primary inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold">{{ numberOf(q.id) }}</span>
          <span>{{ q.question }}</span>
        </p>
        <div class="space-y-1.5 pl-8">
          <button
            v-for="(opt, i) in q.options"
            :key="i"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition-all"
            :class="selected[q.id] === i ? 'border-primary bg-primary/15 text-foreground font-medium' : 'border-border text-foreground hover:border-primary/50 hover:bg-primary/5'"
            :aria-pressed="selected[q.id] === i"
            :data-test="`option-${q.id}-${i}`"
            @click="$emit('select', q.id, i)"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              :class="selected[q.id] === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
            >{{ optionLabel(run.type, i) }}</span>
            <span>{{ opt }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { hasSharedOptions, isTyped, optionLabel, type QuestionRun } from '@/utils/ielts'

const props = defineProps<{
  run: QuestionRun
  /** Number shown for a question id (numbering restarts for each skill). */
  numberOf: (id: number) => number
  selected: Record<number, number>
  written: Record<number, string>
}>()

const emit = defineEmits<{
  (e: 'select', id: number, option: number): void
  (e: 'write', id: number, text: string): void
}>()

/** The list shared by every question of a matching run (it is the same in each question). */
const shared = computed(() =>
  hasSharedOptions(props.run.type) ? (props.run.questions[0]?.options ?? null) : null,
)

/** "Name of the tour: ______ Gardens" → ["Name of the tour:", "Gardens"]; null when there is no gap. */
function gapParts(text: string): [string, string] | null {
  const m = /^(.*?)_{3,}(.*)$/s.exec(text)
  return m ? [m[1]!.trim(), m[2]!.trim()] : null
}

function onPick(id: number, value: string) {
  if (value !== '') emit('select', id, Number(value))
}
</script>
