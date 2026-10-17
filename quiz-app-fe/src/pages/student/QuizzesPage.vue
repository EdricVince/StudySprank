<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-foreground text-3xl font-bold tracking-tight lg:text-4xl">{{ $t('quizzesPage.title') }}</h1>
          <p class="text-muted-foreground mt-2 text-lg">{{ $t('quizzesPage.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="bg-card border-border flex items-center gap-2 rounded-xl border px-4 py-2">
            <Flame class="text-primary h-5 w-5" />
            <span class="text-foreground font-semibold">{{ $t('quizzesPage.dayStreak', { n: progressStore.streakCount }) }}</span>
          </div>
          <div class="bg-card border-border flex items-center gap-2 rounded-xl border px-4 py-2">
            <Zap class="text-primary h-5 w-5" />
            <span class="text-foreground font-semibold">{{ progressStore.xp }} XP</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="animate-fade-in-up delay-100 mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      <div class="bg-card border-border rounded-2xl border p-5 transition-all hover:shadow-lg">
        <div class="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <Trophy class="text-primary h-6 w-6" />
        </div>
        <span class="text-foreground text-2xl font-bold">{{ progressStore.totalQuizzesCompleted }}</span>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('quizzesPage.stats.gamesPlayed') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 transition-all hover:shadow-lg">
        <div class="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <Target class="text-primary h-6 w-6" />
        </div>
        <span class="text-foreground text-2xl font-bold">{{ overallAccuracy }}%</span>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('quizzesPage.stats.accuracy') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 transition-all hover:shadow-lg">
        <div class="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <BookOpen class="text-primary h-6 w-6" />
        </div>
        <span class="text-foreground text-2xl font-bold">{{ progressStore.totalCardsStudied }}</span>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('quizzesPage.stats.wordsStudied') }}</p>
      </div>
      <div class="bg-card border-border rounded-2xl border p-5 transition-all hover:shadow-lg">
        <div class="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
          <Flame class="text-primary h-6 w-6" />
        </div>
        <span class="text-foreground text-2xl font-bold">{{ progressStore.longestStreak }}</span>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('quizzesPage.stats.bestStreak') }}</p>
      </div>
    </div>

    <!-- Section 1: Assigned by Teacher -->
    <div class="animate-fade-in-up delay-150 mb-8">
      <h2 class="text-foreground mb-5 flex items-center gap-2 text-xl font-semibold">
        <BookOpen class="text-primary h-6 w-6" />
        {{ $t('quizzesPage.assignmentsFromTeacher') }}
      </h2>
      <!-- Assigned tests + document handouts -->
      <div v-if="assignments.length || docAssignments.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Graded tests -->
        <button
          v-for="t in assignments"
          :key="`test-${t.id}`"
          class="bg-card border-border hover:border-primary/40 group rounded-2xl border p-5 text-left transition-all hover:shadow-md"
          @click="openTest(t.id)"
        >
          <div class="mb-3 flex items-start justify-between gap-2">
            <div class="bg-primary/10 flex h-11 w-11 items-center justify-center rounded-xl">
              <FileText class="text-primary h-5 w-5" />
            </div>
            <span
              v-if="t.my_score != null"
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="(t.my_total && t.my_score / t.my_total >= 0.5) ? 'bg-chart-2/10 text-chart-2' : 'bg-secondary text-muted-foreground'"
            >{{ t.my_score }}/{{ t.my_total }}</span>
          </div>
          <h3 class="text-foreground font-semibold">{{ t.title }}</h3>
          <p v-if="t.description" class="text-muted-foreground mt-0.5 line-clamp-2 text-sm">{{ t.description }}</p>
          <div class="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
            <span>{{ t.question_count ?? 0 }} {{ $t('quizzesPage.questions') }}</span>
            <span v-if="t.time_limit">· {{ t.time_limit }} min</span>
          </div>
          <span class="text-primary mt-3 inline-block text-sm font-medium group-hover:underline">
            {{ t.my_score != null ? $t('quizzesPage.retake') : $t('quizzesPage.startTest') }} →
          </span>
        </button>

        <!-- Document handouts -->
        <button
          v-for="d in docAssignments"
          :key="`doc-${d.id}`"
          class="bg-card border-border hover:border-chart-2/40 group rounded-2xl border p-5 text-left transition-all hover:shadow-md"
          @click="openDoc(d)"
        >
          <div class="mb-3 flex items-start justify-between gap-2">
            <div class="bg-chart-2/10 flex h-11 w-11 items-center justify-center rounded-xl">
              <BookOpen class="text-chart-2 h-5 w-5" />
            </div>
            <span class="bg-chart-2/10 text-chart-2 rounded-full px-2 py-0.5 text-xs font-semibold">{{ $t('quizzesPage.document') }}</span>
          </div>
          <h3 class="text-foreground font-semibold">{{ d.title }}</h3>
          <p v-if="d.description" class="text-muted-foreground mt-0.5 line-clamp-2 text-sm">{{ d.description }}</p>
          <img v-if="d.attachment" :src="d.attachment" class="mt-3 max-h-28 w-full rounded-lg object-cover" :alt="d.attachment_name || d.title" />
          <span class="text-chart-2 mt-3 inline-block text-sm font-medium group-hover:underline">
            {{ $t('quizzesPage.viewDocument') }} →
          </span>
        </button>
      </div>

      <!-- Empty -->
      <div v-else class="bg-card border-border flex flex-col items-center justify-center rounded-2xl border p-10 text-center">
        <div class="bg-secondary mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <BookOpen class="text-muted-foreground h-8 w-8" />
        </div>
        <h3 class="text-foreground mb-2 text-lg font-semibold">{{ $t('quizzesPage.noAssignmentsYet') }}</h3>
        <p class="text-muted-foreground max-w-md text-sm">
          {{ $t('quizzesPage.noAssignmentsDesc') }}
        </p>
      </div>
    </div>

    <!-- Document viewer modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="viewingDoc"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          @click.self="viewingDoc = null"
        >
          <div class="bg-card border-border max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border shadow-2xl">
            <div class="border-border bg-card sticky top-0 flex items-center justify-between border-b p-5">
              <div class="flex items-center gap-3">
                <div class="bg-chart-2/10 flex h-10 w-10 items-center justify-center rounded-xl">
                  <BookOpen class="text-chart-2 h-5 w-5" />
                </div>
                <h3 class="text-foreground text-lg font-semibold">{{ viewingDoc.title }}</h3>
              </div>
              <button class="text-muted-foreground hover:text-foreground" @click="viewingDoc = null">
                <X class="h-5 w-5" />
              </button>
            </div>
            <div class="space-y-4 p-5">
              <p v-if="viewingDoc.description" class="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{{ viewingDoc.description }}</p>
              <img v-if="viewingDoc.attachment" :src="viewingDoc.attachment" class="w-full rounded-xl" :alt="viewingDoc.attachment_name || viewingDoc.title" />
              <p v-if="!viewingDoc.description && !viewingDoc.attachment" class="text-muted-foreground text-sm">{{ $t('quizzesPage.emptyDocument') }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Battle Mode Banner -->
    <div class="animate-fade-in-up delay-175 mb-8">
      <div
        class="relative cursor-pointer overflow-hidden rounded-2xl bg-linear-to-r from-chart-1 to-chart-5 p-6"
        @click="router.push('/quizzes/battle')"
      >
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Swords class="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">{{ $t('quizzesPage.battleMode') }}</h3>
              <p class="text-sm text-white/80">{{ $t('quizzesPage.battleModeDesc') }}</p>
            </div>
          </div>
          <div class="hidden items-center gap-3 sm:flex">
            <div class="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5">
              <Zap class="h-4 w-4 text-primary-foreground" />
              <span class="text-sm font-semibold text-white">{{ $t('quizzesPage.speedBonus') }}</span>
            </div>
            <div class="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5">
              <Trophy class="h-4 w-4 text-primary-foreground" />
              <span class="text-sm font-semibold text-white">{{ $t('quizzesPage.winXP') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Practice Games -->
    <div class="animate-fade-in-up delay-200 mb-8">
      <h2 class="text-foreground mb-2 flex items-center gap-2 text-xl font-semibold">
        <Gamepad2 class="text-primary h-6 w-6" />
        {{ $t('quizzesPage.practiceGames') }}
      </h2>
      <p class="text-muted-foreground mb-5 text-sm">
        {{ $t('quizzesPage.practiceGamesDesc') }}
      </p>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <QuizModeCard
          v-for="(mode, index) in quizModes"
          :key="mode.id"
          :mode="mode"
          :index="index"
          @click="openDifficultyModal(mode.id)"
        />
      </div>
    </div>

    <!-- Recent Activity & Leaderboard -->
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <!-- Recent Games -->
      <div class="animate-fade-in-up delay-300">
        <div class="bg-card border-border rounded-2xl border p-6">
          <h3 class="text-foreground mb-4 flex items-center gap-2 font-semibold">
            <History class="text-primary h-5 w-5" />
            {{ $t('quizzesPage.recentGames') }}
          </h3>
          <div class="space-y-3">
            <div
              v-for="game in quizStore.recentGames"
              :key="game.id"
              class="bg-secondary/50 flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-secondary"
            >
              <div class="bg-primary/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <component :is="getModeIcon(game.modeId)" class="text-primary h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="text-foreground font-medium">{{ game.modeName }}</h4>
                <p class="text-muted-foreground text-sm">{{ formatRelativeDate(game.date) }}</p>
              </div>
              <div class="text-right">
                <p class="text-foreground font-semibold">{{ game.score }} {{ $t('quizzesPage.pts') }}</p>
                <p class="text-muted-foreground text-sm">{{ game.accuracy }}% {{ $t('quizzesPage.acc') }}</p>
              </div>
            </div>
            <div v-if="quizStore.recentGames.length === 0" class="text-muted-foreground py-8 text-center">
              <History class="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p class="text-sm">{{ $t('quizzesPage.noGamesYet') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Leaderboard -->
      <div class="animate-fade-in-up delay-400">
        <div class="bg-card border-border rounded-2xl border p-6">
          <h3 class="text-foreground mb-4 flex items-center gap-2 font-semibold">
            <Medal class="text-primary h-5 w-5" />
            {{ $t('quizzesPage.leaderboard') }}
          </h3>
          <div class="space-y-3">
            <div
              v-for="entry in progressStore.leaderboard.slice(0, 8)"
              :key="entry.user_id"
              class="flex items-center gap-3 rounded-xl p-3 transition-colors"
              :class="[
                entry.rank <= 3 ? 'bg-primary/5' : 'bg-secondary/50',
                isCurrentUser(entry.user_id) ? 'ring-primary/40 ring-2' : '',
              ]"
            >
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                :class="getRankClass(entry.rank)"
              >
                {{ entry.rank }}
              </div>
              <div class="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {{ (entry.display_name || entry.email).charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="text-foreground truncate font-medium">
                  {{ entry.display_name || entry.email }}
                  <span v-if="isCurrentUser(entry.user_id)" class="text-primary text-xs font-normal"> {{ $t('quizzesPage.you') }}</span>
                </h4>
                <p class="text-muted-foreground text-xs">{{ $t('quizzesPage.lvPrefix') }}{{ entry.level }} · {{ entry.streak_count }}🔥</p>
              </div>
              <div class="text-right">
                <p class="text-foreground font-bold">{{ entry.xp.toLocaleString() }}</p>
                <p class="text-muted-foreground text-xs">XP</p>
              </div>
            </div>
            <div v-if="progressStore.leaderboard.length === 0" class="text-muted-foreground py-8 text-center">
              <Medal class="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p class="text-sm">{{ $t('quizzesPage.leaderboardEmpty') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Difficulty Selector Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDifficultyModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          @click.self="showDifficultyModal = false"
        >
          <div class="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-2xl">
            <div class="mb-5 flex items-center justify-between">
              <h3 class="text-foreground text-lg font-semibold">{{ $t('quizzesPage.chooseDifficulty') }}</h3>
              <button class="text-muted-foreground hover:text-foreground" @click="showDifficultyModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Idiom Master: chọn difficulty để lọc idiom pool -->
            <div v-if="selectedModeId === 'idiom-quiz'" class="space-y-3">
              <button
                v-for="diff in idiomDifficulties"
                :key="diff.value"
                class="border-border hover:border-primary/50 hover:bg-primary/5 flex w-full items-center gap-3 rounded-xl border p-4 transition-all"
                @click="startIdiomQuiz(diff.value)"
              >
                <span class="text-xl">{{ diff.emoji }}</span>
                <div class="flex-1 text-left">
                  <p class="text-foreground font-medium">{{ diff.label }}</p>
                  <p class="text-muted-foreground text-xs">{{ diff.desc }}</p>
                </div>
                <span class="text-primary font-semibold">{{ $t('quizzesPage.idioms', { count: diff.count }) }}</span>
              </button>
            </div>

            <!-- Typing Challenge: chọn difficulty không giới hạn word -->
            <div v-else-if="selectedModeId === 'typing-challenge'" class="space-y-3">
              <button
                v-for="diff in typingDifficulties"
                :key="diff.value"
                class="border-border hover:border-primary/50 hover:bg-primary/5 flex w-full items-center gap-3 rounded-xl border p-4 transition-all"
                @click="startTypingChallenge(diff.value)"
              >
                <span class="text-xl">{{ diff.emoji }}</span>
                <div class="text-left">
                  <p class="text-foreground font-medium">{{ diff.label }}</p>
                  <p class="text-muted-foreground text-xs">{{ diff.desc }}</p>
                </div>
              </button>
            </div>

            <!-- Các mode khác: giữ nguyên 15 words + Custom -->
            <div v-else class="space-y-3">
              <button
                v-for="diff in difficulties"
                :key="diff.count"
                class="border-border hover:border-primary/50 hover:bg-primary/5 flex w-full items-center justify-between rounded-xl border p-4 transition-all"
                @click="startWithDifficulty(diff.count)"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">{{ diff.emoji }}</span>
                  <div class="text-left">
                    <p class="text-foreground font-medium">{{ diff.label }}</p>
                    <p class="text-muted-foreground text-xs">{{ diff.desc }}</p>
                  </div>
                </div>
                <span class="text-primary font-semibold">{{ $t('quizzesPage.words', { count: diff.count }) }}</span>
              </button>

              <!-- Custom count -->
              <div class="border-border rounded-xl border p-4">
                <p class="text-foreground mb-2 text-sm font-medium">{{ $t('quizzesPage.custom') }}</p>
                <div class="flex gap-2">
                  <input
                    v-model.number="customCount"
                    type="number"
                    min="3"
                    max="50"
                    placeholder="5–50"
                    class="bg-secondary text-foreground border-border focus:border-primary w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  />
                  <button
                    class="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
                    :disabled="!customCount || customCount < 3 || customCount > 50"
                    @click="startWithDifficulty(customCount ?? 10)"
                  >
                    {{ $t('quizzesPage.go') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Flame,
  Zap,
  Trophy,
  Target,
  Gamepad2,
  History,
  Medal,
  CircleHelp,
  Shuffle,
  Link,
  Timer,
  CircleCheck,
  BookOpen,
  Swords,
  X,
  Keyboard,
  MessageSquare,
  FileText,
} from '@/components/icons'
import QuizModeCard from '@/components/quiz/QuizModeCard.vue'
import type { QuizMode } from '@/types/quiz'
import { useProgressStore } from '@/stores/progress.store'
import { useQuizStore } from '@/stores/quiz.store'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/utils/api'
import type { TestData, AssignmentData } from '@/types/content'

const router = useRouter()
const progressStore = useProgressStore()
const quizStore = useQuizStore()
const authStore = useAuthStore()

// Content published by the student's teachers, shown as "Assignments from Teacher":
// graded tests (taken & auto-scored) and document handouts (read-only prompts).
const assignments = ref<TestData[]>([])
const docAssignments = ref<AssignmentData[]>([])
const viewingDoc = ref<AssignmentData | null>(null)
onMounted(async () => {
  try { assignments.value = await api.getTests() } catch { /* non-critical */ }
  try { docAssignments.value = await api.getAssignments() } catch { /* non-critical */ }
})
const openTest = (id: number) => router.push(`/quizzes/test/${id}`)
const openDoc = (d: AssignmentData) => { viewingDoc.value = d }

const overallAccuracy = computed(() => {
  const games = quizStore.recentGames
  if (games.length === 0) return 0
  const sum = games.reduce((acc, g) => acc + g.accuracy, 0)
  return Math.round(sum / games.length)
})

const isCurrentUser = (userId: number) =>
  authStore.currentUser != null && (authStore.currentUser as { id?: number }).id === userId

// Mode icon map
const modeIcons: Record<string, Component> = {
  'multiple-choice': CircleHelp,
  'word-scramble': Shuffle,
  'matching-pairs': Link,
  'speed-round': Timer,
  'true-false': CircleCheck,
}

function getModeIcon(modeId: string): Component {
  return modeIcons[modeId] ?? CircleHelp
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

const getRankClass = (rank: number): string => {
  if (rank === 1) return 'bg-yellow-400/20 text-yellow-500'
  if (rank === 2) return 'bg-slate-300/20 text-slate-400'
  if (rank === 3) return 'bg-orange-400/20 text-orange-500'
  return 'bg-muted text-muted-foreground'
}

const { t } = useI18n()

// Quiz modes — title/description are replaced by the translations below.
const BASE_MODES: QuizMode[] = [
  {
    id: 'multiple-choice',
    title: 'Multiple Choice',
    description: 'Classic quiz with 4 options. Test your vocabulary knowledge.',
    icon: CircleHelp,
    difficulty: 'easy',
    estimatedTime: '5 min',
    questionsCount: 10,
    color: 'primary',
  },
  {
    id: 'word-scramble',
    title: 'Word Scramble',
    description: 'Unscramble the letters to form the correct word.',
    icon: Shuffle,
    difficulty: 'medium',
    estimatedTime: '7 min',
    questionsCount: 10,
    color: 'primary',
  },
  {
    id: 'matching-pairs',
    title: 'Matching Pairs',
    description: 'Match words with their meanings. Train your memory.',
    icon: Link,
    difficulty: 'medium',
    estimatedTime: '5 min',
    questionsCount: 8,
    color: 'primary',
  },
  {
    id: 'speed-round',
    title: 'Speed Round',
    description: 'Answer as fast as you can! Higher speed = higher score.',
    icon: Timer,
    difficulty: 'hard',
    estimatedTime: '3 min',
    questionsCount: 15,
    color: 'primary',
  },
  {
    id: 'true-false',
    title: 'True or False',
    description: 'Quick decisions! Is the statement correct or not?',
    icon: CircleCheck,
    difficulty: 'easy',
    estimatedTime: '4 min',
    questionsCount: 12,
    color: 'primary',
  },
  {
    id: 'typing-challenge',
    title: 'Typing Challenge',
    description: 'Type English words as fast as you can! Beat your WPM record.',
    icon: Keyboard,
    difficulty: 'medium',
    estimatedTime: '60s',
    questionsCount: 0,
    color: 'primary',
  },
  {
    id: 'idiom-quiz',
    title: 'Idiom Master',
    description: 'Learn 45+ English idioms with meanings & real-world usage examples.',
    icon: MessageSquare,
    difficulty: 'medium',
    estimatedTime: '8 min',
    questionsCount: 10,
    color: 'primary',
  },
]
const MODE_KEYS: Record<string, string> = {
  'multiple-choice': 'multipleChoice', 'word-scramble': 'wordScramble', 'matching-pairs': 'matchingPairs',
  'speed-round': 'speedRound', 'true-false': 'trueFalse', 'typing-challenge': 'typingChallenge', 'idiom-quiz': 'idiomMaster',
}
const quizModes = computed(() => BASE_MODES.map((m) => ({
  ...m,
  title: t(`quizzesPage.modes.${MODE_KEYS[m.id]}`),
  description: t(`quizzesPage.modes.${MODE_KEYS[m.id]}Desc`),
})))

// Difficulty modal
const showDifficultyModal = ref(false)
const selectedModeId = ref('')
const customCount = ref<number | null>(null)

const difficulties = [
  { label: 'Easy', emoji: '🟢', desc: 'Perfect for warming up', count: 15 },
  { label: 'Medium', emoji: '🟡', desc: 'Standard practice session', count: 15 },
  { label: 'Hard', emoji: '🟠', desc: 'Challenge yourself', count: 15 },
  { label: 'Expert', emoji: '🔴', desc: 'Full vocabulary workout', count: 15 },
]

const typingDifficulties = [
  { label: 'Easy',   emoji: '🌱', desc: 'Short common words',   value: 'easy'   },
  { label: 'Medium', emoji: '⚡', desc: 'Standard vocabulary',  value: 'medium' },
  { label: 'Hard',   emoji: '🔥', desc: 'Challenging words',    value: 'hard'   },
  { label: 'Expert', emoji: '💀', desc: 'Advanced vocabulary',  value: 'expert' },
]

const idiomDifficulties = [
  { label: 'Easy',   emoji: '🟢', desc: 'Common everyday idioms (12 idioms)',  value: 'easy',   count: 10 },
  { label: 'Medium', emoji: '🟡', desc: 'Intermediate idioms (18 idioms)',     value: 'medium', count: 10 },
  { label: 'Hard',   emoji: '🟠', desc: 'Advanced idioms (15 idioms)',         value: 'hard',   count: 10 },
  { label: 'All',    emoji: '🎯', desc: 'Mixed difficulty — all 45 idioms',    value: '',       count: 15 },
]

function startIdiomQuiz(difficulty: string) {
  showDifficultyModal.value = false
  const params = difficulty ? `difficulty=${difficulty}&count=10` : 'count=15'
  router.push(`/quizzes/idiom-quiz?${params}`)
}

function openDifficultyModal(modeId: string) {
  selectedModeId.value = modeId
  customCount.value = null
  showDifficultyModal.value = true
}

function startWithDifficulty(count: number) {
  showDifficultyModal.value = false
  router.push(`/quizzes/${selectedModeId.value}?mode=practice&count=${count}`)
}

function startTypingChallenge(difficulty: string) {
  showDifficultyModal.value = false
  router.push(`/quizzes/typing-challenge?difficulty=${difficulty}`)
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
