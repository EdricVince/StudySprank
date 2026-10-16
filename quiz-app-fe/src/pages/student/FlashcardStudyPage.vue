<template>
  <div class="flex min-h-[calc(100vh-4rem)] flex-col p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ currentDeck.title }}</h1>
          <p class="text-muted-foreground mt-1 text-base">{{ currentDeck.description }}</p>
        </div>
        <Button variant="outline" @click="exitStudy">
          <X class="mr-2 h-4 w-4" />
          Exit
        </Button>
      </div>
    </div>

    <!-- Progress Bar -->
    <div v-if="!isLoadingCards" class="mb-6">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-muted-foreground text-sm">
          Card {{ currentIndex + 1 }} of {{ cards.length }}
        </span>
        <div class="flex items-center gap-4">
          <span
            v-if="dueInfo"
            data-test="due-count"
            class="bg-secondary text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium"
            title="Spaced repetition (SM-2): cards scheduled for review today"
          >
            {{ dueInfo.due }} due · {{ dueInfo.fresh }} new
          </span>
          <span class="text-primary flex items-center gap-1 text-sm font-medium">
            <CheckCircle class="h-4 w-4" />
            {{ knownCount }} known
          </span>
          <span class="text-muted-foreground flex items-center gap-1 text-sm">
            <XCircle class="h-4 w-4" />
            {{ unknownCount }} learning
          </span>
        </div>
      </div>
      <div class="bg-secondary h-2 overflow-hidden rounded-full">
        <div
          class="bg-primary h-full rounded-full transition-all duration-500"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>
    </div>

    <!-- Loading State (AI is generating a fresh vocab batch) -->
    <div v-if="isLoadingCards" class="flex flex-1 flex-col items-center justify-center gap-4">
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
      <p class="text-muted-foreground text-base">Generating fresh vocabulary…</p>
    </div>

    <!-- Main Card Area -->
    <div v-else class="flex flex-1 flex-col items-center justify-center">
      <!-- Card Container -->
      <div
        ref="cardContainer"
        class="perspective-1000 relative h-80 w-full max-w-lg lg:h-96"
        @click="flipCard"
      >
        <!-- Card -->
        <div
          class="card-inner absolute inset-0 transition-transform duration-500"
          :style="cardStyle"
        >
          <!-- Front (Term) -->
          <div class="card-face card-front bg-card border-border absolute inset-0 flex flex-col rounded-3xl border shadow-lg">
            <!-- Card Header -->
            <div class="flex items-center justify-between p-5">
              <span class="text-muted-foreground text-sm font-medium">
                <template v-if="isVocabMode">{{ currentLearningOption.flag }} {{ currentLearningOption.label }}</template>
                <template v-else>Term</template>
              </span>
              <div class="flex items-center gap-2">
                <!-- Speech button always shown -->
                <button
                  class="hover:bg-secondary rounded-lg p-2 transition-colors"
                  title="Listen to pronunciation"
                  @click.stop="speakCurrentTerm"
                >
                  <Volume2 class="text-primary h-5 w-5" />
                </button>
                <button
                  v-if="currentCard?.audio && !isVocabMode"
                  class="hover:bg-secondary rounded-lg p-2 transition-colors"
                  @click.stop="playAudio"
                >
                  <Volume2 class="text-muted-foreground h-5 w-5" />
                </button>
                <button
                  class="rounded-lg p-2 transition-colors"
                  :class="currentCard?.isFavorite ? 'text-primary' : 'text-muted-foreground hover:bg-secondary'"
                  @click.stop="toggleFavorite"
                >
                  <Heart class="h-5 w-5" :fill="currentCard?.isFavorite ? 'currentColor' : 'none'" />
                </button>
              </div>
            </div>
            <!-- Card Content -->
            <div class="flex flex-1 flex-col items-center justify-center p-6">
              <img
                v-if="currentCard?.image"
                :src="currentCard.image"
                :alt="currentCard.term"
                class="mb-4 h-32 w-32 rounded-xl object-cover"
              />
              <p class="text-foreground text-center text-xl font-medium lg:text-2xl">
                {{ currentCard?.term }}
              </p>
            </div>
            <!-- Hint -->
            <div class="p-5 text-center">
              <p v-if="currentCard?.srsReason" data-test="srs-reason" class="text-muted-foreground mb-2 text-xs">
                Why this card: {{ currentCard.srsReason }}
              </p>
              <span class="text-muted-foreground text-sm">
                Tap the card or press
                <kbd class="bg-secondary mx-1 rounded px-2 py-0.5 font-mono text-xs">Space</kbd>
                to see the meaning
              </span>
            </div>
          </div>

          <!-- Back (Definition) -->
          <div class="card-face card-back bg-card border-border absolute inset-0 flex flex-col rounded-3xl border shadow-lg">
            <!-- Card Header -->
            <div class="flex items-center justify-between p-5">
              <span class="text-primary text-sm font-medium">
                <template v-if="isVocabMode">{{ uiLang.toUpperCase() }} Meaning</template>
                <template v-else>Definition</template>
              </span>
              <div class="flex items-center gap-2">
                <button
                  v-if="currentCard?.audio"
                  class="hover:bg-secondary rounded-lg p-2 transition-colors"
                  @click.stop="playAudio"
                >
                  <Volume2 class="text-muted-foreground h-5 w-5" />
                </button>
                <button
                  class="rounded-lg p-2 transition-colors"
                  :class="currentCard?.isFavorite ? 'text-primary' : 'text-muted-foreground hover:bg-secondary'"
                  @click.stop="toggleFavorite"
                >
                  <Heart class="h-5 w-5" :fill="currentCard?.isFavorite ? 'currentColor' : 'none'" />
                </button>
              </div>
            </div>
            <!-- Card Content: meaning + a simple explanation -->
            <div class="flex flex-1 flex-col items-center justify-center gap-3 p-6">
              <p class="text-foreground text-center text-xl font-medium lg:text-2xl">
                {{ currentCard?.definition }}
              </p>
              <p
                v-if="currentCard?.explanation"
                class="text-muted-foreground max-w-sm text-center text-sm leading-relaxed lg:text-base"
              >
                {{ currentCard.explanation }}
              </p>
            </div>
            <!-- Example if available -->
            <div v-if="currentCard?.example" class="border-border border-t p-5">
              <p class="text-muted-foreground text-center text-sm italic">
                "{{ currentCard.example }}"
              </p>
            </div>
          </div>
        </div>

        <!-- Swipe Indicators -->
        <div
          class="pointer-events-none absolute inset-y-0 left-0 flex w-20 items-center justify-center rounded-l-3xl opacity-0 transition-opacity duration-200"
          :class="{ 'opacity-100': swipeDirection === 'left' }"
          :style="{ background: 'linear-gradient(to right, var(--destructive), transparent)' }"
        >
          <XCircle class="h-10 w-10 text-white" />
        </div>
        <div
          class="pointer-events-none absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-r-3xl opacity-0 transition-opacity duration-200"
          :class="{ 'opacity-100': swipeDirection === 'right' }"
          :style="{ background: 'linear-gradient(to left, var(--primary), transparent)' }"
        >
          <CheckCircle class="h-10 w-10 text-white" />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-8 flex items-center justify-center gap-6">
        <button
          class="group flex h-16 w-16 items-center justify-center rounded-full border-2 border-destructive/30 bg-destructive/10 transition-all duration-200 hover:scale-110 hover:border-destructive hover:bg-destructive/20 active:scale-95"
          @click="markUnknown"
        >
          <X class="text-destructive h-7 w-7 transition-transform group-hover:scale-110" />
        </button>

        <button
          class="bg-secondary hover:bg-secondary/80 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
          @click="flipCard"
        >
          <RotateCcw class="text-muted-foreground h-5 w-5" />
        </button>

        <button
          class="group flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 transition-all duration-200 hover:scale-110 hover:border-primary hover:bg-primary/20 active:scale-95"
          @click="markKnown"
        >
          <Check class="text-primary h-7 w-7 transition-transform group-hover:scale-110" />
        </button>
      </div>

      <!-- Keyboard Hints -->
      <div class="mt-6 hidden items-center justify-center gap-6 lg:flex">
        <div class="text-muted-foreground flex items-center gap-2 text-sm">
          <kbd class="bg-secondary rounded px-2 py-1 font-mono text-xs">←</kbd>
          <span>Don't know</span>
        </div>
        <div class="text-muted-foreground flex items-center gap-2 text-sm">
          <kbd class="bg-secondary rounded px-2 py-1 font-mono text-xs">Space</kbd>
          <span>Flip card</span>
        </div>
        <div class="text-muted-foreground flex items-center gap-2 text-sm">
          <kbd class="bg-secondary rounded px-2 py-1 font-mono text-xs">→</kbd>
          <span>Know it</span>
        </div>
      </div>
    </div>

    <!-- Completion Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCompletionModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div class="bg-card border-border w-full max-w-md rounded-3xl border p-8 text-center shadow-xl">
            <div class="bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
              <Trophy class="text-primary h-10 w-10" />
            </div>
            <h2 class="text-foreground mb-2 text-2xl font-bold">Session Complete!</h2>
            <p class="text-muted-foreground mb-6">You've reviewed all {{ cards.length }} cards</p>

            <!-- Stats -->
            <div class="mb-8 grid grid-cols-2 gap-4">
              <div class="bg-primary/10 rounded-2xl p-4">
                <p class="text-primary text-3xl font-bold">{{ knownCount }}</p>
                <p class="text-muted-foreground text-sm">Known</p>
              </div>
              <div class="bg-secondary rounded-2xl p-4">
                <p class="text-foreground text-3xl font-bold">{{ unknownCount }}</p>
                <p class="text-muted-foreground text-sm">Still Learning</p>
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <Button class="w-full" @click="restartSession">
                <RotateCcw class="mr-2 h-4 w-4" />
                Study Again
              </Button>
              <Button variant="outline" class="w-full" :disabled="unknownCount === 0" @click="reviewUnknown">
                <RefreshCw class="mr-2 h-4 w-4" />
                Review {{ unknownCount }} Learning Cards
              </Button>
              <Button variant="ghost" class="w-full" @click="exitStudy">
                Exit Session
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Hammer from 'hammerjs'
import { useProgressStore } from '@/stores/progress.store'
import { useToast } from '@/composables/useToast'
import { useLearningLanguage } from '@/composables/useLearningLanguage'
import { useLocale } from '@/composables/useLocale'
import { useVocabulary } from '@/composables/useVocabulary'
import { api } from '@/utils/api'
import { QUALITY_KNOWN, QUALITY_UNKNOWN, describeDueReason } from '@/utils/srs'
import {
  X,
  Check,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  Heart,
  Volume2,
  Trophy,
} from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'

