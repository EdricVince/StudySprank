<template>
  <div class="flex min-h-full flex-col">
    <!-- Header -->
    <div class="page-header">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-lg">📖</div>
          <h1 class="page-title">{{ $t('skills.reading.title') }}</h1>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            v-for="l in ['', ...CEFR_LEVELS]" :key="l"
            class="rounded-lg border px-3 py-1.5 text-xs font-bold transition-all"
            :class="filterLevel === l ? levelFilterClass(l, 'blue') : 'border-border text-muted-foreground hover:text-foreground hover:border-blue-500/30'"
            @click="filterLevel = l"
          >{{ l || $t('skills.common.all') }}</button>
        </div>
      </div>
    </div>

    <div class="mx-auto flex w-full max-w-7xl flex-1 gap-0">
      <!-- Library sidebar -->
      <div class="lib-sidebar">
        <div class="lib-sidebar-inner">
          <div v-for="cat in filteredLibrary" :key="cat.key" class="mb-5">
            <div class="lib-cat-label"><span>{{ cat.icon }}</span> {{ $t(`skills.reading.categories.${cat.key}`) }}</div>
            <div class="space-y-1">
              <button
v-for="book in cat.books" :key="book.title" class="lib-item"
                :class="selectedBook?.title === book.title ? 'lib-item-active-blue' : 'lib-item-inactive'"
                @click="selectBook(book, cat.type)">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-foreground text-sm font-medium leading-tight">{{ book.title }}</span>
                  <span class="mt-0.5 shrink-0" :class="levelBadge(book.level)">{{ book.level }}</span>
                </div>
                <div class="text-muted-foreground mt-0.5 text-xs">{{ book.author }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="fetchError" class="empty-state">
          <div class="mb-4 text-5xl">⚠️</div>
          <h3 class="text-foreground text-xl font-bold">{{ $t('skills.reading.loadFailed') }}</h3>
          <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ fetchError }}</p>
          <button class="btn-blue mt-4 px-5 py-2 text-sm" @click="reloadCurrent">{{ $t('skills.common.retry') }}</button>
        </div>
        <div v-else-if="!passage && !loading" class="empty-state">
          <div class="mb-4 text-5xl">📚</div>
          <h3 class="text-foreground text-xl font-bold">{{ $t('skills.reading.emptyTitle') }}</h3>
          <p class="text-muted-foreground mt-2 max-w-sm text-sm">{{ $t('skills.reading.emptyDesc') }}</p>
        </div>

        <div v-else-if="loading" class="flex flex-col items-center justify-center py-24">
          <svg class="sk-spinner-blue" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <p class="text-muted-foreground mt-4 text-sm">{{ $t('skills.reading.generating') }}</p>
        </div>

        <div v-else-if="passage" class="space-y-5 p-6">
          <!-- Passage header -->
          <div class="sk-card-p6">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap gap-2">
                <span :class="levelBadge(passage.level)">{{ passage.level }}</span>
                <span class="chip capitalize">{{ passage.type }}</span>
                <span class="chip">{{ $t('skills.common.minutes', { n: passage.estimated_time }) }} · {{ $t('skills.common.words', { n: passage.word_count }) }}</span>
              </div>
              <button class="action-btn action-btn-blue" @click="toggleTTS">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-4.536-9.536a5 5 0 000 7.072" /></svg>
                {{ isSpeaking ? $t('skills.common.stop') : $t('skills.common.listen') }}
              </button>
            </div>
            <h2 class="text-foreground text-xl font-extrabold">{{ passage.title }}</h2>
            <div class="mt-4 space-y-3">
              <p v-for="(para, i) in paragraphs" :key="i" class="text-foreground text-base leading-relaxed">{{ para }}</p>
            </div>
            <div v-if="passage.summary" class="mt-4 rounded-xl border p-4 info-box-blue text-sm text-blue-300/80">
              <span class="font-semibold text-blue-400">{{ $t('skills.reading.summary') }} </span>{{ passage.summary }}
            </div>
          </div>

          <!-- Vocabulary -->
          <div v-if="passage.vocabulary?.length" class="sk-card-p">
            <h3 class="text-foreground mb-3 text-sm font-bold">{{ $t('skills.common.vocabulary') }}</h3>
            <div class="grid gap-2 sm:grid-cols-2">
              <div v-for="v in passage.vocabulary" :key="v.word" class="rounded-xl bg-muted/10 p-3 text-sm">
                <div class="flex items-baseline gap-2">
                  <span class="text-foreground font-bold">{{ v.word }}</span>
                  <span class="font-mono text-xs text-muted-foreground">{{ v.phonetic }}</span>
                </div>
                <p class="text-foreground mt-0.5">{{ v.meaning }}</p>
                <p class="text-muted-foreground mt-0.5 text-xs italic">{{ v.example }}</p>
              </div>
            </div>
          </div>

          <!-- Questions -->
          <div v-if="passage.questions?.length" class="sk-card-p">
            <h3 class="text-foreground mb-4 text-sm font-bold">{{ $t('skills.reading.questions') }}</h3>
            <div class="space-y-5">
              <div v-for="(q, qi) in passage.questions" :key="q.id" class="border-border border-b pb-5 last:border-0 last:pb-0">
                <p class="text-foreground mb-3 text-sm font-semibold">{{ Number(qi) + 1 }}. {{ q.question }}</p>
                <div class="grid gap-2 sm:grid-cols-2">
                  <button
