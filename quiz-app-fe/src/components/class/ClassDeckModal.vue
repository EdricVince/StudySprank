<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')"></div>
        <div class="bg-card border-border relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border shadow-xl">
          <div class="border-border flex items-center justify-between border-b px-6 py-4">
            <h3 class="text-foreground text-lg font-semibold">
              {{ deck ? $t('classHub.deckModal.editTitle') : $t('classHub.deckModal.newTitle') }}
            </h3>
            <button type="button" class="text-muted-foreground hover:text-foreground" :aria-label="$t('common.close')" @click="emit('close')">✕</button>
          </div>

          <div class="space-y-4 overflow-y-auto px-6 py-5">
            <div class="space-y-1.5">
              <label class="text-foreground text-sm font-medium" for="deck-title">{{ $t('classHub.deckModal.name') }}</label>
              <input id="deck-title" v-model.trim="form.title" type="text" maxlength="120" :class="fieldClass"
                :placeholder="$t('classHub.deckModal.namePlaceholder')" />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <label class="text-foreground text-sm font-medium" for="deck-cat">{{ $t('classHub.deckModal.category') }}</label>
                <select id="deck-cat" v-model="form.category" :class="fieldClass">
                  <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-foreground text-sm font-medium" for="deck-desc">{{ $t('classHub.deckModal.description') }}</label>
                <input id="deck-desc" v-model.trim="form.description" type="text" maxlength="200" :class="fieldClass" />
              </div>
            </div>

            <!-- AI helper: fills the cards box from a topic -->
            <div class="border-primary/30 bg-primary/5 space-y-3 rounded-xl border p-4">
              <p class="text-foreground text-sm font-semibold">✨ {{ $t('classHub.deckModal.aiTitle') }}</p>
              <div class="grid gap-3 sm:grid-cols-3">
                <input
                  v-model.trim="ai.topic" type="text" maxlength="120" :class="[fieldClass, 'sm:col-span-3']"
                  :placeholder="$t('classHub.deckModal.aiTopicPlaceholder')" :aria-label="$t('classHub.deckModal.aiTopic')"
                />
                <select v-model="ai.level" :class="[fieldClass, 'sm:col-span-2']" :aria-label="$t('classHub.deckModal.aiLevel')">
                  <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
                </select>
                <input v-model.number="ai.count" type="number" min="5" max="30" :class="fieldClass" :aria-label="$t('classHub.deckModal.aiCount')" />
              </div>
              <button
                type="button"
                class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                :disabled="generating || !ai.topic"
                @click="generate"
              >
                {{ generating ? $t('classHub.deckModal.aiGenerating') : $t('classHub.deckModal.aiGenerate') }}
              </button>
              <p v-if="aiError" class="text-destructive text-xs" role="alert">{{ aiError }}</p>
            </div>

            <div class="space-y-1.5">
              <label class="text-foreground text-sm font-medium" for="deck-cards">{{ $t('classHub.deckModal.cards') }}</label>
              <p class="text-muted-foreground text-xs">{{ $t('classHub.deckModal.cardsHint') }}</p>
              <textarea
                id="deck-cards" v-model="form.cardText" rows="9" spellcheck="false"
                class="border-input bg-background focus:border-primary focus:ring-primary/20 w-full rounded-xl border p-3 font-mono text-sm outline-none focus:ring-2"
                :placeholder="'apple | quả táo\nbook | quyển sách'"
              />
              <p class="text-muted-foreground text-xs">{{ $t('classHub.deckModal.cardCount', { n: parsed.length }) }}</p>
            </div>

            <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>
          </div>

          <div class="border-border flex justify-end gap-3 border-t px-6 py-4">
            <button type="button" class="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors" @click="emit('close')">
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              :disabled="saving || !form.title || !parsed.length"
              @click="save"
            >
              {{ saving ? $t('classHub.deckModal.saving') : $t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/utils/api'
import { errorText } from '@/utils/skills'
import { cardsToLines, parseCardLines } from '@/utils/deckText'
import type { FlashcardDeckData } from '@/types/content'

const props = defineProps<{
  show: boolean
  classId: number
  /** The deck to edit; null/undefined creates a new one. */
  deck?: FlashcardDeckData | null
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { t, locale } = useI18n()
const LEVELS = ['Beginner (A1)', 'Elementary (A2)', 'Intermediate (B1)', 'Upper-Intermediate (B2)', 'Advanced (C1)']
const CATEGORIES = ['Vocabulary', 'Grammar', 'Idioms', 'Phrasal Verbs', 'Pronunciation', 'IELTS', 'General']
const fieldClass =
  'border-input bg-background focus:border-primary focus:ring-primary/20 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2'

const form = reactive({ title: '', category: 'Vocabulary', description: '', cardText: '' })
const saving = ref(false)
const error = ref('')
const parsed = computed(() => parseCardLines(form.cardText))

// Fill the form each time the modal opens.
watch(
  () => props.show,
  (open) => {
    if (!open) return
    error.value = ''
    aiError.value = ''
    const d = props.deck
    form.title = d?.title ?? ''
    form.category = d?.category ?? 'Vocabulary'
    form.description = d?.description ?? ''
    form.cardText = d ? cardsToLines(d.cards) : ''
  },
)

// AI helper: ask for a word list on a topic and drop it into the cards box for the teacher to edit.
const ai = reactive({ topic: '', level: 'Intermediate (B1)', count: 12 })
const generating = ref(false)
const aiError = ref('')

async function generate() {
  if (generating.value || !ai.topic) return
  generating.value = true
  aiError.value = ''
  try {
    const set = await api.generateVocabSet({
      topic: ai.topic,
      level: ai.level,
      language: 'en',
      meaningLanguage: locale.value as string,
      count: Math.min(30, Math.max(5, Number(ai.count) || 12)),
    })
    form.cardText = cardsToLines(set.words)
    if (!form.title) form.title = set.name
  } catch (e) {
    aiError.value = errorText(e, t('classHub.deckModal.aiFailed'))
  } finally {
    generating.value = false
  }
}

async function save() {
  if (saving.value || !form.title || !parsed.value.length) return
  saving.value = true
  error.value = ''
  const body = {
    title: form.title,
    category: form.category,
    description: form.description,
    cards: parsed.value,
    class_id: props.classId,
  }
  try {
    if (props.deck) await api.updateFlashcardDeck(props.deck.id, body)
    else await api.createFlashcardDeck(body)
    emit('saved')
    emit('close')
  } catch (e) {
    error.value = errorText(e, t('classHub.deckModal.failed'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