const route = useRoute()
const router = useRouter()
const progressStore = useProgressStore()
const toast = useToast()
const { currentOption: currentLearningOption } = useLearningLanguage()
const { locale: uiLang } = useLocale()
const { getRandomWords, getWordInLang } = useVocabulary()

const isVocabMode = computed(() => route.name === 'FlashcardVocabPractice' || route.query.mode === 'vocab')
const isVocabSetMode = computed(() => route.name === 'FlashcardVocabSetStudy')
const deckId = computed(() => Number(route.params.id))
const deckMeta = ref<{ title: string; description: string } | null>(null)
// Spaced repetition applies to flashcard decks only (not AI practice / teacher vocab sets).
const isSrsMode = computed(() => !isVocabMode.value && !isVocabSetMode.value)
const dueInfo = ref<{ due: number; fresh: number } | null>(null)

const cardContainer = ref<HTMLElement | null>(null)
let hammer: HammerManager | null = null

const isFlipped = ref(false)
const currentIndex = ref(0)
const swipeDirection = ref<'left' | 'right' | null>(null)
const cardOffset = ref({ x: 0, y: 0, rotation: 0 })
const showCompletionModal = ref(false)

const currentDeck = computed(() => {
  if (isVocabMode.value) {
    return { id: 'vocab', title: `${currentLearningOption.value.flag} Vocabulary Practice`, description: `Learn ${currentLearningOption.value.name} words with ${uiLang.value.toUpperCase()} translations` }
  }
  return { id: deckId.value, title: deckMeta.value?.title ?? 'Deck', description: deckMeta.value?.description ?? '' }
})

