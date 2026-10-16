<template>
  <div class="flex items-center gap-2">
    <!-- Speak button -->
    <button
      class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
      :class="isSpeaking ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
      title="Hear pronunciation"
      @click="speak"
    >
      <Volume2 class="h-4 w-4" />
      <span class="hidden sm:inline">Listen</span>
    </button>

    <!-- Mic practice button -->
    <button
      v-if="hasSpeechRecognition"
      class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
      :class="isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
      title="Practice speaking"
      @click="toggleListen"
    >
      <Mic class="h-4 w-4" />
      <span class="hidden sm:inline">{{ isListening ? 'Listening...' : 'Practice' }}</span>
    </button>

    <!-- Result badge -->
    <Transition name="fade-scale">
      <span
        v-if="result !== null"
        class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
        :class="result === 'correct' ? 'bg-green-500/20 text-green-600' : result === 'close' ? 'bg-amber-500/20 text-amber-600' : 'bg-red-500/20 text-red-500'"
      >
        {{ result === 'correct' ? '✓ Perfect!' : result === 'close' ? '≈ Close!' : '✗ Try again' }}
      </span>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Volume2, Mic } from '@/components/icons'
import { sfx } from '@/utils/soundFx'

const props = defineProps<{ word: string }>()

const isSpeaking = ref(false)
const isListening = ref(false)
const result = ref<'correct' | 'close' | 'wrong' | null>(null)
const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window

let recognition: any = null

const speak = () => {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(props.word)
  utt.lang = 'en-US'
  utt.rate = 0.85
  isSpeaking.value = true
  utt.onend = () => { isSpeaking.value = false }
  window.speechSynthesis.speak(utt)
  sfx.flip()
}

const toggleListen = () => {
  if (isListening.value) {
    recognition?.stop()
    return
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition!.lang = 'en-US'
  recognition!.continuous = false
  recognition!.interimResults = false

  isListening.value = true
  result.value = null

  recognition!.onresult = (e: any) => {
    const spoken = e.results[0][0].transcript.trim().toLowerCase()
    const target = props.word.toLowerCase()

    if (spoken === target) {
      result.value = 'correct'
      sfx.correct()
    } else if (similarity(spoken, target) > 0.7) {
      result.value = 'close'
    } else {
      result.value = 'wrong'
      sfx.wrong()
    }
    isListening.value = false
    setTimeout(() => { result.value = null }, 3000)
  }

  recognition!.onerror = () => { isListening.value = false }
  recognition!.onend   = () => { isListening.value = false }
  recognition!.start()
}

// Simple string similarity (Jaro-like)
const similarity = (a: string, b: string) => {
  if (a === b) return 1
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1
  const matches = shorter.split('').filter((c, i) => longer[i] === c).length
  return matches / longer.length
}

onUnmounted(() => { recognition?.stop() })
</script>

<style scoped>
.fade-scale-enter-active { animation: pop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.fade-scale-leave-active { transition: opacity 0.2s; }
.fade-scale-leave-to { opacity: 0; }
@keyframes pop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
