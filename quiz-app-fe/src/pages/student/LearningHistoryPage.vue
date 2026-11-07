<template>
  <div class="mx-auto max-w-4xl p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-6">
      <button
        class="text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1.5 text-sm transition-colors"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" />
        {{ $t(isFlashcards ? 'history.backFlashcards' : 'history.backQuizzes') }}
      </button>
      <h1 class="text-foreground text-3xl font-bold tracking-tight">
        {{ $t(isFlashcards ? 'history.flashcardTitle' : 'history.quizTitle') }}
      </h1>
      <p class="text-muted-foreground mt-2">
        {{ $t(isFlashcards ? 'history.flashcardSubtitle' : 'history.quizSubtitle') }}
        <span v-if="!loading && total > 0" class="text-foreground font-medium">· {{ $t('history.sessionsCount', { n: total }) }}</span>
      </p>
    </div>

    <!-- Sessions (one row per flashcard run / game) or the words themselves -->
    <div class="bg-secondary mb-6 inline-flex rounded-lg p-1" data-test="history-tabs">
      <button
        v-for="name in TABS"
        :key="name"
        class="rounded-md px-4 py-1.5 text-sm font-medium transition-all"
        :class="tab === name ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        :data-test="`tab-${name}`"
        @click="tab = name"
      >
        {{ $t(name === 'sessions' ? 'history.tabs.sessions' : 'history.tabs.vocabulary') }}
      </button>
    </div>

    <template v-if="tab === 'sessions'">
    <!-- Loading -->
    <div v-if="loading" class="space-y-3" data-test="history-loading">
      <div v-for="i in 4" :key="i" class="bg-card border-border h-20 animate-pulse rounded-2xl border"></div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="bg-card border-border rounded-2xl border p-10 text-center" data-test="history-error">
      <AlertCircle class="text-destructive mx-auto mb-3 h-8 w-8" />
      <p class="text-foreground mb-4 font-medium">{{ $t('history.loadFailed') }}</p>
      <Button variant="outline" @click="load(true)">
        <RefreshCw class="mr-2 h-4 w-4" />{{ $t('history.retry') }}
      </Button>
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="bg-card border-border rounded-2xl border p-12 text-center" data-test="history-empty">
      <div class="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <History class="text-primary h-8 w-8" />
      </div>
      <h2 class="text-foreground mb-2 text-lg font-semibold">
        {{ $t(isFlashcards ? 'history.emptyFlashcardTitle' : 'history.emptyQuizTitle') }}
      </h2>
      <p class="text-muted-foreground mx-auto mb-6 max-w-md text-sm">
        {{ $t(isFlashcards ? 'history.emptyFlashcardDesc' : 'history.emptyQuizDesc') }}
      </p>
      <Button @click="goBack">{{ $t(isFlashcards ? 'history.emptyFlashcardCta' : 'history.emptyQuizCta') }}</Button>
    </div>

    <!-- Sessions -->
    <div v-else class="space-y-3">
      <button
        v-for="s in items"
        :key="s.id"
        data-test="history-row"
        class="bg-card border-border hover:border-primary/40 flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:shadow-md"
        @click="openSession(s.id)"
      >
        <div class="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
          <component :is="isFlashcards ? Layers : Gamepad2" class="text-primary h-6 w-6" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-foreground truncate font-semibold">{{ displayTitle(s) }}</h3>
          <p class="text-muted-foreground mt-0.5 truncate text-sm">
            {{ modeLabel(s) }} · {{ sourceLabel(s) }} · {{ formatDate(s.created_at) }}
          </p>
        </div>
        <div class="hidden text-right sm:block">
          <p class="text-foreground font-semibold">{{ $t('history.wordsCount', { n: s.total_items }) }}</p>
          <p class="text-muted-foreground text-sm">
            {{ $t(isFlashcards ? 'history.knownOf' : 'history.correctOf', { correct: s.correct_items, total: s.total_items }) }}
          </p>
        </div>
        <div class="w-16 shrink-0 text-right">
          <p class="text-lg font-bold" :class="accuracyClass(s.accuracy)">{{ s.accuracy }}%</p>
        </div>
        <ChevronRight class="text-muted-foreground h-5 w-5 shrink-0" />
      </button>

      <div v-if="items.length < total" class="pt-2 text-center">
        <Button variant="outline" :disabled="loadingMore" @click="load(false)">
          {{ $t('history.loadMore') }}
        </Button>
      </div>
    </div>

    </template>

    <!-- Every word the student practised, merged -->
    <div v-else data-test="vocab-tab">
      <p class="text-muted-foreground mb-4 text-sm">{{ $t('history.words.desc') }}</p>

      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="bg-secondary flex rounded-lg p-1">
          <button
            v-for="f in VOCAB_FILTERS"
            :key="f"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-all"
            :class="vocabStatus === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            :data-test="`vocab-filter-${f}`"
            @click="vocabStatus = f"
          >
            {{ $t(`history.words.${f}`) }}
            <span class="text-muted-foreground ml-1 text-xs tabular-nums">{{ vocabCount(f) }}</span>
          </button>
        </div>
        <input
          v-model="vocabQuery"
          type="search"
          class="bg-background border-border text-foreground min-w-48 flex-1 rounded-xl border px-3 py-2 text-sm sm:max-w-xs"
          :placeholder="$t('history.words.search')"
          data-test="vocab-search"
        />
        <Button class="sm:ml-auto" :disabled="!vocabTotal" data-test="vocab-study" @click="studyWords">
          <RotateCcw class="mr-2 h-4 w-4" />{{ $t('history.words.studyThese') }}
        </Button>
      </div>

      <div v-if="vocabLoading" class="space-y-2" data-test="vocab-loading">
        <div v-for="i in 5" :key="i" class="bg-card border-border h-16 animate-pulse rounded-xl border"></div>
      </div>
      <div v-else-if="vocabError" class="bg-card border-border rounded-2xl border p-10 text-center" data-test="vocab-error">
        <AlertCircle class="text-destructive mx-auto mb-3 h-8 w-8" />
        <p class="text-foreground mb-4 font-medium">{{ $t('history.loadFailed') }}</p>
        <Button variant="outline" @click="loadVocab(true)"><RefreshCw class="mr-2 h-4 w-4" />{{ $t('history.retry') }}</Button>
      </div>
      <div v-else-if="vocabSummary.total === 0" class="bg-card border-border rounded-2xl border p-12 text-center" data-test="vocab-empty">
        <div class="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <BookOpen class="text-primary h-8 w-8" />
        </div>
        <h2 class="text-foreground mb-2 text-lg font-semibold">{{ $t('history.words.empty') }}</h2>
        <p class="text-muted-foreground mx-auto max-w-md text-sm">{{ $t('history.words.emptyDesc') }}</p>
      </div>
      <p v-else-if="!vocab.length" class="text-muted-foreground bg-secondary/30 rounded-xl p-8 text-center text-sm" data-test="vocab-no-match">
        {{ $t('history.words.noMatch') }}
      </p>
      <div v-else class="space-y-2" data-test="vocab-list">
        <div
          v-for="w in vocab"
          :key="w.term.toLowerCase()"
          data-test="vocab-row"
          class="bg-card border-border flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3"
        >
          <div class="min-w-0 flex-1 basis-56">
            <p class="text-foreground font-semibold">{{ w.term }}</p>
            <p class="text-muted-foreground text-sm">{{ w.meaning || '—' }}</p>
            <p v-if="w.example" class="text-muted-foreground mt-0.5 text-xs italic">"{{ w.example }}"</p>
          </div>
          <div class="text-muted-foreground text-xs tabular-nums">
            <span class="text-primary">✓ {{ w.correct }}</span> · <span class="text-destructive">✗ {{ w.missed }}</span>
            <p>{{ $t('history.words.seen', { n: w.seen }, w.seen) }}</p>
          </div>
          <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="vocabStatusClass(w.status)">
            {{ $t(`history.words.status.${w.status}`) }}
          </span>
        </div>

        <div v-if="vocab.length < vocabTotal" class="pt-2 text-center">
          <Button variant="outline" :disabled="vocabMoreLoading" @click="loadVocab(false)">{{ $t('history.loadMore') }}</Button>
        </div>
      </div>
    </div>

    <!-- Session detail: every word of it, with how it went -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="detailOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="closeDetail"
        >
          <div class="bg-card border-border flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border shadow-xl" data-test="history-detail">
            <div class="border-border flex items-start justify-between gap-4 border-b p-6">
              <div class="min-w-0">
                <h2 class="text-foreground truncate text-xl font-bold">{{ detail ? displayTitle(detail) : '…' }}</h2>
                <p v-if="detail" class="text-muted-foreground mt-1 text-sm">
                  {{ modeLabel(detail) }} · {{ sourceLabel(detail) }} · {{ formatDate(detail.created_at) }}
                </p>
              </div>
              <button class="hover:bg-secondary rounded-lg p-2 transition-colors" :aria-label="$t('common.close')" @click="closeDetail">
                <X class="text-muted-foreground h-5 w-5" />
              </button>
            </div>

            <div v-if="detailLoading" class="text-muted-foreground p-10 text-center">{{ $t('common.loading') }}</div>
            <div v-else-if="detailError" class="p-10 text-center">
              <p class="text-destructive font-medium">{{ $t('history.detail.loadFailed') }}</p>
            </div>

            <template v-else-if="detail">
              <div class="grid grid-cols-2 gap-3 p-6 pb-3 sm:grid-cols-4">
                <div class="bg-secondary/50 rounded-xl p-3 text-center">
                  <p class="text-foreground text-xl font-bold">{{ detail.correct_items }}/{{ detail.total_items }}</p>
                  <p class="text-muted-foreground text-xs">{{ $t(isFlashcards ? 'history.detail.known' : 'history.detail.correct') }}</p>
                </div>
                <div class="bg-secondary/50 rounded-xl p-3 text-center">
                  <p class="text-foreground text-xl font-bold">{{ detail.accuracy }}%</p>
                  <p class="text-muted-foreground text-xs">{{ $t('history.detail.accuracy') }}</p>
                </div>
                <div class="bg-secondary/50 rounded-xl p-3 text-center">
                  <p class="text-foreground text-xl font-bold">+{{ detail.xp_earned }}</p>
                  <p class="text-muted-foreground text-xs">XP</p>
                </div>
                <div class="bg-secondary/50 rounded-xl p-3 text-center">
                  <p class="text-foreground text-xl font-bold">{{ formatDuration(detail.duration_seconds) }}</p>
                  <p class="text-muted-foreground text-xs">{{ $t('history.detail.time') }}</p>
                </div>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                <p v-if="!detail.words?.length" class="text-muted-foreground py-6 text-center text-sm">{{ $t('history.detail.noWords') }}</p>
                <table v-else class="w-full text-sm">
                  <thead class="bg-card sticky top-0">
                    <tr class="text-muted-foreground text-left text-xs uppercase tracking-wide">
                      <th class="py-2 pr-3 font-medium">{{ $t('quizPlay.vocab.word') }}</th>
                      <th class="py-2 pr-3 font-medium">{{ $t('quizPlay.vocab.meaning') }}</th>
                      <th class="py-2 text-center font-medium">{{ $t('quizPlay.vocab.result') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="w in detail.words" :key="w.id" class="border-border border-t align-top">
                      <td class="text-foreground py-3 pr-3 font-medium">
                        {{ w.term }}
                        <p v-if="w.example" class="text-muted-foreground mt-0.5 text-xs font-normal italic">"{{ w.example }}"</p>
                      </td>
                      <td class="text-muted-foreground py-3 pr-3">{{ w.meaning || '—' }}</td>
                      <td class="py-3 text-center">
                        <Check v-if="w.is_correct === true" class="text-primary mx-auto h-4 w-4" :title="$t('history.detail.correct')" />
                        <X v-else-if="w.is_correct === false" class="text-destructive mx-auto h-4 w-4" :title="$t('history.detail.missed')" />
                        <span v-else class="text-muted-foreground">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="border-border flex flex-wrap items-center gap-3 border-t p-6">
                <Button :disabled="!detail.words?.length" @click="studyAgain(false)">
                  <RotateCcw class="mr-2 h-4 w-4" />{{ $t('history.detail.studyAgain') }}
                </Button>
                <Button v-if="missedCount > 0" variant="outline" @click="studyAgain(true)">
                  <RefreshCw class="mr-2 h-4 w-4" />{{ $t('history.detail.studyMissed', { n: missedCount }) }}
                </Button>
                <Button variant="ghost" class="text-destructive ml-auto" @click="confirmDelete = true">
                  <Trash2 class="mr-2 h-4 w-4" />{{ $t('common.delete') }}
                </Button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>

    <DeleteConfirmModal
      v-model="confirmDelete"
      :title="$t('history.deleteTitle')"
      :message="$t('history.deleteMessage')"
      :confirm-text="$t('common.delete')"
      @confirm="removeSession"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/utils/api'
import { useToast } from '@/composables/useToast'
import type { LearningSessionData, SessionKind, VocabularyEntryData, VocabularyStatus } from '@/types/learning'
import {
  AlertCircle, ArrowLeft, BookOpen, Check, ChevronRight, Gamepad2, History, Layers, RefreshCw, RotateCcw, Trash2, X,
} from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal.vue'

const props = defineProps<{ kind: SessionKind }>()

const PAGE_SIZE = 20

const { t, te, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const isFlashcards = computed(() => props.kind === 'flashcard')

const items = ref<LearningSessionData[]>([])
const total = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref(false)

async function load(reset: boolean) {
  if (reset) {
    loading.value = true
    items.value = []
  } else {
    loadingMore.value = true
  }
  loadError.value = false
  try {
    const page = await api.getLearningSessions({ kind: props.kind, limit: PAGE_SIZE, offset: reset ? 0 : items.value.length })
    items.value = reset ? page.items : [...items.value, ...page.items]
    total.value = page.total
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// ── Labels ────────────────────────────────────────────────────────────────
const modeLabel = (s: LearningSessionData) =>
  te(`history.modes.${s.mode_id}`) ? t(`history.modes.${s.mode_id}`) : s.mode_name
const sourceLabel = (s: LearningSessionData) =>
  te(`history.sources.${s.source}`) ? t(`history.sources.${s.source}`) : s.source
// Decks and vocabulary sets carry their own name; everything else is named after the game.
const displayTitle = (s: LearningSessionData) =>
  s.source === 'deck' || s.source === 'vocab_set' ? s.title : modeLabel(s)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  return m > 0 ? `${m}m ${seconds % 60}s` : `${seconds}s`
}
const accuracyClass = (pct: number) =>
  pct >= 80 ? 'text-primary' : pct >= 50 ? 'text-foreground' : 'text-destructive'

// ── Detail ────────────────────────────────────────────────────────────────
const detailOpen = ref(false)
const detail = ref<LearningSessionData | null>(null)
const detailLoading = ref(false)
const detailError = ref(false)
const confirmDelete = ref(false)

const missedCount = computed(() => detail.value?.words?.filter((w) => w.is_correct === false).length ?? 0)

async function openSession(id: number) {
  detailOpen.value = true
  detail.value = null
  detailError.value = false
  detailLoading.value = true
  try {
    detail.value = await api.getLearningSession(id)
  } catch {
    detailError.value = true
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  if (route.query.session) router.replace({ query: {} })
}

function studyAgain(onlyMissed: boolean) {
  if (!detail.value) return
  router.push({
    path: `/flashcards/history/${detail.value.id}/study`,
    query: onlyMissed ? { only: 'missed' } : {},
  })
}

async function removeSession() {
  const id = detail.value?.id
  if (!id) return
  try {
    await api.deleteLearningSession(id)
    items.value = items.value.filter((s) => s.id !== id)
    total.value = Math.max(0, total.value - 1)
    detailOpen.value = false
    toast.success(t('history.deleted'))
  } catch {
    toast.error(t('history.deleteFailed'))
  }
}

const goBack = () => router.push(isFlashcards.value ? '/flashcards' : '/quizzes')

// ── My vocabulary: every word practised, merged over flashcards and games ──────────────
type Tab = 'sessions' | 'words'
const TABS: Tab[] = ['sessions', 'words']
const VOCAB_FILTERS = ['all', 'learned', 'weak'] as const
type VocabFilter = (typeof VOCAB_FILTERS)[number]
const VOCAB_PAGE_SIZE = 30
const SEARCH_DEBOUNCE_MS = 300

const tab = ref<Tab>(route.query.tab === 'words' ? 'words' : 'sessions')
const vocab = ref<VocabularyEntryData[]>([])
const vocabTotal = ref(0)
const vocabSummary = ref({ total: 0, learned: 0, weak: 0 })
const vocabLoading = ref(false)
const vocabMoreLoading = ref(false)
const vocabError = ref(false)
const vocabQuery = ref('')
const vocabStatus = ref<VocabFilter>(
  route.query.status === 'weak' || route.query.status === 'learned' ? route.query.status : 'all',
)
let vocabLoaded = false

const vocabCount = (f: VocabFilter) => (f === 'all' ? vocabSummary.value.total : vocabSummary.value[f])
const vocabStatusClass = (status: VocabularyEntryData['status']) =>
  status === 'learned' ? 'bg-primary/10 text-primary' : status === 'weak' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'

async function loadVocab(reset: boolean) {
  if (reset) vocabLoading.value = true
  else vocabMoreLoading.value = true
  vocabError.value = false
  try {
    const status: VocabularyStatus | undefined = vocabStatus.value === 'all' ? undefined : vocabStatus.value
    const page = await api.getLearningVocabulary({
      status,
      search: vocabQuery.value,
      limit: VOCAB_PAGE_SIZE,
      offset: reset ? 0 : vocab.value.length,
    })
    vocab.value = reset ? page.items : [...vocab.value, ...page.items]
    vocabTotal.value = page.total
    vocabSummary.value = page.summary
    vocabLoaded = true
  } catch {
    vocabError.value = true
  } finally {
    vocabLoading.value = false
    vocabMoreLoading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(vocabQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadVocab(true), SEARCH_DEBOUNCE_MS)
})
watch(vocabStatus, () => loadVocab(true))
watch(tab, (name) => {
  if (name === 'words' && !vocabLoaded) void loadVocab(true)
})

// Study the words the current filter / search shows (the first batch of them).
function studyWords() {
  router.push({
    path: '/flashcards/history/words/study',
    query: {
      ...(vocabStatus.value !== 'all' ? { status: vocabStatus.value } : {}),
      ...(vocabQuery.value.trim() ? { search: vocabQuery.value.trim() } : {}),
    },
  })
}

watch(() => props.kind, () => load(true))

onMounted(async () => {
  if (tab.value === 'words') void loadVocab(true)
  await load(true)
  const open = Number(route.query.session)
  if (Number.isInteger(open) && open > 0) void openSession(open)
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div, .modal-leave-to > div { transform: scale(0.95) translateY(20px); }
</style>