// Flashcard interface
interface Flashcard {
  id: number
  term: string
  definition: string
  explanation?: string
  example?: string
  image?: string
  audio?: string
  isFavorite: boolean
  isKnown: boolean | null
  cardKey?: string // SM-2 key (deck mode)
  srsReason?: string // why the scheduler shows this card again
}

const isLoadingCards = ref(false)

// Local fallback batch (offline / AI not configured) — the static word list.
function buildVocabCards(): Flashcard[] {
  const words = getRandomWords(15)
  return words.map((w, i) => ({
    id: i + 1,
    term: getWordInLang(w, currentLearningOption.value.value),
    definition: getWordInLang(w, uiLang.value as string),
    example: undefined,
    isFavorite: false,
    isKnown: null,
  }))
}

// Fresh, diverse batch from the AI endpoint. Falls back to the local list on any error.
async function loadVocabCards(exclude: string[] = []): Promise<Flashcard[]> {
  try {
    const items = await api.generateVocabulary({
      learningLang: currentLearningOption.value.value,
      uiLang: uiLang.value as string,
      count: 15,
      exclude,
    })
    if (items && items.length) {
      return items.map((it, i) => ({
        id: i + 1,
        term: it.term,
        definition: it.meaning,
        explanation: it.explanation || undefined,
        example: it.example || undefined,
        isFavorite: false,
        isKnown: null,
      }))
    }
  } catch {
    // AI unavailable — fall through to the local word list.
  }
  return buildVocabCards()
}