v-for="(opt, oi) in q.options" :key="oi" :disabled="submitted"
                    class="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all"
                    :class="optClass(qi, oi)"
                    @click="answers[Number(qi)] = Number(oi)">
                    <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold" :class="optBadge(qi, oi)">{{ 'ABCD'[Number(oi)] }}</span>
                    {{ opt.replace(/^[A-D]\.\s*/, '') }}
                  </button>
                </div>
                <div v-if="submitted && q.explanation" class="mt-2.5 rounded-lg bg-muted/20 p-2.5 text-xs text-muted-foreground">
                  ℹ {{ q.explanation }}
                </div>
              </div>
            </div>

            <div v-if="submitted" class="mt-5 flex items-center justify-between rounded-xl border p-4" :class="isPassed ? 'answer-pass' : 'answer-fail'">
              <div>
                <div class="font-bold" :class="isPassed ? 'text-emerald-400' : 'text-red-400'">
                  {{ correctCount }}/{{ passage.questions.length }} — {{ isPassed ? $t('skills.common.passed') : $t('skills.common.tryAgain') }}
                </div>
                <div class="text-muted-foreground text-sm">{{ Math.round(correctCount/passage.questions.length*100) }}%  ·  {{ completedAt }}</div>
                <!-- passage, questions and explanations are AI-generated -->
                <AiGeneratedBadge class="mt-2" />
              </div>
              <button class="btn-blue px-4 py-2 text-sm" @click="reloadCurrent">{{ $t('skills.reading.newPassage') }}</button>
            </div>
            <button
