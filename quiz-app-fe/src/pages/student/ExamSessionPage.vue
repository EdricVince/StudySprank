<template>
  <div class="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
    <!-- Loading -->
    <div v-if="loading" class="flex min-h-64 flex-col items-center justify-center gap-4">
      <div class="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      <template v-if="attemptParam">
        <p class="text-muted-foreground text-sm">{{ $t('exam.viewLoading') }}</p>
      </template>
      <template v-else>
        <p class="text-muted-foreground text-sm">{{ $t('exam.loading', { type: examType.toUpperCase() }) }}</p>
        <p class="text-muted-foreground max-w-md text-center text-xs">{{ $t('exam.generatingHint') }}</p>
      </template>
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" class="flex min-h-64 flex-col items-center justify-center gap-5 text-center">
      <div class="text-4xl">⚠️</div>
      <div>
        <h3 class="text-foreground text-lg font-bold">{{ $t('exam.genFailedTitle') }}</h3>
        <p class="text-muted-foreground mt-1 max-w-sm text-sm">{{ loadError }}</p>
      </div>
      <button
        class="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
        @click="retryLoad"
      >{{ $t('exam.tryAgain') }}</button>
    </div>

    <!-- Test in progress: one skill at a time, as in the real test -->
    <template v-else-if="!finished && skills.length > 0">
      <!-- Header: skills, timer -->
      <div class="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
        <ol class="flex flex-wrap items-center gap-2" data-test="skill-steps">
          <li
            v-for="(s, i) in skills"
            :key="s"
            class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
            :class="i === skillIdx ? skillStyle[s].active : i < skillIdx ? 'border-border text-muted-foreground opacity-70' : 'border-border text-muted-foreground'"
            :aria-current="i === skillIdx ? 'step' : undefined"
          >
            <span>{{ i < skillIdx ? '✓' : skillStyle[s].icon }}</span>
            {{ $t(`exam.skillNames.${s}`) }}
            <span class="font-normal opacity-70">· {{ $t('exam.minutesN', { n: minutesOf(s) }) }}</span>
          </li>
        </ol>
        <ExamTimer :key="skill" :total-seconds="minutesOf(skill) * 60" data-test="skill-timer" @timeout="onSkillTimeout" />
      </div>

      <!-- Parts of this skill -->
      <div class="flex gap-2 overflow-x-auto pb-1" data-test="part-tabs">
        <button
          v-for="(p, i) in skillParts"
          :key="p.section"
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
          :class="i === partIdx ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:bg-accent'"
          @click="goPart(i)"
        >
          {{ partLabel(p) }}
          <span class="rounded-full px-1.5 py-0.5 text-[10px]" :class="i === partIdx ? 'bg-primary/20' : 'bg-muted'">
            {{ answeredIn(p) }}/{{ p.questions.length }}
          </span>
        </button>
      </div>

      <!-- Current part -->
      <div v-if="part" class="space-y-4" :data-test="`part-${part.section}`">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full px-3 py-0.5 text-xs font-bold" :class="skillStyle[skill].badge">{{ skillStyle[skill].icon }} {{ partLabel(part) }}</span>
          <span v-if="partKind(part)" class="text-muted-foreground text-xs">{{ partKind(part) }}</span>
          <span v-if="skill !== 'Writing'" class="text-muted-foreground ml-auto text-xs">
            {{ $t('exam.take.questionsRange', { from: numberOf(part.questions[0]!.id), to: numberOf(part.questions[part.questions.length - 1]!.id) }) }}
          </span>
        </div>

        <!-- Listening: audio on top, questions below (no transcript) -->
        <template v-if="skill === 'Listening'">
          <ListeningPlayer v-if="part.text" :script="part.text" :label="partLabel(part)" />
          <div class="bg-card border-border space-y-6 rounded-2xl border p-5">
            <QuestionRun
              v-for="run in runs"
              :key="run.from"
              :run="run"
              :number-of="numberOf"
              :selected="selected"
              :written="written"
              @select="onSelect"
              @write="onWrite"
            />
          </div>
        </template>

        <!-- Reading: passage next to the questions -->
        <div v-else-if="skill === 'Reading'" class="grid items-start gap-4 lg:grid-cols-2">
          <article
            class="bg-card border-border rounded-2xl border p-5 lg:sticky lg:top-4 lg:max-h-[75vh] lg:overflow-y-auto"
            data-test="reading-passage"
          >
            <div class="text-muted-foreground mb-3 text-[11px] font-bold uppercase tracking-wider">{{ $t('exam.take.passageLabel') }}</div>
            <div class="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{{ part.text }}</div>
          </article>
          <div class="bg-card border-border space-y-6 rounded-2xl border p-5">
            <QuestionRun
              v-for="run in runs"
              :key="run.from"
              :run="run"
              :number-of="numberOf"
              :selected="selected"
              :written="written"
              @select="onSelect"
              @write="onWrite"
            />
          </div>
        </div>

        <!-- Writing: one task at a time -->
        <div v-else class="space-y-4">
          <div class="flex gap-2">
            <button
              v-for="(q, i) in part.questions"
              :key="q.id"
              type="button"
              class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all"
              :class="i === taskIdx ? 'border-violet-500 bg-violet-500/15 text-violet-400' : 'border-border text-muted-foreground hover:bg-accent'"
              :data-test="`task-tab-${i + 1}`"
              @click="taskIdx = i"
            >{{ $t('exam.take.taskN', { n: i + 1 }) }} <span v-if="isAnswered(q)" aria-hidden="true">✓</span></button>
          </div>

          <template v-for="(q, i) in part.questions" :key="q.id">
            <div v-if="i === taskIdx" class="space-y-4" :data-test="`writing-task-${i + 1}`">
              <div v-if="chartOf(q)" class="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div class="mb-3 text-xs font-bold uppercase tracking-wider text-violet-400">{{ $t('exam.take.visual') }}</div>
                <IeltsChart :data="chartOf(q)!" />
              </div>
              <div class="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                <div class="mb-2 flex items-center gap-2">
                  <span class="text-sm font-bold text-violet-400">✍️ {{ $t('exam.take.writingTask', { n: i + 1 }) }}</span>
                  <span class="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                    {{ $t('exam.take.minWords', { n: minWords(q) }) }}
                  </span>
                </div>
                <p class="text-foreground text-sm leading-relaxed whitespace-pre-line">{{ q.question }}</p>
              </div>
              <div class="space-y-2">
                <textarea
                  class="border-border bg-card/50 text-foreground placeholder:text-muted-foreground/50 w-full resize-none rounded-xl border p-4 text-sm leading-relaxed transition-all focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 focus:outline-none"
                  rows="14"
                  :placeholder="i === 0 ? $t('exam.take.task1Placeholder') : $t('exam.take.task2Placeholder')"
                  :value="written[q.id] ?? ''"
                  :data-test="`writing-input-${i + 1}`"
                  @input="onWrite(q.id, ($event.target as HTMLTextAreaElement).value)"
                />
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-foreground" :data-test="`word-count-${i + 1}`">{{ $t('exam.take.wordsN', { n: countWords(written[q.id] ?? '') }) }}</span>
                  <span :class="countWords(written[q.id] ?? '') >= minWords(q) ? 'font-semibold text-green-400' : 'text-amber-400'">
                    {{ countWords(written[q.id] ?? '') >= minWords(q) ? '✓ ' + $t('exam.take.minMet') : $t('exam.take.minLeft', { n: minWords(q) }) }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div v-if="submitError" class="info-box info-box-red text-sm text-red-400" data-test="submit-error">⚠ {{ submitError }}</div>

      <!-- Navigation -->
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          class="border-border text-muted-foreground hover:bg-accent rounded-lg border px-4 py-2 text-sm transition-colors disabled:opacity-30"
          :disabled="partIdx === 0"
          @click="goPart(partIdx - 1)"
        >{{ $t('exam.take.prevPart') }}</button>

        <button
          v-if="partIdx < skillParts.length - 1"
          type="button"
          class="border-border text-muted-foreground hover:bg-accent rounded-lg border px-4 py-2 text-sm transition-colors"
          data-test="next-part"
          @click="goPart(partIdx + 1)"
        >{{ $t('exam.take.nextPart') }}</button>
        <button
          v-else
          type="button"
          class="rounded-lg bg-green-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
          :disabled="submitting"
          data-test="finish-skill"
          @click="askFinish"
        >{{ isLastSkill ? (submitting ? $t('exam.submitting') : $t('exam.submit')) : $t('exam.take.finishSkill', { skill: skillName }) }}</button>
      </div>

      <!-- Confirm leaving a skill: the real test does not let you go back -->
      <div v-if="confirming" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" data-test="finish-dialog">
        <div class="bg-card border-border w-full max-w-md space-y-4 rounded-2xl border p-6 shadow-2xl">
          <h3 class="text-foreground text-lg font-bold">{{ isLastSkill ? $t('exam.take.submitTitle') : $t('exam.take.leaveTitle', { skill: skillName }) }}</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            {{ isLastSkill ? $t('exam.take.submitBody') : $t('exam.take.leaveBody', { skill: skillName }) }}
          </p>
          <p v-if="unanswered > 0" class="text-sm font-semibold text-amber-400" data-test="unanswered">{{ $t('exam.take.unanswered', { n: unanswered }) }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="border-border text-foreground hover:bg-accent rounded-lg border px-4 py-2 text-sm font-semibold" @click="confirming = false">{{ $t('exam.take.keepWorking') }}</button>
            <button type="button" class="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700" data-test="confirm-finish" @click="confirmFinish">{{ isLastSkill ? $t('exam.submit') : $t('exam.take.continue') }}</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Result -->
    <div v-else-if="result" class="space-y-6">
      <h2 class="text-foreground text-2xl font-extrabold">{{ $t('exam.resultTitle', { type: examType.toUpperCase() }) }}</h2>
      <ExamResult :result="result" :exam-type="examType" @retry="resetExam" @schedule="goSchedule" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ExamTimer from '@/components/exam/ExamTimer.vue'
import ExamResult from '@/components/exam/ExamResult.vue'
import IeltsChart, { type ChartData } from '@/components/exam/IeltsChart.vue'
import ListeningPlayer from '@/components/exam/ListeningPlayer.vue'
import QuestionRun from '@/components/exam/QuestionRun.vue'
import { api } from '@/utils/api'
import { errorText } from '@/utils/skills'
import {
  EXAM_SKILLS,
  countWords,
  partsOf,
  runsOf,
  skillOfSection,
  WRITING_MIN_WORDS,
  type ExamPart,
  type ExamSkill,
} from '@/utils/ielts'
import type { ExamQuestionView, ExamResultView } from '@/types/content'

const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
// The Entrance Exam is IELTS only.
const examType = ref('ielts')
// ?paper=<id> re-sits a stored paper; ?attempt=<id> opens the saved result of a past sitting.
const paperParam = Number(route.query.paper) || undefined
const attemptParam = Number(route.query.attempt) || undefined

const loading = ref(true)
const finished = ref(false)
const loadError = ref('')
const questions = ref<ExamQuestionView[]>([])
const selected = ref<Record<number, number>>({})
const written = ref<Record<number, string>>({})
const result = ref<ExamResultView | null>(null)
const sessionId = ref('')
const submitting = ref(false)
const submitError = ref('')
const skillMinutes = ref<Record<ExamSkill, number>>({ Listening: 30, Reading: 60, Writing: 60 })

// ── Where the student is: skill → part → (Writing) task ─────────────────────────
const parts = computed(() => partsOf(questions.value))
const skills = computed(() => EXAM_SKILLS.filter((s) => parts.value.some((p) => p.skill === s)))
const skillIdx = ref(0)
const partIdx = ref(0)
const taskIdx = ref(0)
const confirming = ref(false)

const skill = computed<ExamSkill>(() => skills.value[skillIdx.value] ?? 'Listening')
const skillName = computed(() => t(`exam.skillNames.${skill.value}`))
const isLastSkill = computed(() => skillIdx.value >= skills.value.length - 1)
const skillParts = computed(() => parts.value.filter((p) => p.skill === skill.value))
const part = computed<ExamPart | undefined>(() => skillParts.value[partIdx.value])

const minutesOf = (s: ExamSkill) => skillMinutes.value[s]

const skillStyle: Record<ExamSkill, { icon: string; badge: string; active: string }> = {
  Listening: { icon: '🎧', badge: 'sec-blue', active: 'border-blue-500 bg-blue-500/15 text-blue-400' },
  Reading: { icon: '📖', badge: 'sec-green', active: 'border-emerald-500 bg-emerald-500/15 text-emerald-400' },
  Writing: { icon: '✍️', badge: 'sec-violet', active: 'border-violet-500 bg-violet-500/15 text-violet-400' },
}

/** Question numbers restart for each skill (1–30 in Listening, 1–30 in Reading). */
const numbers = computed(() => {
  const map = new Map<number, number>()
  const counters: Partial<Record<ExamSkill, number>> = {}
  for (const q of questions.value) {
    const s = skillOfSection(q.section)
    if (!s) continue
    counters[s] = (counters[s] ?? 0) + 1
    map.set(q.id, counters[s]!)
  }
  return map
})
const numberOf = (id: number) => numbers.value.get(id) ?? id

const runs = computed(() => (part.value ? runsOf(part.value.questions, numberOf) : []))

function partLabel(p: ExamPart): string {
  if (p.skill === 'Writing') return t('exam.skillNames.Writing')
  return t(p.skill === 'Listening' ? 'exam.take.partN' : 'exam.take.passageN', { n: p.number })
}
function partKind(p: ExamPart): string {
  return p.skill === 'Listening' && p.number >= 1 && p.number <= 4 ? t(`exam.take.listeningKinds.p${p.number}`) : ''
}

const isAnswered = (q: ExamQuestionView) =>
  selected.value[q.id] !== undefined || !!written.value[q.id]?.trim()
const answeredIn = (p: ExamPart) => p.questions.filter(isAnswered).length
const unanswered = computed(() => {
  const all = skillParts.value.flatMap((p) => p.questions)
  return all.filter((q) => !isAnswered(q)).length
})

function goPart(i: number) {
  partIdx.value = Math.min(Math.max(i, 0), skillParts.value.length - 1)
  taskIdx.value = 0
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
}

function onSelect(id: number, option: number) {
  selected.value = { ...selected.value, [id]: option }
}
function onWrite(id: number, text: string) {
  written.value = { ...written.value, [id]: text }
}

// ── Finishing a skill ──────────────────────────────────────────────────────────
function askFinish() {
  confirming.value = true
}
function confirmFinish() {
  confirming.value = false
  nextSkill()
}
/** Move on to the next skill (no way back), or hand the paper in after the last one. */
function nextSkill() {
  if (isLastSkill.value) {
    void submitExam()
    return
  }
  skillIdx.value++
  partIdx.value = 0
  taskIdx.value = 0
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
}
function onSkillTimeout() {
  confirming.value = false
  nextSkill()
}
// The timer of a skill ends it even while the dialog is open.
watch(skill, () => { confirming.value = false })

// ── Writing helpers ────────────────────────────────────────────────────────────
function chartOf(q: ExamQuestionView): ChartData | null {
  if (q.type !== 'writing-task1' || !q.passage) return null
  try {
    const parsed = JSON.parse(q.passage)
    return parsed && parsed.type ? (parsed as ChartData) : null
  } catch {
    return null
  }
}
const minWords = (q: ExamQuestionView) =>
  q.type === 'writing-task1' ? WRITING_MIN_WORDS['writing-task1'] : WRITING_MIN_WORDS['writing-task2']

// ── Loading and submitting ─────────────────────────────────────────────────────
onMounted(() => (attemptParam ? loadSavedResult(attemptParam) : loadExam(paperParam)))

/** Open the stored result of a past sitting (history → "View result"). */
async function loadSavedResult(attemptId: number) {
  loading.value = true
  loadError.value = ''
  try {
    result.value = await api.getExamAttempt(attemptId)
    finished.value = true
  } catch (e) {
    loadError.value = errorText(e, t('exam.viewFailed'))
  } finally {
    loading.value = false
  }
}

// `paperId` re-sits a stored paper (no AI call); without it a brand-new paper is generated and saved.
async function loadExam(paperId?: number) {
  loading.value = true
  loadError.value = ''
  questions.value = []
  try {
    const variant = Math.floor(Math.random() * 18)
    const data = await api.generateExam(paperId ? { paper_id: paperId } : { variant })
    questions.value = data.questions
    sessionId.value = data.session_id
    if (data.skill_minutes) skillMinutes.value = data.skill_minutes
    skillIdx.value = 0
    partIdx.value = 0
    taskIdx.value = 0
  } catch (e) {
    loadError.value = errorText(e, t('exam.genFailed'))
  } finally {
    loading.value = false
  }
}

async function submitExam() {
  // The timer's timeout and the Submit button can both fire — submit once.
  if (submitting.value) return
  submitting.value = true
  submitError.value = ''
  const answerList = [
    ...Object.entries(selected.value).map(([id, sel]) => ({ question_id: Number(id), selected: sel })),
    ...Object.entries(written.value)
      .filter(([, text]) => text.trim())
      .map(([id, text]) => ({ question_id: Number(id), written: text })),
  ]
  try {
    // The server grades the attempt, saves it and returns the result (bands, review, writing feedback).
    result.value = await api.submitExam({
      answers: answerList,
      session_id: sessionId.value,
      language: (['en', 'vi', 'zh'] as const).find((l) => l === locale.value) ?? 'en',
    })
    finished.value = true
  } catch (e) {
    // Keep the answers so the student can retry instead of seeing a fake 0-point result.
    submitError.value = errorText(e, t('exam.submitFailed'))
    // Back on the last skill so the Submit button is there to try again.
    skillIdx.value = skills.value.length - 1
  } finally {
    submitting.value = false
  }
}

function retryLoad() {
  return attemptParam ? loadSavedResult(attemptParam) : loadExam(paperParam)
}

function resetExam() {
  finished.value = false
  selected.value = {}
  written.value = {}
  result.value = null
  submitError.value = ''
  loadExam()
}

function goSchedule() { router.push('/schedule') }
</script>
