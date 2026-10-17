<template>
  <div class="mx-auto max-w-3xl space-y-6 p-6">
    <!-- Loading -->
    <div v-if="loading" class="flex min-h-64 flex-col items-center justify-center gap-4">
      <div class="border-primary h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
      <p class="text-muted-foreground text-sm">{{ $t('exam.loading', { type: examType.toUpperCase() }) }}</p>
      <p class="text-muted-foreground text-xs">{{ $t('exam.generatingHint') }}</p>
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" class="flex min-h-64 flex-col items-center justify-center gap-5 text-center">
      <div class="text-4xl">⚠️</div>
      <div>
        <h3 class="text-foreground text-lg font-bold">{{ $t('exam.genFailedTitle') }}</h3>
        <p class="text-muted-foreground mt-1 text-sm max-w-sm">{{ loadError }}</p>
      </div>
      <button
        class="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-colors"
        @click="loadExam"
      >{{ $t('exam.tryAgain') }}</button>
    </div>

    <!-- Exam Active -->
    <template v-else-if="!finished && questions.length > 0">
      <!-- Header -->
      <div class="bg-card border-border flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
        <div class="flex items-center gap-3">
          <span class="bg-primary/10 text-primary rounded-lg px-3 py-1 text-xs font-bold tracking-wider uppercase">
            {{ examType.toUpperCase() }}
          </span>
          <span class="text-foreground text-sm font-semibold">
            {{ $t('exam.questionOf', { current: currentIdx + 1, total: questions.length }) }}
          </span>
          <span v-if="targetBand" class="sec-indigo rounded-full px-2.5 py-0.5 text-xs font-semibold">
            🎯 {{ targetBand }}
          </span>
        </div>

        <ExamTimer :total-seconds="timeLimitSecs" @timeout="submitExam" />
      </div>

      <!-- Section transition banner -->
      <div
        v-if="isNewSection"
        class="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all"
        :class="currentSectionStyle.banner"
      >
        <span class="text-lg">{{ currentSectionStyle.icon }}</span>
        <div>
          <div class="font-bold">{{ currentSection }}</div>
          <div class="text-xs opacity-70">{{ currentSectionDesc }}</div>
        </div>
        <div class="ml-auto text-xs opacity-60">{{ $t('exam.questionsN', questionsInSection) }}</div>
      </div>

      <!-- Progress bar -->
      <div class="bg-border h-1.5 w-full overflow-hidden rounded-full">
        <div
          class="bg-primary h-full rounded-full transition-all duration-300"
          :style="{ width: ((currentIdx + 1) / questions.length * 100) + '%' }"
        />
      </div>

      <!-- Section mini-tabs -->
      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="(sec, idx) in sectionSummary"
          :key="sec.name"
          class="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
          :class="idx === currentSectionIndex
            ? 'border-primary bg-primary/15 text-primary'
            : 'border-border text-muted-foreground hover:bg-accent'"
          @click="currentIdx = sec.startIdx"
        >
          {{ sec.icon }} {{ sec.name }}
          <span class="rounded-full px-1.5 py-0.5 text-[10px]" :class="idx === currentSectionIndex ? 'bg-primary/20' : 'bg-muted'">
            {{ sec.answered }}/{{ sec.total }}
          </span>
        </button>
      </div>

      <!-- Question -->
      <div class="bg-card border-border rounded-2xl border p-6">
        <ExamQuestion
          :question="questions[currentIdx]"
          :index="currentIdx"
          :total="questions.length"
          :selected="answers[currentIdx] ?? null"
          :show-result="false"
          :section-passage="sectionPassageMap[questions[currentIdx]?.section] ?? null"
          :writing-text="writingAnswers[currentIdx] ?? ''"
          @select="selectAnswer"
          @write="handleWrite"
        />
      </div>

      <div v-if="submitError" class="info-box info-box-red text-sm text-red-400">⚠ {{ submitError }}</div>

      <!-- Navigation -->
      <div class="flex items-center justify-between gap-4">
        <button
          class="border-border text-muted-foreground hover:bg-accent rounded-lg border px-4 py-2 text-sm transition-colors disabled:opacity-30"
          :disabled="currentIdx === 0"
          @click="currentIdx--"
        >{{ $t('exam.prev') }}</button>

        <div class="flex flex-wrap justify-center gap-1.5">
          <button
            v-for="(_, i) in questions"
            :key="i"
            class="h-2.5 w-2.5 rounded-full transition-all duration-200"
            :class="{
              'bg-primary': isAnswered(i) && i !== currentIdx,
              'bg-amber-400 scale-125': i === currentIdx,
              'bg-border': !isAnswered(i) && i !== currentIdx,
            }"
            @click="currentIdx = i"
          />
        </div>

        <button
          v-if="currentIdx < questions.length - 1"
          class="border-border text-muted-foreground hover:bg-accent rounded-lg border px-4 py-2 text-sm transition-colors"
          @click="currentIdx++"
        >{{ $t('exam.next') }}</button>
        <button
          v-else
          class="bg-green-600 hover:bg-green-700 rounded-lg px-5 py-2 text-sm font-bold text-white transition-colors disabled:opacity-60"
          :disabled="submitting"
          @click="submitExam"
        >{{ submitting ? $t('exam.submitting') : $t('exam.submit') }}</button>
      </div>
    </template>

    <!-- Result -->
    <div v-else class="space-y-6">
      <h2 class="text-foreground text-2xl font-extrabold">{{ $t('exam.resultTitle', { type: examType.toUpperCase() }) }}</h2>
      <ExamResult :result="result!" :exam-type="examType" @retry="resetExam" @schedule="goSchedule" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ExamTimer from '@/components/exam/ExamTimer.vue'
