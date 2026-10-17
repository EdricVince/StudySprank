<template>
  <div class="min-h-[calc(100vh-4rem)] p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-8">
      <div class="mb-4 flex items-center gap-2">
        <button
          class="group flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
          @click="goBack"
        >
          <svg class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          {{ $t('flashcards.title') }}
        </button>
      </div>

      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex-1">
          <div class="mb-2 flex items-center gap-3">
            <div class="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
              <component :is="getCategoryIcon(deck?.category ?? 'General')" class="text-primary h-6 w-6" />
            </div>
            <div>
              <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ deck?.title }}</h1>
              <p class="text-muted-foreground text-base">{{ deck?.description }}</p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <Button v-if="isOwner" variant="outline" @click="showImportModal = true">
            <Upload class="mr-2 h-5 w-5" />
            {{ $t('flashcards.import') }}
          </Button>
          <Button variant="outline" @click="exportDeck">
            <Download class="mr-2 h-5 w-5" />
            {{ $t('flashcards.deckPage.export') }}
          </Button>
          <Button :disabled="cards.length === 0" @click="startStudy">
            <Play class="mr-2 h-5 w-5" />
            {{ $t('flashcards.previewModal.studyNow') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="animate-fade-in-up delay-100 mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      <div class="bg-card border-border rounded-2xl border p-5 lg:p-6">
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ cards.length }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ $t('flashcards.stats.totalCards') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 lg:p-6">
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ masteredCount }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ $t('flashcards.stats.mastered') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 lg:p-6">
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ learningCount }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ $t('flashcards.deckPage.learning') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 lg:p-6">
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ deck?.is_public ? '🌐' : '🔒' }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ deck?.is_public ? $t('flashcards.deckPage.public') : $t('flashcards.deckPage.private') }}</p>
      </div>
    </div>

    <!-- Search and Add -->
    <div class="animate-fade-in-up delay-150 mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative flex-1 lg:max-w-md">
        <Search class="text-muted-foreground absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('flashcards.deckPage.searchCards')"
          class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 pl-12 pr-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <Button v-if="isOwner" @click="openCreateCard">
        <Plus class="mr-2 h-5 w-5" />
        {{ $t('flashcards.deckPage.addCard') }}
      </Button>
    </div>

    <!-- Cards List -->
    <div v-if="filteredCards.length > 0" class="space-y-3">
      <FlashcardCardItem
        v-for="(card, index) in filteredCards"
        :key="card.id"
        :card="card"
        :index="index"
        @edit="openEditCard"
        @toggle-favorite="toggleFavorite"
        @open-menu="openCardMenu"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="animate-fade-in-up flex flex-col items-center justify-center py-20 text-center">
      <div class="bg-secondary mb-6 flex h-24 w-24 items-center justify-center rounded-full">
        <CreditCard class="text-muted-foreground h-12 w-12" />
      </div>
      <h3 class="text-foreground mb-2 text-xl font-semibold lg:text-2xl">
        {{ searchQuery ? $t('flashcards.deckPage.noFound') : $t('flashcards.deckPage.noCards') }}
      </h3>
      <p class="text-muted-foreground mb-6 max-w-md text-base">
        {{ searchQuery ? $t('flashcards.deckPage.tryDifferent') : $t('flashcards.deckPage.addFirst') }}
      </p>
      <div v-if="!searchQuery && isOwner" class="flex gap-3">
        <Button variant="outline" @click="showImportModal = true">
          <Upload class="mr-2 h-5 w-5" />
          {{ $t('flashcards.import') }}
        </Button>
        <Button @click="openCreateCard">
          <Plus class="mr-2 h-5 w-5" />
          {{ $t('flashcards.deckPage.addCard') }}
        </Button>
      </div>
    </div>

    <!-- Card Menu Dropdown -->
    <CardMenuDropdown
      v-model="showCardMenu"
      :position="menuPosition"
      @duplicate="duplicateCard"
      @delete="confirmDeleteCard"
    />

    <!-- Create/Edit Card Modal -->
    <FlashcardCardModal
      v-model="showCardModal"
      :card="editingCard"
      @save="saveCard"
    />

    <!-- Import Modal -->
    <FlashcardImportModal
      v-model="showImportModal"
      @import="importCards"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmModal
      v-model="showDeleteModal"
      :title="$t('flashcards.deckPage.deleteTitle')"
      :message="$t('flashcards.deckPage.deleteMsg')"
      @confirm="deleteCard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Plus,
  Upload,
  Download,
  Play,
  Search,
  CreditCard,
  BookOpen,
  Code2,
  Globe,
  Music,
  Calculator,
  Palette,
  FlaskConical,
} from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import FlashcardCardItem from '@/components/flashcard/FlashcardCardItem.vue'
import FlashcardCardModal from '@/components/flashcard/FlashcardCardModal.vue'
import FlashcardImportModal from '@/components/flashcard/FlashcardImportModal.vue'
import CardMenuDropdown from '@/components/flashcard/CardMenuDropdown.vue'
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal.vue'
import type { FlashcardItem, CardFormData } from '@/types/flashcard'
import type { FlashcardDeckData } from '@/types/content'
import { api, ApiError } from '@/utils/api'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth.store'
import { cardsToCsv, isCsvFile, parseCardsCsv } from '@/utils/csv'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const deckId = Number(route.params.id)

