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
import type { LearningSessionData, SessionKind } from '@/types/learning'
import {
  AlertCircle, ArrowLeft, Check, ChevronRight, Gamepad2, History, Layers, RefreshCw, RotateCcw, Trash2, X,
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

watch(() => props.kind, () => load(true))

onMounted(async () => {
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
