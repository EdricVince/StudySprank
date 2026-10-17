<template>
  <div class="p-6 lg:p-8">

    <!-- PHASE: JOIN — Enter PIN -->
    <div v-if="phase === 'join'" class="flex min-h-[60vh] flex-col items-center justify-center">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <div class="mb-4 flex justify-center">
            <div class="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-2xl">
              <Radio class="text-primary h-10 w-10" />
            </div>
          </div>
          <h1 class="text-foreground text-3xl font-bold">{{ $t('liveLesson.studentTitle') }}</h1>
          <p class="text-muted-foreground mt-2">{{ $t('liveLesson.enterPinDesc') }}</p>
        </div>

        <form class="space-y-4" @submit.prevent="joinSession">
          <input
            v-model="pin"
            type="text"
            inputmode="numeric"
            :placeholder="$t('liveLesson.pinPlaceholder')"
            maxlength="8"
            class="bg-secondary text-foreground placeholder:text-muted-foreground focus:ring-primary/30 h-16 w-full rounded-2xl border-0 px-6 text-center text-3xl font-black tracking-[0.4em] focus:outline-none focus:ring-2"
            :disabled="joining"
            @input="pin = pin.replace(/\D/g, '')"
          />
          <p v-if="joinError" class="text-destructive text-center text-sm">{{ joinError }}</p>
          <button
            type="submit"
            class="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold transition-colors disabled:opacity-50"
            :disabled="pin.length < 4 || joining"
          >
            <span v-if="joining" class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
            {{ joining ? $t('liveLesson.joining') : $t('liveLesson.joinNow') }}
          </button>
        </form>
      </div>
    </div>

    <!-- PHASE: WAITING — Lobby -->
    <div v-else-if="phase === 'waiting'" class="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div class="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
        <span class="relative flex h-12 w-12">
          <span class="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-30"></span>
          <span class="bg-primary relative inline-flex h-12 w-12 rounded-full opacity-80"></span>
        </span>
      </div>
      <h2 class="text-foreground mb-2 text-2xl font-bold">{{ title }}</h2>
      <p class="text-muted-foreground mb-1">{{ $t('liveLesson.waitingDesc') }}</p>
      <span class="text-chart-2 mt-4 inline-flex items-center gap-1.5 text-xs">
        <span class="bg-chart-2 h-1.5 w-1.5 animate-pulse rounded-full"></span> {{ $t('liveLesson.connectedLive') }}
      </span>
      <button class="text-muted-foreground hover:text-foreground mt-8 text-sm transition-colors" @click="leaveSession">
        {{ $t('liveLesson.leaveSession') }}
      </button>
    </div>

    <!-- PHASE: LIVE — watch the teacher's camera -->
    <div v-else-if="phase === 'live'" class="mx-auto max-w-4xl">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-foreground truncate text-xl font-bold">{{ title }}</h2>
        <span class="text-destructive inline-flex items-center gap-1.5 text-sm font-semibold">
          <span class="bg-destructive h-2 w-2 animate-pulse rounded-full"></span> {{ $t('liveLesson.live') }}
        </span>
      </div>

      <div class="bg-card border-border overflow-hidden rounded-2xl border">
        <div class="relative aspect-video bg-slate-900">
          <video ref="remoteVideo" autoplay playsinline class="h-full w-full object-cover"></video>
          <div v-if="!hasVideo" class="absolute inset-0 flex flex-col items-center justify-center text-white/70">
            <span class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <Radio class="h-7 w-7 animate-pulse" />
            </span>
            <p class="text-sm">{{ $t('liveLesson.followAlong') }}</p>
          </div>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <p v-if="presenceCount" class="text-muted-foreground text-sm">{{ presenceCount }} {{ $t('liveLesson.watching') }}</p>
        <span v-else></span>
        <button class="text-muted-foreground hover:text-destructive text-sm transition-colors" @click="leaveSession">
          {{ $t('liveLesson.leaveSession') }}
        </button>
      </div>
    </div>

    <!-- PHASE: ENDED -->
    <div v-else-if="phase === 'ended'" class="mx-auto max-w-lg text-center">
      <div class="mb-6 flex justify-center">
        <div class="bg-primary/10 flex h-24 w-24 items-center justify-center rounded-full">
          <CircleCheck class="text-primary h-12 w-12" />
        </div>
      </div>
      <h2 class="text-foreground mb-2 text-3xl font-bold">{{ $t('liveLesson.lessonComplete') }}</h2>
      <p class="text-muted-foreground mb-8">{{ $t('liveLesson.lessonCompleteDesc') }}</p>
      <button
        class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 py-3 font-semibold transition-colors"
        @click="reset"
      >
        {{ $t('liveLesson.joinAnother') }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { io, type Socket } from 'socket.io-client'
import { Radio, CircleCheck } from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const authStore = useAuthStore()

type Phase = 'join' | 'waiting' | 'live' | 'ended'

import { API_ORIGIN as SOCKET_URL } from '@/lib/apiBase'
const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

const phase = ref<Phase>('join')
const pin = ref('')
const joining = ref(false)
const joinError = ref('')

const title = ref('')
const presenceCount = ref(0)
const remoteVideo = ref<HTMLVideoElement | null>(null)
const hasVideo = ref(false)

let socket: Socket | null = null
let hostId = ''
let pc: RTCPeerConnection | null = null

// ── WebRTC (student receives the teacher's camera) ───────────────────────────
const ensurePc = () => {
  if (pc) return pc
  pc = new RTCPeerConnection(ICE)
  pc.ontrack = (e) => {
    const [stream] = e.streams
    if (stream && remoteVideo.value) remoteVideo.value.srcObject = stream
    if (e.track.kind === 'video') hasVideo.value = true
  }
  pc.onicecandidate = (e) => {
    if (e.candidate && hostId) socket?.emit('rtc:signal', { to: hostId, data: { candidate: e.candidate } })
  }
  return pc
}

const joinSession = () => {
  if (!pin.value || joining.value) return
  joining.value = true
  joinError.value = ''

  const token = authStore.getAccessToken()
  socket = io(`${SOCKET_URL}/live-quiz`, { auth: { token }, transports: ['websocket', 'polling'] })

  socket.on('connect', () => socket?.emit('lm:join', { pin: pin.value }))

  socket.on('lm:joined', (d: { title: string; status: string }) => {
    joining.value = false
    title.value = d.title
    if (d.status !== 'live') phase.value = 'waiting'
  })

  socket.on('lm:live', (d: { title: string }) => {
    if (d?.title) title.value = d.title
    phase.value = 'live'
  })

  socket.on('rtc:host', (d: { id: string }) => { hostId = d.id })

  // The teacher (host) sends an offer with their camera; answer it.
  socket.on('rtc:signal', async (d: { from: string; data: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
    hostId = d.from
    const peer = ensurePc()
    try {
      if (d.data.sdp) {
        await peer.setRemoteDescription(d.data.sdp)
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        socket?.emit('rtc:signal', { to: d.from, data: { sdp: peer.localDescription } })
      } else if (d.data.candidate) {
        await peer.addIceCandidate(d.data.candidate)
      }
    } catch { /* ignore a transient negotiation error */ }
  })

  socket.on('lm:presence', (d: { count: number }) => { presenceCount.value = d.count })

  socket.on('lm:ended', () => { phase.value = 'ended' })
  socket.on('lm:host_left', () => { if (phase.value !== 'ended') phase.value = 'ended' })

  socket.on('lm:error', (d: { message: string }) => {
    joining.value = false
    if (phase.value === 'join') joinError.value = d.message || t('liveLesson.sessionNotFound')
  })

  socket.on('connect_error', () => {
    joining.value = false
    joinError.value = t('liveLesson.errServer')
  })
}

const teardown = () => {
  if (pc) { pc.close(); pc = null }
  hostId = ''
  hasVideo.value = false
  if (socket) { socket.disconnect(); socket = null }
}

const leaveSession = () => {
  teardown()
  reset()
}

const reset = () => {
  teardown()
  phase.value = 'join'
  pin.value = ''
  joinError.value = ''
  title.value = ''
  presenceCount.value = 0
}

onUnmounted(teardown)
</script>