// Modal states
const showCardModal = ref(false)
const showImportModal = ref(false)
const showDeleteModal = ref(false)
const showCardMenu = ref(false)

// Card states
const editingCard = ref<FlashcardItem | null>(null)
const cardToDelete = ref<FlashcardItem | null>(null)
const activeCardId = ref<number | null>(null)
const menuPosition = ref({ top: '0px', left: '0px' })
const searchQuery = ref('')

// Real deck loaded from the backend (no seeded/sample content).
const deck = ref<FlashcardDeckData | null>(null)
const cards = ref<FlashcardItem[]>([])
const isOwner = computed(() => !!deck.value && deck.value.owner_id === authStore.user?.id)

const toDeckCards = () => cards.value.map(c => ({
  term: c.term, definition: c.definition, example: c.example, image: c.image, audio: c.audio,
}))
// Persist the whole card list back to the deck (owner only).
const persist = async () => {
  if (!deck.value || !isOwner.value) return
  try {
    await api.updateFlashcardDeck(deck.value.id, { cards: toDeckCards() })
  } catch (e) {
    toast.error(e instanceof ApiError ? e.errorMessage : t('flashcards.deckPage.saveFailed'))
  }
}

onMounted(async () => {
  try {
    const d = await api.getFlashcardDeck(deckId)
    deck.value = d
    cards.value = d.cards.map((c, i) => ({
      id: i + 1, term: c.term, definition: c.definition,
      example: c.example, image: c.image, audio: c.audio,
      isFavorite: false, status: 'New',
    }))
  } catch {
    router.replace('/flashcards')
  }
})

// Computed
const filteredCards = computed(() => {
  if (!searchQuery.value) return cards.value
  const query = searchQuery.value.toLowerCase()
  return cards.value.filter(
    (card) => card.term.toLowerCase().includes(query) || card.definition.toLowerCase().includes(query)
  )
})

const masteredCount = computed(() => cards.value.filter((c) => c.status === 'Mastered').length)
const learningCount = computed(() => cards.value.filter((c) => c.status === 'Learning').length)

// Methods
const getCategoryIcon = (category: string): Component => {
  const icons: Record<string, Component> = {
    Language: Globe,
    Programming: Code2,
    Science: FlaskConical,
    Math: Calculator,
    Music: Music,
    Art: Palette,
    General: BookOpen,
  }
  return icons[category] || BookOpen
}

const goBack = () => {
  router.push('/flashcards')
}

const startStudy = () => {
  router.push(`/flashcards/${deckId}/study`)
}

const openCreateCard = () => {
  if (!isOwner.value) return
  editingCard.value = null
  showCardModal.value = true
}

const openEditCard = (card: FlashcardItem) => {
  if (!isOwner.value) return
  editingCard.value = card
  showCardModal.value = true
}

const saveCard = async (formData: CardFormData) => {
  if (editingCard.value) {
    const card = cards.value.find(c => c.id === editingCard.value!.id)
    if (card) {
      card.term = formData.term
      card.definition = formData.definition
      card.example = formData.example || undefined
      card.image = formData.image || undefined
      card.audio = formData.audio || undefined
    }
  } else {
    cards.value.unshift({
      id: Date.now(), term: formData.term, definition: formData.definition,
      example: formData.example || undefined, image: formData.image || undefined,
      audio: formData.audio || undefined, isFavorite: false, status: 'New',
    })
  }
  editingCard.value = null
  await persist()
}

const toggleFavorite = (card: FlashcardItem) => {
  card.isFavorite = !card.isFavorite
}

const openCardMenu = (cardId: number, event: MouseEvent) => {
  if (!isOwner.value) return
  activeCardId.value = cardId
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  menuPosition.value = {
    top: `${rect.bottom + 8}px`,
    left: `${rect.left - 120}px`,
  }
  showCardMenu.value = true
}

const duplicateCard = async () => {
  const card = cards.value.find((c) => c.id === activeCardId.value)
  if (card) {
    cards.value.unshift({ ...card, id: Date.now(), term: t('flashcards.deckPage.copy', { term: card.term }), status: 'New' })
    await persist()
  }
}

const confirmDeleteCard = () => {
  const card = cards.value.find((c) => c.id === activeCardId.value)
  if (card) {
    cardToDelete.value = card
    showDeleteModal.value = true
  }
}

const deleteCard = async () => {
  if (cardToDelete.value) {
    cards.value = cards.value.filter(c => c.id !== cardToDelete.value!.id)
    await persist()
  }
  cardToDelete.value = null
}

const importCards = async (file: File) => {
  if (!isCsvFile(file)) return toast.error(t('flashcards.importModal.onlyCsv'))
  const rows = parseCardsCsv(await file.text())
  if (!rows.length) return toast.error(t('flashcards.importModal.noRows'))
  const now = Date.now()
  cards.value.unshift(...rows.map((r, i): FlashcardItem => ({ ...r, id: now + i, isFavorite: false, status: 'New' })))
  await persist()
  toast.success(t('flashcards.importModal.imported', { n: rows.length }))
}

const exportDeck = () => {
  const blob = new Blob([cardsToCsv(cards.value)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${deck.value?.title ?? 'deck'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
