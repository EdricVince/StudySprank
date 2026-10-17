import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/utils/api'

export interface WeeklyActivityItem {
  date: string
  day_label: string
  xp_earned: number
  cards_studied: number
  quizzes_completed: number
}

export interface LeaderboardItem {
  rank: number
  user_id: number
  email: string
  display_name: string
  xp: number
  level: number
  streak_count: number
}

export interface LogActivityResult {
  xp_gained: number
  level_up: boolean
  new_level: number
  new_xp: number
  streak_count: number
  streak_updated: boolean
  milestone_reached?: boolean
  streak_tier?: string
  /** Sent again within the server cooldown — nothing was recorded. */
  throttled?: boolean
  /** The daily XP cap reduced the reward. */
  capped?: boolean
}

export interface ClaimChallengeResult {
  xp_gained: number
  bonus: number
  new_xp: number
  new_level: number
  level_up: boolean
  claimed: number[]
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]
const STORAGE_KEY = 'studyspark-progress'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useProgressStore = defineStore('progress', () => {
  const cached = loadFromStorage()

  const xp = ref<number>(cached?.xp ?? 0)
  const level = ref<number>(cached?.level ?? 1)
  const streakCount = ref<number>(cached?.streakCount ?? 0)
  const longestStreak = ref<number>(cached?.longestStreak ?? 0)
  const totalCardsStudied = ref<number>(cached?.totalCardsStudied ?? 0)
  const totalQuizzesCompleted = ref<number>(cached?.totalQuizzesCompleted ?? 0)
  const xpForCurrentLevel = ref<number>(cached?.xpForCurrentLevel ?? 0)
  const xpToNextLevel = ref<number>(cached?.xpToNextLevel ?? 100)
  const xpProgressPercent = ref<number>(cached?.xpProgressPercent ?? 0)
  const todayCards = ref<number>(cached?.todayCards ?? 0)
  const todayQuizzes = ref<number>(cached?.todayQuizzes ?? 0)
  const todayXP = ref<number>(cached?.todayXP ?? 0)
  const claimedChallenges = ref<number[]>(cached?.claimedChallenges ?? [])
  const weeklyActivity = ref<WeeklyActivityItem[]>(cached?.weeklyActivity ?? [])
  const leaderboard = ref<LeaderboardItem[]>(cached?.leaderboard ?? [])
  const isLoading = ref(false)
  const milestoneReached = ref(false)

  const levelLabel = computed(() => `Level ${level.value}`)
  const nextLevelXP = computed(() => LEVEL_THRESHOLDS[Math.min(level.value, 9)])

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      xp: xp.value,
      level: level.value,
      streakCount: streakCount.value,
      longestStreak: longestStreak.value,
      totalCardsStudied: totalCardsStudied.value,
      totalQuizzesCompleted: totalQuizzesCompleted.value,
      xpForCurrentLevel: xpForCurrentLevel.value,
      xpToNextLevel: xpToNextLevel.value,
      xpProgressPercent: xpProgressPercent.value,
      todayCards: todayCards.value,
      todayQuizzes: todayQuizzes.value,
      todayXP: todayXP.value,
      claimedChallenges: claimedChallenges.value,
      weeklyActivity: weeklyActivity.value,
      leaderboard: leaderboard.value,
    }))
  }

  function applyStats(data: any) {
    xp.value = data.xp ?? 0
    level.value = data.level ?? 1
    streakCount.value = data.streak_count ?? 0
    longestStreak.value = data.longest_streak ?? 0
    totalCardsStudied.value = data.total_cards_studied ?? 0
    totalQuizzesCompleted.value = data.total_quizzes_completed ?? 0
    xpForCurrentLevel.value = data.xp_for_current_level ?? 0
    xpToNextLevel.value = data.xp_to_next_level ?? 100
    xpProgressPercent.value = data.xp_progress_percent ?? 0
    todayCards.value = data.today?.cards_studied ?? 0
    todayQuizzes.value = data.today?.quizzes_completed ?? 0
    todayXP.value = data.today?.xp_earned ?? 0
    claimedChallenges.value = data.today?.claimed_challenges ?? []
  }

  /** Apply the server's answer to an activity log; counters move only if it was recorded. */
  function applyActivity(result: LogActivityResult, cards: number, quizzes: number) {
    xp.value = result.new_xp
    level.value = result.new_level
    streakCount.value = result.streak_count
    if (!result.throttled) {
      totalCardsStudied.value += cards
      todayCards.value += cards
      totalQuizzesCompleted.value += quizzes
      todayQuizzes.value += quizzes
      todayXP.value += result.xp_gained
    }
    if (result.milestone_reached) {
      milestoneReached.value = true
      setTimeout(() => { milestoneReached.value = false }, 4000)
    }
    persist()
  }

  async function fetchProgress() {
    try {
      isLoading.value = true
      const data = await api.getMyProgress() as any
      applyStats(data)
      persist()
    } catch (e) {
      console.error('fetchProgress failed:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchWeekly() {
    try {
      const data = await api.getWeeklyActivity() as WeeklyActivityItem[]
      weeklyActivity.value = data
      persist()
    } catch (e) {
      console.error('fetchWeekly failed:', e)
    }
  }

  async function fetchLeaderboard() {
    try {
      const data = await api.getLeaderboard() as LeaderboardItem[]
      leaderboard.value = data
      persist()
    } catch (e) {
      console.error('fetchLeaderboard failed:', e)
    }
  }

  async function logFlashcardSession(cardsCount: number): Promise<LogActivityResult | null> {
    try {
      const result = await api.logActivity({ type: 'flashcard_session', cards_count: cardsCount }) as LogActivityResult
      applyActivity(result, cardsCount, 0)
      return result
    } catch {
      return null
    }
  }

  async function logQuizCompletion(score: number, _questionsCount?: number): Promise<LogActivityResult | null> {
    try {
      const result = await api.logActivity({ type: 'quiz_completion', score }) as LogActivityResult
      applyActivity(result, 0, 1)
      return result
    } catch {
      return null
    }
  }

  /** Ask the server to pay out a daily challenge; it verifies completion itself. */
  async function claimChallenge(id: number): Promise<ClaimChallengeResult> {
    const result = await api.claimChallenge(id) as ClaimChallengeResult
    xp.value = result.new_xp
    level.value = result.new_level
    claimedChallenges.value = result.claimed
    persist()
    return result
  }

  function $reset() {
    xp.value = 0
    level.value = 1
    streakCount.value = 0
    longestStreak.value = 0
    totalCardsStudied.value = 0
    totalQuizzesCompleted.value = 0
    xpForCurrentLevel.value = 0
    xpToNextLevel.value = 100
    xpProgressPercent.value = 0
    todayCards.value = 0
    todayQuizzes.value = 0
    todayXP.value = 0
    claimedChallenges.value = []
    weeklyActivity.value = []
    leaderboard.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    // State
    xp, level, streakCount, longestStreak,
    totalCardsStudied, totalQuizzesCompleted,
    xpForCurrentLevel, xpToNextLevel, xpProgressPercent,
    todayCards, todayQuizzes, todayXP, claimedChallenges,
    weeklyActivity, leaderboard, isLoading, milestoneReached,
    // Computed
    levelLabel, nextLevelXP,
    // Actions
    fetchProgress, fetchWeekly, fetchLeaderboard,
    logFlashcardSession, logQuizCompletion, claimChallenge,
    $reset,
  }
})
