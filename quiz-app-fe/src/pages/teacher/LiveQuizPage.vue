<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-foreground text-2xl font-bold">{{ $t('liveLesson.teacherTitle') }}</h2>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('liveLesson.teacherSubtitle') }}</p>
      </div>
    </div>

    <!-- PHASE: SETUP — just name the room and go live -->
    <div v-if="phase === 'setup'" class="mx-auto max-w-lg">
      <div class="bg-card border-border space-y-5 rounded-2xl border p-6">
        <div>
          <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('liveLesson.lessonTitle') }} *</label>
          <input
            v-model="lessonTitle"
            type="text"
            :placeholder="$t('liveLesson.lessonTitlePlaceholder')"
            class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            @keyup.enter="createAndHost"
          />
        </div>
        <p v-if="setupError" class="text-destructive text-sm">{{ setupError }}</p>
        <button
          class="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-colors disabled:opacity-50"
          :disabled="creating"
          @click="createAndHost"
        >
          <span v-if="creating" class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
          <Radio v-else class="h-5 w-5" />
          {{ creating ? $t('liveLesson.creating') : $t('liveLesson.createAndGoLive') }}
        </button>
      </div>
    </div>

    <!-- PHASE: LOBBY / LIVE — the meeting room with the teacher's camera -->
    <div v-else-if="phase === 'lobby' || phase === 'live'" class="grid gap-6 lg:grid-cols-5">
      <!-- Left: camera + controls -->
      <div class="space-y-4 lg:col-span-3">
        <div class="bg-card border-border overflow-hidden rounded-2xl border">
          <div class="relative aspect-video bg-slate-900">
            <video ref="localVideo" autoplay muted playsinline class="h-full w-full object-cover"></video>
            <div v-if="!camOn" class="absolute inset-0 flex flex-col items-center justify-center text-white/70">
              <VideoOff class="mb-2 h-10 w-10" />
              <span class="text-sm">{{ $t('liveLesson.cameraOff') }}</span>
            </div>
            <span
              v-if="phase === 'live'"
              class="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-white"
            >
              <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white"></span> {{ $t('liveLesson.live') }}
            </span>
            <span v-if="camError" class="absolute bottom-3 left-3 right-3 rounded-lg bg-black/60 px-3 py-1.5 text-center text-xs text-white">
              {{ camError }}
            </span>
          </div>
          <!-- Controls -->
          <div class="flex items-center justify-center gap-3 p-4">
            <button
              class="flex h-11 w-11 items-center justify-center rounded-full transition-colors"
              :class="camOn ? 'bg-secondary text-foreground hover:bg-secondary/70' : 'bg-destructive/15 text-destructive'"
              :title="$t('liveLesson.toggleCamera')"
              @click="toggleCam"
            >
              <Video v-if="camOn" class="h-5 w-5" />
              <VideoOff v-else class="h-5 w-5" />
            </button>
            <button
              class="flex h-11 w-11 items-center justify-center rounded-full transition-colors"
              :class="micOn ? 'bg-secondary text-foreground hover:bg-secondary/70' : 'bg-destructive/15 text-destructive'"
              :title="$t('liveLesson.toggleMic')"
              @click="toggleMic"
            >
              <Mic v-if="micOn" class="h-5 w-5" />
              <MicOff v-else class="h-5 w-5" />
            </button>

            <button
              v-if="phase === 'lobby'"
              class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-full px-6 py-2.5 font-semibold transition-colors disabled:opacity-50"
              :disabled="participants.length === 0"
              @click="start"
            >
              <Play class="h-5 w-5" /> {{ $t('liveLesson.startLesson', { n: participants.length }) }}
            </button>
            <button
              class="bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center gap-2 rounded-full px-6 py-2.5 font-semibold transition-colors"
              @click="phase === 'lobby' ? quit() : end()"
            >
              {{ phase === 'lobby' ? $t('liveLesson.cancel') : $t('liveLesson.endLesson') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Right: PIN + participant roster -->
      <div class="space-y-4 lg:col-span-2">
        <div class="bg-card border-border rounded-2xl border p-6 text-center">
          <p class="text-muted-foreground mb-2 text-sm font-medium">{{ $t('liveLesson.sharePin') }}</p>
          <div class="bg-primary/5 border-primary/20 mx-auto mb-2 rounded-2xl border px-6 py-4">
            <p class="text-primary font-mono text-4xl font-black tracking-[0.3em]">{{ pin }}</p>
          </div>
          <p class="text-muted-foreground text-xs">{{ $t('liveLesson.sharePinHint') }}</p>
        </div>

        <div class="bg-card border-border rounded-2xl border">
          <div class="border-border flex items-center justify-between border-b px-5 py-3.5">
            <h3 class="text-foreground text-sm font-semibold">{{ $t('liveLesson.waitingRoom') }}</h3>
            <span class="text-chart-2 inline-flex items-center gap-1.5 text-xs">
              <span class="bg-chart-2 h-1.5 w-1.5 animate-pulse rounded-full"></span> {{ participantCount }}
            </span>
          </div>
          <div v-if="participants.length" class="max-h-72 space-y-2 overflow-y-auto p-4">
            <div v-for="(p, i) in participants" :key="p.name + i" class="bg-secondary/50 flex items-center gap-2 rounded-xl p-2.5">
              <div class="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
                {{ p.name.charAt(0).toUpperCase() }}
              </div>
              <span class="text-foreground truncate text-sm font-medium">{{ p.name }}</span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-10 text-center">
            <Users class="text-primary mb-2 h-8 w-8" />
            <p class="text-foreground text-sm font-medium">{{ $t('liveLesson.waitingForStudents') }}</p>
            <p class="text-muted-foreground text-xs">{{ $t('liveLesson.sharePinToJoin') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- PHASE: ENDED -->
    <div v-else-if="phase === 'ended'" class="mx-auto max-w-lg text-center">
      <div class="mb-6 flex justify-center">
        <div class="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
          <CircleCheck class="text-primary h-10 w-10" />
        </div>
      </div>
      <h2 class="text-foreground mb-2 text-3xl font-bold">{{ $t('liveLesson.lessonEnded') }}</h2>
      <p class="text-muted-foreground mb-8">{{ $t('liveLesson.lessonEndedDesc') }}</p>
      <button class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-8 py-3 font-semibold transition-colors" @click="quit">
        {{ $t('liveLesson.newLesson') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { io, type Socket } from 'socket.io-client'
import { Radio, Play, Users, CircleCheck, Video, VideoOff, Mic, MicOff } from '@/components/icons'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth.store'

type Phase = 'setup' | 'lobby' | 'live' | 'ended'
interface Participant { name: string }

import { API_ORIGIN as SOCKET_URL } from '@/lib/apiBase'
const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

const { t } = useI18n()
const authStore = useAuthStore()

const phase = ref<Phase>('setup')
const lessonTitle = ref('')
const creating = ref(false)
const setupError = ref('')

const pin = ref('')
const participants = ref<Participant[]>([])
const participantCount = ref(0)

const localVideo = ref<HTMLVideoElement | null>(null)
const camOn = ref(true)
const micOn = ref(true)
const camError = ref('')

let socket: Socket | null = null
let localStream: MediaStream | null = null
// One peer connection per student, keyed by their socket id.
const peers = new Map<string, RTCPeerConnection>()

// ── Camera ─────────────────────────────────────────────────────────────────
const startCamera = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    await nextTick()
    if (localVideo.value) localVideo.value.srcObject = localStream
    camOn.value = true
    micOn.value = true
  } catch {
    camError.value = t('liveLesson.cameraDenied')
    camOn.value = false
    micOn.value = false
  }
}

const toggleCam = () => {
  const track = localStream?.getVideoTracks()[0]
  if (!track) return
  track.enabled = !track.enabled
  camOn.value = track.enabled
}
const toggleMic = () => {
  const track = localStream?.getAudioTracks()[0]
  if (!track) return
  track.enabled = !track.enabled
  micOn.value = track.enabled
}

// ── WebRTC (host broadcasts its camera to each student) ──────────────────────
const createPeerAndOffer = async (peerId: string) => {
  if (peers.has(peerId)) return
  const pc = new RTCPeerConnection(ICE)
  peers.set(peerId, pc)
  localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream!))
  pc.onicecandidate = (e) => {
    if (e.candidate) socket?.emit('rtc:signal', { to: peerId, data: { candidate: e.candidate } })
  }
  try {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket?.emit('rtc:signal', { to: peerId, data: { sdp: pc.localDescription } })
  } catch { /* ignore a transient negotiation error */ }
}

const closePeer = (peerId: string) => {
  peers.get(peerId)?.close()
  peers.delete(peerId)
}

// ── Session ──────────────────────────────────────────────────────────────────
const createAndHost = async () => {
  setupError.value = ''
  if (!lessonTitle.value.trim()) { setupError.value = t('liveLesson.errTitle'); return }
  creating.value = true
  try {
    const session = (await api.createLiveSession({ title: lessonTitle.value.trim(), steps: [] })) as { id: number; pin: string }
    connect(session.pin)
  } catch {
    setupError.value = t('liveLesson.errCreate')
    creating.value = false
  }
}

const connect = (sessionPin: string) => {
  const token = authStore.getAccessToken()
  socket = io(`${SOCKET_URL}/live-quiz`, { auth: { token }, transports: ['websocket', 'polling'] })

  socket.on('connect', () => socket?.emit('lm:host', { pin: sessionPin }))

  socket.on('lm:host_ready', async (d: { pin: string; participants: Participant[] }) => {
    creating.value = false
    pin.value = d.pin
    participants.value = d.participants
    participantCount.value = d.participants.length
    phase.value = 'lobby'
    await startCamera()
  })

  socket.on('lm:participants', (d: { participants: Participant[]; count: number }) => {
    participants.value = d.participants
    participantCount.value = d.count
  })

  socket.on('lm:live', () => { phase.value = 'live' })

  // WebRTC signalling
  socket.on('rtc:peers', (d: { peers: { id: string }[] }) => {
    d.peers.forEach((p) => createPeerAndOffer(p.id))
  })
  socket.on('rtc:peer', (d: { id: string }) => { createPeerAndOffer(d.id) })
  socket.on('rtc:peer_left', (d: { id: string }) => { closePeer(d.id) })
  socket.on('rtc:signal', async (d: { from: string; data: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
    const pc = peers.get(d.from)
    if (!pc) return
    try {
      if (d.data.sdp) await pc.setRemoteDescription(d.data.sdp)          // student's answer
      else if (d.data.candidate) await pc.addIceCandidate(d.data.candidate)
    } catch { /* ignore */ }
  })

  socket.on('lm:ended', () => { phase.value = 'ended' })

  socket.on('lm:error', (d: { message: string }) => {
    creating.value = false
    setupError.value = d.message || t('liveLesson.errGeneric')
  })

  socket.on('connect_error', () => {
    creating.value = false
    setupError.value = t('liveLesson.errServer')
  })
}

const start = () => socket?.emit('lm:start')
const end = () => socket?.emit('lm:end')

const teardown = () => {
  peers.forEach((pc) => pc.close())
  peers.clear()
  localStream?.getTracks().forEach((tr) => tr.stop())
  localStream = null
  if (socket) { socket.disconnect(); socket = null }
}

const quit = () => {
  teardown()
  phase.value = 'setup'
  lessonTitle.value = ''
  pin.value = ''
  participants.value = []
  participantCount.value = 0
  creating.value = false
  setupError.value = ''
  camError.value = ''
  camOn.value = true
  micOn.value = true
}

onUnmounted(teardown)
</script>
