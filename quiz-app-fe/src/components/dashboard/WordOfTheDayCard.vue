<template>
  <!-- Hidden on error or loading failure -->
  <Transition name="slide-down">
    <div v-if="!error && (loading || word)" class="bg-card border-border rounded-xl border overflow-hidden">
      <!-- Compact header row (always visible) -->
      <button
        class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        @click="expanded = !expanded"
      >
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
          <Sparkles class="h-3.5 w-3.5 text-violet-500" />
        </div>

        <!-- Loading state -->
        <template v-if="loading">
          <div class="bg-muted h-4 w-24 animate-pulse rounded" />
          <div class="bg-muted ml-2 h-3 w-32 animate-pulse rounded" />
        </template>

        <!-- Word summary -->
        <template v-else-if="word">
          <span class="text-foreground font-semibold">{{ word.word }}</span>
          <span class="text-muted-foreground hidden text-sm sm:block">{{ word.phonetic }}</span>
          <span class="bg-secondary text-muted-foreground rounded px-1.5 py-0.5 text-xs">{{ word.partOfSpeech }}</span>
          <span class="ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" :class="difficultyClass">
            {{ word.difficulty }}
          </span>
        </template>

        <div class="ml-auto flex items-center gap-2">
          <span class="text-muted-foreground text-xs">{{ $t('dashboard.wordOfTheDay') }}</span>
          <ChevronDown
            class="text-muted-foreground h-4 w-4 transition-transform duration-200"
            :class="{ 'rotate-180': expanded }"
          />
        </div>
      </button>

      <!-- Expanded detail panel -->
      <Transition name="expand">
        <div v-if="expanded && word" class="border-border border-t px-4 pb-4 pt-3">
          <div class="space-y-3">
            <!-- Word + listen -->
            <div class="flex items-center gap-2">
              <h2 class="text-foreground text-xl font-bold">{{ word.word }}</h2>
              <button
                class="text-muted-foreground hover:text-violet-500 transition-colors"
                :class="{ 'text-violet-500': isSpeaking }"
                title="Listen"
                @click.stop="speak"
              >
                <Volume2 class="h-4 w-4" />
              </button>
              <span class="text-muted-foreground font-mono text-sm">{{ word.phonetic }}</span>
            </div>

            <!-- Definition -->
            <p class="text-foreground text-sm leading-relaxed">{{ word.definition }}</p>

            <!-- Example -->
            <div class="border-l-2 border-violet-500/40 pl-3">
              <p class="text-muted-foreground text-sm italic">"{{ word.example }}"</p>
            </div>

            <!-- Synonyms -->
            <div v-if="word.synonyms?.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="syn in word.synonyms"
                :key="syn"
                class="bg-secondary text-muted-foreground rounded-full px-2.5 py-0.5 text-xs"
              >{{ syn }}</span>
            </div>

            <!-- Tip -->
            <div class="bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2">
              <p class="text-violet-600 dark:text-violet-400 text-xs">
                <span class="font-semibold">💡</span> {{ word.tip }}
              </p>
            </div>

            <!-- Actions — pull a fresh random word on demand -->
            <div class="flex gap-2 pt-1">
              <button
                class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60"
                :disabled="loading"
                :title="$t('dashboard.newWord')"
                @click.stop="fetchWord(true)"
              >
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
                {{ $t('dashboard.newWord') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Sparkles, Volume2, RefreshCw, ChevronDown } from '@/components/icons'
import { api } from '@/utils/api'

const CACHE_KEY = 'wotd-cache'

interface Word {
  word: string; phonetic: string; partOfSpeech: string
  definition: string; example: string; synonyms: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'; tip: string
}

const word = ref<Word | null>(null)
const loading = ref(false)
const error = ref(false)
const isSpeaking = ref(false)
const expanded = ref(false)

const difficultyClass = computed(() => ({
  beginner:     'bg-green-500/10 text-green-600',
  intermediate: 'bg-amber-500/10 text-amber-600',
  advanced:     'bg-red-500/10 text-red-500',
}[word.value?.difficulty ?? 'beginner']))

// `fresh` (the refresh button) skips the daily cache and asks the server for a
// brand-new random word; otherwise the same word is shown for the whole day.
const fetchWord = async (fresh = false) => {
  if (!fresh) {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { date, data } = JSON.parse(cached)
      if (date === new Date().toDateString()) { word.value = data; return }
    }
  }
  loading.value = true; error.value = false
  try {
    word.value = await api.getWordOfTheDay(fresh)
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: new Date().toDateString(), data: word.value }))
  } catch { error.value = true }
  finally { loading.value = false }
}

const speak = () => {
  if (!word.value || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(word.value.word)
  utt.lang = 'en-US'; utt.rate = 0.85
  isSpeaking.value = true
  utt.onend = () => { isSpeaking.value = false }
  window.speechSynthesis.speak(utt)
}

onMounted(() => fetchWord())
</script>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }

.expand-enter-active, .expand-leave-active { transition: all 0.25s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; }
.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 400px; }
</style>