import ExamQuestion from '@/components/exam/ExamQuestion.vue'
import ExamResult from '@/components/exam/ExamResult.vue'
import { api } from '@/utils/api'
import { errorText } from '@/utils/skills'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const examType = ref((route.query.type as string) || 'ielts')
const targetBand = computed(() => (route.query.target as string) || localStorage.getItem('studyspark_target_band') || '')

const loading = ref(true)
const finished = ref(false)
const loadError = ref('')
const questions = ref<any[]>([])
const answers = ref<Record<number, number>>({})
const writingAnswers = ref<Record<number, string>>({})
const currentIdx = ref(0)
const timeLimitSecs = ref(1800)
const result = ref<any>(null)
const sessionId = ref('')
const submitting = ref(false)
const submitError = ref('')

// Section names come from the backend; `desc` is a key under exam.sections.*
const sectionStyleMap: Record<string, { icon: string; banner: string; desc: string }> = {
  'Listening Part 1':  { icon: '🎧', banner: 'sec-blue',   desc: 'listening1' },
  'Listening Part 2':  { icon: '🎧', banner: 'sec-cyan',   desc: 'listening2' },
  Reading:             { icon: '📖', banner: 'sec-green',  desc: 'reading' },
  Writing:             { icon: '✍️', banner: 'sec-violet', desc: 'writing' },
  'Listening Part 3':  { icon: '🗣️', banner: 'sec-cyan',   desc: 'listening3' },
  'Listening Part 4':  { icon: '📢', banner: 'sec-teal',   desc: 'listening4' },
  'Reading Part 5':    { icon: '📝', banner: 'sec-amber',  desc: 'reading5' },
  'Reading Part 6':    { icon: '📄', banner: 'sec-orange', desc: 'reading6' },
  'Reading Part 7':    { icon: '📰', banner: 'sec-green',  desc: 'reading7' },
  Listening:               { icon: '🎧', banner: 'sec-blue', desc: 'listening' },
  'Reading Passage 1':     { icon: '📖', banner: 'sec-teal', desc: 'passage1' },
  'Reading Passage 2':     { icon: '📖', banner: 'sec-cyan', desc: 'passage2' },
  'Listening — Lecture':   { icon: '🎓', banner: 'sec-teal', desc: 'lecture' },
  'Listening — Discussion':{ icon: '🗣️', banner: 'sec-cyan', desc: 'discussion' },
}

// Build section passage map: first passage per section for TTS replay
const sectionPassageMap = computed(() => {
  const map: Record<string, string> = {}
  for (const q of questions.value) {
    if (q.passage && !map[q.section]) {
      map[q.section] = q.passage
    }
  }
  return map
})