// A regular deck's cards are loaded from the backend in onMounted (no sample data).
const cards = ref<Flashcard[]>([])

const currentCard = computed(() => cards.value[currentIndex.value])

const knownCount = computed(() => cards.value.filter(c => c.isKnown === true).length)
const unknownCount = computed(() => cards.value.filter(c => c.isKnown === false).length)
const progressPercent = computed(() => {
  const reviewed = cards.value.filter(c => c.isKnown !== null).length
  return (reviewed / cards.value.length) * 100
})

const cardStyle = computed(() => {
  const { x, y, rotation } = cardOffset.value
  // The flip must live in the same inline transform as the swipe offset, otherwise
  // this inline style overrides the .rotate-y-180 CSS class and the card never flips.
  const flip = isFlipped.value ? ' rotateY(180deg)' : ''
  return {
    transform: `translateX(${x}px) translateY(${y}px) rotate(${rotation}deg)${flip}`,
  }
})

const flipCard = () => {
  isFlipped.value = !isFlipped.value
}

// Known → quality 4, Don't know → quality 1; the server reschedules the card (SM-2).
const recordReview = (quality: number) => {
  const card = currentCard.value
  if (!isSrsMode.value || !card?.cardKey) return
  api.reviewCard(deckId.value, card.cardKey, quality).catch(() => {})
}

const markKnown = () => {
  if (currentCard.value) {
    currentCard.value.isKnown = true
    recordReview(QUALITY_KNOWN)
  }
  animateSwipe('right')
}

const markUnknown = () => {
  if (currentCard.value) {
    currentCard.value.isKnown = false
    recordReview(QUALITY_UNKNOWN)
  }
  animateSwipe('left')
}

const animateSwipe = (direction: 'left' | 'right') => {
  const xOffset = direction === 'right' ? 300 : -300
  cardOffset.value = { x: xOffset, y: 0, rotation: direction === 'right' ? 15 : -15 }

  setTimeout(() => {
    goToNext()
    cardOffset.value = { x: 0, y: 0, rotation: 0 }
  }, 200)
}

const goToNext = async () => {
  isFlipped.value = false
  if (currentIndex.value < cards.value.length - 1) {
    currentIndex.value++
  } else {
    showCompletionModal.value = true
    const result = await progressStore.logFlashcardSession(knownCount.value)
    if (result?.level_up) {
      toast.success(`Level up! You're now Level ${result.new_level}! 🎉`)
    } else if (result?.xp_gained) {
      toast.success(`+${result.xp_gained} XP! Great session!`)
    }
  }
}

const toggleFavorite = () => {
  if (currentCard.value) {
    currentCard.value.isFavorite = !currentCard.value.isFavorite
  }
}

const playAudio = () => {
  if (currentCard.value?.audio) {
    const audio = new Audio(currentCard.value.audio)
    audio.play().catch(() => {})
  }
}

const speakCurrentTerm = () => {
  if (!('speechSynthesis' in window) || !currentCard.value) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(currentCard.value.term)
  u.lang = currentLearningOption.value.speechCode
  const voices = window.speechSynthesis.getVoices()
  const langPrefix = u.lang.split('-')[0] ?? u.lang
  const v = voices.find(v => v.lang === u.lang && v.localService)
    || voices.find(v => v.lang === u.lang)
    || voices.find(v => v.lang.startsWith(langPrefix))
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}

const restartSession = async () => {
  showCompletionModal.value = false
  isFlipped.value = false
  currentIndex.value = 0
  if (isVocabMode.value) {
    // Pull a brand-new, different batch so "Study Again" isn't the same words.
    isLoadingCards.value = true
    const prevTerms = cards.value.map(c => c.term)
    cards.value = await loadVocabCards(prevTerms)
    isLoadingCards.value = false
  } else {
    cards.value.forEach(c => (c.isKnown = null))
  }
}

