<template>
  <div class="listen-card" data-test="listening-player">
    <div class="listen-card-header">
      <div class="flex items-center gap-3">
        <div class="listen-icon-box">🎧</div>
        <div>
          <div class="listen-title">{{ $t('exam.take.audioTitle') }}</div>
          <div class="listen-sub">{{ label }}</div>
        </div>
      </div>
      <div class="listen-badge" :class="isPlaying ? 'listen-badge-playing' : hasPlayed ? 'listen-badge-done' : 'listen-badge-idle'">
        <span class="listen-dot" :class="isPlaying ? 'listen-dot-playing' : hasPlayed ? 'listen-dot-done' : 'listen-dot-idle'"></span>
        {{ isPlaying ? $t('exam.take.audioNow') : hasPlayed ? $t('exam.take.audioDone') : $t('exam.take.audioReady') }}
      </div>
    </div>

    <div class="px-5 pt-5 pb-4">
      <div class="listen-wave-bg">
        <div v-if="isPlaying" class="listen-sweep" />
        <div class="relative flex items-center gap-[2.5px]">
          <div
            v-for="(bar, i) in waveformBars"
            :key="i"
            class="rounded-full"
            :class="isPlaying ? 'listen-bar-playing' : hasPlayed ? 'listen-bar-done' : 'listen-bar-idle'"
            :style="{
              width: '3px',
              height: (isPlaying ? bar.h : Math.max(bar.h * 0.28, 3)) + 'px',
              animation: isPlaying ? `listen-bar-wave ${bar.d}s ease-in-out ${bar.o} infinite alternate` : 'none',
              transition: 'height 0.4s ease, background-color 0.3s ease',
            }"
          />
        </div>
      </div>
    </div>

    <div class="listen-controls mx-5 mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5">
      <button
        type="button"
        class="listen-play-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90"
        :title="isPlaying ? $t('exam.take.audioPause') : $t('exam.take.audioPlay')"
        :aria-label="isPlaying ? $t('exam.take.audioPause') : $t('exam.take.audioPlay')"
        data-test="listening-play"
        @click="togglePlay"
      >
        <svg v-if="!isPlaying" class="h-4 w-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" />
        </svg>
      </button>
      <span class="listen-time shrink-0 font-mono text-xs tabular-nums">{{ fmt(currentTime) }} / {{ fmt(duration) }}</span>
      <div class="listen-seek relative h-1.5 flex-1 rounded-full">
        <div class="listen-seek-fill absolute left-0 top-0 h-full rounded-full" :style="{ width: progressPct + '%' }" />
        <div class="listen-seek-knob absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow" :style="{ left: progressPct + '%' }" />
      </div>
    </div>
    <p class="text-muted-foreground px-5 pb-4 text-[11px] leading-relaxed">{{ $t('exam.take.audioHint') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'

const props = defineProps<{ script: string; label: string }>()

/** "Anna: Hello" → "Hello": the speaker names are not read out. */
const spoken = computed(() => props.script.replace(/^[A-Z][\w .'’-]{0,30}:\s+/gm, ''))

const isPlaying = ref(false)
const hasPlayed = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let keepAliveTimer: ReturnType<typeof setInterval> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null
// Cancels a start that is still waiting for voices to load (Chrome).
let cancelPendingStart: (() => void) | null = null

const progressPct = computed(() => (duration.value ? Math.min(100, (currentTime.value / duration.value) * 100) : 0))

function fmt(s: number): string {
  s = Math.max(0, Math.floor(s))
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// Estimated spoken length: ~127 wpm at rate 0.85 → about 2.1 words per second
function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.round(words / 2.1))
}

const waveformBars = [
  { h: 8, d: '0.80', o: '0.00s' }, { h: 16, d: '0.65', o: '0.04s' }, { h: 28, d: '0.90', o: '0.08s' }, { h: 40, d: '0.70', o: '0.12s' },
  { h: 32, d: '0.85', o: '0.16s' }, { h: 20, d: '0.60', o: '0.20s' }, { h: 12, d: '0.95', o: '0.24s' }, { h: 24, d: '0.75', o: '0.28s' },
  { h: 38, d: '0.80', o: '0.32s' }, { h: 44, d: '0.65', o: '0.36s' }, { h: 36, d: '1.00', o: '0.40s' }, { h: 20, d: '0.70', o: '0.44s' },
  { h: 12, d: '0.85', o: '0.48s' }, { h: 28, d: '0.60', o: '0.52s' }, { h: 40, d: '0.90', o: '0.56s' }, { h: 32, d: '0.75', o: '0.60s' },
  { h: 16, d: '0.80', o: '0.64s' }, { h: 8, d: '0.65', o: '0.68s' }, { h: 20, d: '0.95', o: '0.72s' }, { h: 36, d: '0.70', o: '0.76s' },
  { h: 44, d: '0.85', o: '0.80s' }, { h: 38, d: '0.60', o: '0.84s' }, { h: 24, d: '1.00', o: '0.88s' }, { h: 12, d: '0.75', o: '0.92s' },
  { h: 20, d: '0.80', o: '0.96s' }, { h: 32, d: '0.65', o: '1.00s' }, { h: 40, d: '0.90', o: '1.04s' }, { h: 28, d: '0.70', o: '1.08s' },
  { h: 16, d: '0.85', o: '1.12s' }, { h: 8, d: '0.60', o: '1.16s' }, { h: 20, d: '0.95', o: '1.20s' }, { h: 32, d: '0.75', o: '1.24s' },
  { h: 40, d: '0.80', o: '1.28s' }, { h: 44, d: '0.65', o: '1.32s' }, { h: 36, d: '1.00', o: '1.36s' }, { h: 24, d: '0.70', o: '1.40s' },
  { h: 12, d: '0.85', o: '1.44s' }, { h: 20, d: '0.60', o: '1.48s' }, { h: 32, d: '0.90', o: '1.52s' }, { h: 40, d: '0.75', o: '1.56s' },
]

function clearTimers() {
  if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null }
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
}

function stopTTS() {
  // Abort a start that is still waiting for voices, so it can't fire later.
  cancelPendingStart?.()
  clearTimers()
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
  isPlaying.value = false
}

function doSpeak(text: string) {
  const synth = window.speechSynthesis
  if (synth.paused) synth.resume() // Chrome bug: stuck in the paused state
  synth.cancel()
  clearTimers()

  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.85
  utt.lang = 'en-GB'

  duration.value = estimateDuration(text)
  currentTime.value = 0
  isPlaying.value = true
  hasPlayed.value = true

  progressTimer = setInterval(() => {
    if (isPlaying.value) currentTime.value = Math.min(duration.value, currentTime.value + 0.25)
  }, 250)
  // Chrome cancels long utterances after ~15 s: keep it alive
  keepAliveTimer = setInterval(() => {
    if (synth.speaking && !synth.paused) { synth.pause(); synth.resume() }
  }, 10000)

  const textLen = text.length
  utt.onboundary = (e: SpeechSynthesisEvent) => {
    if (e.charIndex != null && textLen) currentTime.value = (e.charIndex / textLen) * duration.value
  }
  utt.onend = () => { currentTime.value = duration.value; isPlaying.value = false; clearTimers() }
  utt.onerror = () => { isPlaying.value = false; clearTimers() }
  synth.speak(utt)
}

function playTTS() {
  const text = spoken.value
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
  const synth = window.speechSynthesis
  if (synth.getVoices().length > 0) { doSpeak(text); return }

  // Chrome: voices not loaded yet — wait for them, then speak (once).
  let started = false
  const onReady = () => startOnce()
  const timer = setTimeout(() => startOnce(), 800)
  const cleanup = () => {
    synth.removeEventListener('voiceschanged', onReady)
    clearTimeout(timer)
    cancelPendingStart = null
  }
  const startOnce = () => {
    if (started) return
    started = true
    cleanup()
    doSpeak(text)
  }
  cancelPendingStart = () => { started = true; cleanup() }
  synth.addEventListener('voiceschanged', onReady)
}

function togglePlay() {
  if (isPlaying.value) stopTTS()
  else playTTS()
}

// A different part has a different script: stop the old audio.
watch(() => props.script, () => {
  stopTTS()
  hasPlayed.value = false
  currentTime.value = 0
  duration.value = 0
})

onUnmounted(stopTTS)
</script>

<style>
/* Global (unscoped) so the inline :style animation binding on the waveform bars
   can reference them — scoped keyframes get renamed and wouldn't match. */
@keyframes listen-bar-wave {
  from { transform: scaleY(0.2); }
  to   { transform: scaleY(1); }
}
@keyframes listen-bg-sweep {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