const currentSection = computed(() => questions.value[currentIdx.value]?.section ?? '')
const currentSectionStyle = computed(() => sectionStyleMap[currentSection.value] ?? { icon: '📋', banner: 'border-border bg-muted/20 text-foreground', desc: '' })
const currentSectionDesc = computed(() => currentSectionStyle.value.desc ? t(`exam.sections.${currentSectionStyle.value.desc}`) : '')

const isNewSection = computed(() => {
  if (currentIdx.value === 0) return true
  return questions.value[currentIdx.value]?.section !== questions.value[currentIdx.value - 1]?.section
})

const sectionSummary = computed(() => {
  const sections: { name: string; icon: string; startIdx: number; total: number; answered: number }[] = []
  let lastSection = ''
  questions.value.forEach((q, i) => {
    if (q.section !== lastSection) {
      sections.push({ name: q.section, icon: sectionStyleMap[q.section]?.icon ?? '📋', startIdx: i, total: 0, answered: 0 })
      lastSection = q.section
    }
    const sec = sections[sections.length - 1]
    if (sec) {
      sec.total++
      if (isAnswered(i)) sec.answered++
    }
  })
  return sections
})

const currentSectionIndex = computed(() => {
  const sec = questions.value[currentIdx.value]?.section
  return sectionSummary.value.findIndex(s => s.name === sec)
})

const questionsInSection = computed(() => sectionSummary.value[currentSectionIndex.value]?.total ?? 0)

function isAnswered(i: number): boolean {
  if (questions.value[i]?.section === 'Writing') {
    return !!(writingAnswers.value[i]?.trim())
  }
  return answers.value[i] !== undefined
}

onMounted(loadExam)

async function loadExam() {
  loading.value = true
  loadError.value = ''
  questions.value = []
  try {
    const variant = Math.floor(Math.random() * 18)
    const data = await api.generateExam({ exam_type: examType.value as any, question_count: 20, variant })
    questions.value = data.questions
    sessionId.value = data.session_id
    timeLimitSecs.value = Math.round((data.time_limit ?? 30) * 60)
  } catch (e) {
    loadError.value = errorText(e, t('exam.genFailed'))
  } finally {
    loading.value = false
  }
}

function selectAnswer(i: number) {
  answers.value[currentIdx.value] = i
  if (currentIdx.value < questions.value.length - 1) {
    setTimeout(() => { currentIdx.value++ }, 400)
  }
}

function handleWrite(text: string) {
  writingAnswers.value[currentIdx.value] = text
}

async function submitExam() {
  // The timer's timeout and the Submit button can both fire — submit once.
  if (submitting.value) return
  submitting.value = true
  submitError.value = ''
  const answerList: { question_id: number; selected?: number; written?: string }[] = [
    ...Object.entries(answers.value).map(([qi, sel]) => ({
      question_id: questions.value[Number(qi)]?.id ?? -1,
      selected: sel,
    })),
    ...Object.entries(writingAnswers.value)
      .filter(([, text]) => text.trim())
      .map(([qi, text]) => ({
        question_id: questions.value[Number(qi)]?.id ?? -1,
        written: text,
      })),
  ].filter(a => a.question_id !== -1)

  try {
    const res = await api.submitExam({ exam_type: examType.value as any, answers: answerList, session_id: sessionId.value })
    result.value = {
      ...res,
      writing_responses: Object.entries(writingAnswers.value)
        .filter(([, text]) => text.trim())
        .map(([qi, text]) => ({
          task: questions.value[Number(qi)]?.type ?? 'writing',
          question: questions.value[Number(qi)]?.question ?? '',
          text,
        })),
    }
    finished.value = true
  } catch (e) {
    // Keep the answers so the student can retry instead of seeing a fake 0-point result.
    submitError.value = errorText(e, t('exam.submitFailed'))
  } finally {
    submitting.value = false
  }
}

function resetExam() {
  finished.value = false
  answers.value = {}
  writingAnswers.value = {}
  currentIdx.value = 0
  result.value = null
  submitError.value = ''
  loadExam()
}

function goSchedule() { router.push('/schedule') }
</script>
