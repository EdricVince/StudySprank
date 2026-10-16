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
          Flashcards
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
            Import
          </Button>
          <Button variant="outline" @click="exportDeck">
            <Download class="mr-2 h-5 w-5" />
            Export
          </Button>
          <Button :disabled="cards.length === 0" @click="startStudy">
            <Play class="mr-2 h-5 w-5" />
            Study Now
          </Button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="animate-fade-in-up delay-100 mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      <div class="bg-card border-border rounded-2xl border p-5 lg:p-6">
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ cards.length }}</span>
        <p class="text-muted-foreground mt-1 text-base">Total Cards</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 lg:p-6">
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ masteredCount }}</span>
        <p class="text-muted-foreground mt-1 text-base">Mastered</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 lg:p-6">
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ learningCount }}</span>
        <p class="text-muted-foreground mt-1 text-base">Learning</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 lg:p-6">
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ deck?.is_public ? '🌐' : '🔒' }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ deck?.is_public ? 'Public' : 'Private' }}</p>
      </div>
    </div>

    <!-- Search and Add -->
    <div class="animate-fade-in-up delay-150 mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative flex-1 lg:max-w-md">
        <Search class="text-muted-foreground absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search cards..."
          class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 pl-12 pr-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <Button v-if="isOwner" @click="openCreateCard">
        <Plus class="mr-2 h-5 w-5" />
        Add Card
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
        {{ searchQuery ? 'No cards found' : 'No cards yet' }}
      </h3>
      <p class="text-muted-foreground mb-6 max-w-md text-base">
        {{ searchQuery ? 'Try a different search term' : 'Add your first flashcard to start learning' }}
      </p>
      <div v-if="!searchQuery && isOwner" class="flex gap-3">
        <Button variant="outline" @click="showImportModal = true">
          <Upload class="mr-2 h-5 w-5" />
          Import
        </Button>
        <Button @click="openCreateCard">
          <Plus class="mr-2 h-5 w-5" />
          Add Card
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
      title="Delete Card?"
      message="Are you sure you want to delete this card? This action cannot be undone."
      @confirm="deleteCard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
    toast.error(e instanceof ApiError ? e.errorMessage : 'Failed to save changes')
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
    cards.value.unshift({ ...card, id: Date.now(), term: `${card.term} (Copy)`, status: 'New' })
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

// Parse a CSV (the same shape exportDeck produces: Term,Definition,Example,Image,Audio).
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cells: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') inQ = false
        else cur += ch
      } else if (ch === '"') inQ = true
      else if (ch === ',') { cells.push(cur); cur = '' }
      else cur += ch
    }
    cells.push(cur)
    rows.push(cells)
  }
  if (rows.length && /term/i.test(rows[0]?.[0] ?? '')) rows.shift() // drop header row
  return rows
}

const importCards = async (file: File) => {
  const now = Date.now()
  const parsed = parseCsv(await file.text())
    .filter((r) => (r[0] ?? '').trim())
    .map((r, i): FlashcardItem => ({
      id: now + i,
      term: (r[0] ?? '').trim(),
      definition: (r[1] ?? '').trim(),
      example: (r[2] ?? '').trim() || undefined,
      image: (r[3] ?? '').trim() || undefined,
      audio: (r[4] ?? '').trim() || undefined,
      isFavorite: false,
      status: 'New',
    }))
  cards.value.unshift(...parsed)
  await persist()
}

const exportDeck = () => {
  const headers = ['Term', 'Definition', 'Example', 'Image', 'Audio']
  const rows = cards.value.map((card) => [
    card.term,
    card.definition,
    card.example || '',
    card.image || '',
    card.audio || '',
  ])

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${deck.value?.title ?? 'deck'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