v-else :disabled="answers.some(a => a === -1)" class="btn-blue mt-5 w-full py-2.5 disabled:opacity-40"
              @click="submit">
              {{ $t('skills.common.submitAnswers') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/utils/api'
import { CEFR_LEVELS, levelBadge, levelFilterClass, clockTime, errorText } from '@/utils/skills'
import AiGeneratedBadge from '@/components/common/AiGeneratedBadge.vue'

const { t } = useI18n()
const filterLevel = ref('')
const loading = ref(false)
const passage = ref<any>(null)
const answers = ref<number[]>([])
const submitted = ref(false)
const isSpeaking = ref(false)
const selectedBook = ref<any>(null)
const completedAt = ref('')
const fetchError = ref('')

const library = [
  { key: 'classic', icon: '📘', type: 'story', books: [
    { title: 'The Little Prince', author: 'A. de Saint-Exupéry', level: 'A2' },
    { title: 'Animal Farm', author: 'George Orwell', level: 'B1' },
    { title: 'The Old Man and the Sea', author: 'Ernest Hemingway', level: 'B2' },
    { title: '1984', author: 'George Orwell', level: 'C1' },
    { title: 'Brave New World', author: 'Aldous Huxley', level: 'C2' },
  ]},
  { key: 'ielts', icon: '🎓', type: 'ielts', books: [
    { title: 'Climate Change & Society', author: 'Academic', level: 'B1' },
    { title: 'Digital Revolution', author: 'Academic', level: 'B2' },
    { title: 'Cognitive Neuroscience', author: 'Academic', level: 'C1' },
    { title: 'Behavioral Economics', author: 'Academic', level: 'C2' },
  ]},
  { key: 'science', icon: '🔬', type: 'academic', books: [
    { title: 'Introduction to Psychology', author: 'Research', level: 'B1' },
    { title: 'Artificial Intelligence', author: 'MIT Press', level: 'B2' },
    { title: 'Quantum Physics Basics', author: 'Research', level: 'C1' },
    { title: 'Evolutionary Biology', author: 'Nature', level: 'C2' },
  ]},
  { key: 'news', icon: '📰', type: 'news', books: [
    { title: 'World Economy Today', author: 'BBC', level: 'B1' },
    { title: 'Technology Trends', author: 'Reuters', level: 'B2' },
    { title: 'Geopolitics & Society', author: 'The Guardian', level: 'C1' },
  ]},
  { key: 'short', icon: '📖', type: 'story', books: [
    { title: 'My First Day', author: 'EFL Stories', level: 'A1' },
    { title: 'A Day at the Market', author: 'EFL Stories', level: 'A2' },
    { title: 'The Interview', author: 'EFL Stories', level: 'B1' },
  ]},
]

const filteredLibrary = computed(() =>
  filterLevel.value
    ? library.map(c => ({ ...c, books: c.books.filter(b => b.level === filterLevel.value) })).filter(c => c.books.length)
    : library
)
const paragraphs   = computed(() => passage.value?.passage?.split('\n\n').filter(Boolean) ?? [])
const correctCount = computed(() => answers.value.filter((a,i) => a === passage.value?.questions[i]?.correct).length)
const isPassed     = computed(() => passage.value ? correctCount.value / passage.value.questions.length >= 0.6 : false)

async function selectBook(book: any, type: string) {
  selectedBook.value = book
  submitted.value = false
  isSpeaking.value = false
  fetchError.value = ''
  window.speechSynthesis?.cancel()
  loading.value = true
  try {
    passage.value = await api.getReadingPassage({ level: book.level, type, topic: book.title })
    answers.value = new Array(passage.value?.questions?.length ?? 0).fill(-1)
  } catch (e) {
    passage.value = null
    fetchError.value = errorText(e, t('skills.common.connectError'))
  }
  finally { loading.value = false }
}

function reloadCurrent() {
  if (selectedBook.value) selectBook(selectedBook.value, library.find(c => c.books.includes(selectedBook.value))?.type ?? 'story')
}

function submit() {
  submitted.value = true
  completedAt.value = clockTime()
}

function optClass(qi: string | number, oi: string | number) {
  const q = Number(qi), o = Number(oi)
  if (!submitted.value) return answers.value[q] === o ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-border text-foreground hover:border-blue-500/40'
  const c = passage.value?.questions[q]?.correct
  if (o === c) return 'answer-correct'
  if (o === answers.value[q]) return 'answer-wrong'
  return 'border-border text-muted-foreground opacity-40'
}
function optBadge(qi: string | number, oi: string | number) {
  const q = Number(qi), o = Number(oi)
  if (!submitted.value) return answers.value[q] === o ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-border text-muted-foreground'
  const c = passage.value?.questions[q]?.correct
  if (o === c) return 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
  if (o === answers.value[q]) return 'border-red-500 bg-red-500/20 text-red-300'
  return 'border-border text-muted-foreground'
}

function toggleTTS() {
  if (isSpeaking.value) { window.speechSynthesis?.cancel(); isSpeaking.value = false; return }
  const u = new SpeechSynthesisUtterance(passage.value?.passage ?? '')
  u.rate = 0.9; u.onend = () => { isSpeaking.value = false }
  window.speechSynthesis?.speak(u); isSpeaking.value = true
}
onUnmounted(() => window.speechSynthesis?.cancel())
</script>
