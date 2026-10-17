<template>
  <div class="bg-card border-border rounded-xl border p-5 lg:p-6">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
          <Flame class="text-primary h-4 w-4" />
        </div>
        <h3 class="text-foreground font-semibold">{{ $t('dashboard.challenges.title') }}</h3>
      </div>
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock class="h-3.5 w-3.5" />
        <span>{{ timeRemaining }}</span>
      </div>
    </div>

    <!-- Challenges List -->
    <div class="space-y-2">
      <div
        v-for="challenge in challenges"
        :key="challenge.id"
        class="group relative cursor-pointer overflow-hidden rounded-lg border p-3.5 transition-all duration-200"
        :class="challenge.completed
          ? 'border-primary/20 bg-primary/5'
          : 'border-border bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30'"
        @click="openDetail(challenge)"
      >
        <div class="flex items-center gap-3">
          <!-- Icon -->
          <div class="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <component :is="challenge.icon" class="h-4 w-4" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-foreground text-sm font-medium">{{ challenge.title }}</h4>
              <span
                v-if="challenge.claimed"
                class="text-primary text-xs font-medium"
              >
                ✓ {{ $t('dashboard.challenges.claimed') }}
              </span>
              <span v-else-if="challenge.completed" class="text-primary text-xs font-medium">✓</span>
            </div>
            <p class="text-muted-foreground text-xs">{{ challenge.description }}</p>

            <!-- Progress Bar (if not completed) -->
            <div v-if="!challenge.completed" class="mt-2">
              <div class="bg-secondary/50 h-1.5 overflow-hidden rounded-full">
                <div
                  class="bg-primary h-full rounded-full transition-all duration-500"
                  :style="{ width: `${(challenge.current / challenge.target) * 100}%` }"
                />
              </div>
              <p class="text-muted-foreground mt-1 text-xs">
                {{ challenge.current }} / {{ challenge.target }}
              </p>
            </div>
          </div>

          <!-- Reward -->
          <div class="flex shrink-0 items-center gap-1 text-primary text-sm font-semibold">
            <Zap class="h-3.5 w-3.5" />
            {{ challenge.xp }}
          </div>
        </div>
      </div>
    </div>

    <!-- Completion Message -->
    <div
      v-if="allCompleted"
      class="mt-4 rounded-lg bg-primary/5 px-4 py-3 text-center"
    >
      <p class="text-foreground text-sm font-medium">
        {{ $t('dashboard.challenges.allComplete') }} <span class="text-primary">{{ $t('dashboard.challenges.bonusXP') }}</span>
      </p>
    </div>
    <div v-else class="mt-4 rounded-lg bg-secondary/20 px-4 py-2.5 text-center">
      <p class="text-muted-foreground text-xs">
        {{ $t('dashboard.challenges.remaining', { count: challenges.filter(c => !c.completed).length }, challenges.filter(c => !c.completed).length) }}
      </p>
    </div>
  </div>

  <!-- Detail Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="selectedChallenge"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="selectedId = null"
      >
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="selectedId = null" />
        <div class="bg-card border-border relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-xl">
          <!-- Header -->
          <div class="mb-5 flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                <component :is="selectedChallenge.icon" class="text-primary h-6 w-6" />
              </div>
              <div>
                <h3 class="text-foreground font-semibold">{{ selectedChallenge.title }}</h3>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="selectedChallenge.completed ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'"
                >
                  {{ selectedChallenge.completed ? $t('dashboard.challenges.completed') : $t('dashboard.challenges.inProgress') }}
                </span>
              </div>
            </div>
            <button class="text-muted-foreground hover:text-foreground" @click="selectedId = null">
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Description -->
          <p class="text-muted-foreground mb-5 text-sm">{{ selectedChallenge.description }}</p>

          <!-- Progress -->
          <div class="mb-5">
            <div class="mb-2 flex items-center justify-between text-sm">
              <span class="text-foreground font-medium">{{ $t('dashboard.challenges.progress') }}</span>
              <span class="text-muted-foreground">{{ selectedChallenge.current }} / {{ selectedChallenge.target }}</span>
            </div>
            <div class="bg-secondary h-3 overflow-hidden rounded-full">
              <div
                class="bg-primary h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min((selectedChallenge.current / selectedChallenge.target) * 100, 100)}%` }"
              ></div>
            </div>
          </div>

          <!-- Reward -->
          <div class="border-border bg-secondary/30 mb-5 flex items-center justify-between rounded-xl border px-4 py-3">
            <span class="text-muted-foreground text-sm">{{ $t('dashboard.challenges.xpReward') }}</span>
            <div class="text-primary flex items-center gap-1 font-bold">
              <Zap class="h-4 w-4" />
              {{ selectedChallenge.xp }} XP
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
              @click="selectedId = null"
            >
              {{ $t('common.close') }}
            </button>
            <button
              v-if="!selectedChallenge.completed"
              class="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors"
              @click="goToChallenge(selectedChallenge)"
            >
              <ArrowRight class="h-4 w-4" />
              {{ $t('dashboard.challenges.start') }}
            </button>
            <button
              v-else-if="!selectedChallenge.claimed"
              data-test="claim-challenge"
              class="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
              :disabled="claiming"
              @click="claim(selectedChallenge)"
            >
              <Zap class="h-4 w-4" />
              {{ $t('dashboard.challenges.claim') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Flame, Clock, Zap, BookOpen, Brain, Layers, Target, X, ArrowRight } from '@/components/icons'
import { useProgressStore } from '@/stores/progress.store'
import { useToast } from '@/composables/useToast'
import { ApiError } from '@/utils/api'

const emit = defineEmits<{ claimReward: [challengeId: number, xpReward: number] }>()

const props = withDefaults(defineProps<{ dailyGoalXp?: number }>(), { dailyGoalXp: 50 })

interface Challenge {
  id: number
  title: string
  description: string
  icon: typeof BookOpen
  current: number
  target: number
  xp: number
  completed: boolean
  path: string
  claimed: boolean
}

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const progressStore = useProgressStore()
const selectedId = ref<number | null>(null)

// Derived live from the progress store's "today" counters, which are updated in
// real time by logFlashcardSession()/logQuizCompletion() — so the bars advance as
// the learner studies instead of sitting at 0.
const challenges = computed<Challenge[]>(() => {
  const cards = progressStore.todayCards
  const quizzes = progressStore.todayQuizzes
  const todayXp = progressStore.todayXP
  const goalXp = props.dailyGoalXp
  const claimed = progressStore.claimedChallenges
  return [
    {
      id: 1, title: t('dashboard.challenges.items.learn10'), description: t('dashboard.challenges.items.learn10Desc'),
      icon: BookOpen, current: Math.min(cards, 10), target: 10, xp: 25,
      completed: cards >= 10, path: '/flashcards', claimed: claimed.includes(1),
    },
    {
      id: 2, title: t('dashboard.challenges.items.quiz1'), description: t('dashboard.challenges.items.quiz1Desc'),
      icon: Brain, current: Math.min(quizzes, 1), target: 1, xp: 30,
      completed: quizzes >= 1, path: '/quizzes', claimed: claimed.includes(2),
    },
    {
      id: 3, title: t('dashboard.challenges.items.review20'), description: t('dashboard.challenges.items.review20Desc'),
      icon: Layers, current: Math.min(cards, 20), target: 20, xp: 20,
      completed: cards >= 20, path: '/flashcards', claimed: claimed.includes(3),
    },
    {
      id: 4, title: t('dashboard.challenges.items.goal'), description: t('dashboard.challenges.items.goalDesc', { xp: goalXp }),
      icon: Target, current: Math.min(todayXp, goalXp), target: goalXp, xp: 35,
      completed: todayXp >= goalXp, path: '/goals', claimed: claimed.includes(4),
    },
  ]
})

const allCompleted = computed(() => challenges.value.every(c => c.completed))

// Track by id so the modal stays live while the underlying challenge recomputes.
const selectedChallenge = computed(() => challenges.value.find(c => c.id === selectedId.value) ?? null)

const openDetail = (challenge: Challenge) => {
  selectedId.value = challenge.id
}

// The server re-checks completion and pays out (plus the all-challenges bonus).
const claiming = ref(false)
const claim = async (challenge: Challenge) => {
  claiming.value = true
  try {
    const res = await progressStore.claimChallenge(challenge.id)
    selectedId.value = null
    emit('claimReward', challenge.id, res.xp_gained + res.bonus)
    void progressStore.fetchProgress()
  } catch (e) {
    toast.error(e instanceof ApiError ? e.errorMessage : t('dashboard.challenges.claimFailed'))
  } finally {
    claiming.value = false
  }
}

const goToChallenge = (challenge: Challenge) => {
  selectedId.value = null
  router.push(challenge.path)
}

// Time remaining until reset
const timeRemaining = ref('')

const updateTimeRemaining = () => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const diff = tomorrow.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  timeRemaining.value = `${hours}h ${minutes}m left`
}

let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  updateTimeRemaining()
  interval = setInterval(updateTimeRemaining, 60000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