const reviewUnknown = () => {
  const unknownCards = cards.value.filter(c => c.isKnown === false)
  cards.value = unknownCards.map(c => ({ ...c, isKnown: null }))
  currentIndex.value = 0
  isFlipped.value = false
  showCompletionModal.value = false
}

const exitStudy = () => {
  router.push('/flashcards')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (showCompletionModal.value) return

  switch (e.key) {
    case ' ':
    case 'Enter':
      e.preventDefault()
      flipCard()
      break
    case 'ArrowLeft':
      e.preventDefault()
      markUnknown()
      break
    case 'ArrowRight':
      e.preventDefault()
      markKnown()
      break
    case 'f':
      e.preventDefault()
      toggleFavorite()
      break
  }
}

const setupHammer = () => {
  if (!cardContainer.value) return

  hammer = new Hammer(cardContainer.value)
  hammer.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL })

  hammer.on('pan', (e) => {
    const x = e.deltaX
    const rotation = x * 0.05
    cardOffset.value = { x, y: 0, rotation }

    if (x > 50) {
      swipeDirection.value = 'right'
    } else if (x < -50) {
      swipeDirection.value = 'left'
    } else {
      swipeDirection.value = null
    }
  })

  hammer.on('panend', (e) => {
    const threshold = 100

    if (e.deltaX > threshold) {
      markKnown()
    } else if (e.deltaX < -threshold) {
      markUnknown()
    } else {
      // Reset position
      cardOffset.value = { x: 0, y: 0, rotation: 0 }
    }
    swipeDirection.value = null
  })
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  setupHammer()
  if (isVocabMode.value) {
    isLoadingCards.value = true
    cards.value = await loadVocabCards()
    isLoadingCards.value = false
    return
  }
  isLoadingCards.value = true
  try {
    if (isVocabSetMode.value) {
      // A published teacher vocabulary set — study its words as flip cards.
      const s = await api.getVocabSet(deckId.value)
      deckMeta.value = { title: s.name, description: `${s.language} · ${s.level}` }
      cards.value = (s.words ?? []).map((w, i) => ({
        id: i + 1, term: w.term, definition: w.definition, example: w.example,
        isFavorite: false, isKnown: null,
      }))
    } else {
      // A flashcard deck — study what the spaced-repetition scheduler says is due.
      const [d, due] = await Promise.all([
        api.getFlashcardDeck(deckId.value),
        api.getDueCards(deckId.value).catch(() => null),
      ])
      deckMeta.value = { title: d.title, description: d.description ?? '' }
      if (due && due.cards.length) {
        dueInfo.value = { due: due.due_count, fresh: due.new_count }
        cards.value = due.cards.map((c, i) => ({
          id: i + 1, term: c.term, definition: c.definition,
          example: c.example, image: c.image, audio: c.audio,
          cardKey: c.card_key, srsReason: describeDueReason(c),
          isFavorite: false, isKnown: null,
        }))
      } else {
        // Nothing due (or scheduler unavailable) — practise the whole deck.
        if (due) dueInfo.value = { due: 0, fresh: 0 }
        cards.value = d.cards.map((c, i) => ({
          id: i + 1, term: c.term, definition: c.definition,
          example: c.example, image: c.image, audio: c.audio,
          cardKey: due ? c.term : undefined,
          srsReason: due ? 'Nothing is due right now — practising ahead of schedule.' : undefined,
          isFavorite: false, isKnown: null,
        }))
      }
    }
  } catch {
    router.replace('/flashcards')
    return
  } finally {
    isLoadingCards.value = false
  }
  // Empty deck — send the user back (own decks only).
  if (cards.value.length === 0 && !isVocabSetMode.value) router.replace(`/flashcards/${deckId.value}`)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (hammer) {
    hammer.destroy()
  }
})

watch(currentIndex, () => {
  isFlipped.value = false
})
</script>

<style scoped>
.perspective-1000 { perspective: 1000px; }
.card-inner { transform-style: preserve-3d; }
.card-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.card-back { transform: rotateY(180deg); }
.rotate-y-180 { transform: rotateY(180deg); }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from > div, .modal-leave-to > div { transform: scale(0.95) translateY(20px); }

kbd { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 0 0 var(--border); }
</style>
