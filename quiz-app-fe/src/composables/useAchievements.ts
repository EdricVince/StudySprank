import { ref, computed } from 'vue'
import {
  Trophy, Star, Crown, Rocket, Zap, BookOpen, GraduationCap, Flame, Users, Brain, Sparkles, Heart,
} from '@/components/icons'
import type { AchievementCategory, AchievementRarity, EnhancedAchievement } from '@/types/profile'
import { useProgressStore } from '@/stores/progress.store'

const POINTS_MAP: Record<AchievementRarity, number> = {
  common: 10, rare: 25, epic: 50, legendary: 100,
}

export function useAchievements() {
  const progressStore = useProgressStore()
  const selectedCategory = ref<AchievementCategory | 'all'>('all')
  const selectedAchievement = ref<EnhancedAchievement | null>(null)
  const showModal = ref(false)

  const achievements = computed<EnhancedAchievement[]>(() => {
    const cards = progressStore.totalCardsStudied
    const quizzes = progressStore.totalQuizzesCompleted
    const streak = progressStore.streakCount

    const now = new Date()
    const e = (cond: boolean): Date | undefined => (cond ? now : undefined)
    return [
      { id: '1', name: 'First Steps', description: 'Study your first flashcard', icon: Star, category: 'learning', rarity: 'common', earned: cards >= 1, progress: Math.min(cards, 1), target: 1, earnedAt: e(cards >= 1) },
      { id: '2', name: 'Word Collector', description: 'Study 100 flashcards', icon: BookOpen, category: 'learning', rarity: 'common', earned: cards >= 100, progress: Math.min(cards, 100), target: 100, earnedAt: e(cards >= 100) },
      { id: '3', name: 'Knowledge Seeker', description: 'Study 500 flashcards', icon: Brain, category: 'learning', rarity: 'rare', earned: cards >= 500, progress: Math.min(cards, 500), target: 500, earnedAt: e(cards >= 500) },
      { id: '4', name: 'Vocabulary Master', description: 'Study 1000 flashcards', icon: GraduationCap, category: 'learning', rarity: 'epic', earned: cards >= 1000, progress: Math.min(cards, 1000), target: 1000, earnedAt: e(cards >= 1000) },
      { id: '5', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: Flame, category: 'streak', rarity: 'common', earned: streak >= 7, progress: Math.min(streak, 7), target: 7, earnedAt: e(streak >= 7) },
      { id: '6', name: 'Streak Champion', description: 'Maintain a 30-day streak', icon: Zap, category: 'streak', rarity: 'rare', earned: streak >= 30, progress: Math.min(streak, 30), target: 30, earnedAt: e(streak >= 30) },
      { id: '7', name: 'Unstoppable', description: 'Maintain a 100-day streak', icon: Crown, category: 'streak', rarity: 'legendary', earned: streak >= 100, progress: Math.min(streak, 100), target: 100, earnedAt: e(streak >= 100) },
      { id: '8', name: 'Team Player', description: 'Join a study group', icon: Users, category: 'social', rarity: 'common', earned: false, progress: 0, target: 1 },
      { id: '9', name: 'Helpful Friend', description: 'Help 10 other learners', icon: Heart, category: 'social', rarity: 'rare', earned: false, progress: 0, target: 10 },
      { id: '10', name: 'Quiz Master', description: 'Complete 50 quizzes', icon: Trophy, category: 'mastery', rarity: 'epic', earned: quizzes >= 50, progress: Math.min(quizzes, 50), target: 50, earnedAt: e(quizzes >= 50) },
      { id: '11', name: 'Quiz Veteran', description: 'Complete 10 quizzes', icon: Sparkles, category: 'mastery', rarity: 'common', earned: quizzes >= 10, progress: Math.min(quizzes, 10), target: 10, earnedAt: e(quizzes >= 10) },
      { id: '12', name: 'Speed Demon', description: 'Complete a quiz in under 1 minute', icon: Rocket, category: 'mastery', rarity: 'rare', earned: false, progress: 0, target: 1 },
    ]
  })

  const earnedCount = computed(() => achievements.value.filter((a) => a.earned).length)

  const totalPoints = computed(() =>
    achievements.value.filter((a) => a.earned).reduce((sum, a) => sum + POINTS_MAP[a.rarity], 0),
  )

  const rarityCount = computed(() => {
    const earned = achievements.value.filter((a) => a.earned)
    return {
      common: earned.filter((a) => a.rarity === 'common').length,
      rare: earned.filter((a) => a.rarity === 'rare').length,
      epic: earned.filter((a) => a.rarity === 'epic').length,
      legendary: earned.filter((a) => a.rarity === 'legendary').length,
    }
  })

  const recentAchievement = computed(() => {
    const earned = achievements.value.filter((a) => a.earned && a.earnedAt)
    if (!earned.length) return null
    return earned.sort((a, b) => {
      const dateA = a.earnedAt ? new Date(a.earnedAt).getTime() : 0
      const dateB = b.earnedAt ? new Date(b.earnedAt).getTime() : 0
      return dateB - dateA
    })[0]
  })

  const achievementsData = computed(() => ({
    achievements: achievements.value,
    totalEarned: earnedCount.value,
    totalAvailable: 12,
  }))

  const filteredAchievements = computed(() => {
    if (selectedCategory.value === 'all') return achievements.value
    return achievements.value.filter((a) => a.category === selectedCategory.value)
  })

  const getPoints = (rarity: AchievementRarity): number => POINTS_MAP[rarity]

  const getRarityColor = (rarity: AchievementRarity): string => {
    const colors: Record<AchievementRarity, string> = {
      common: 'text-muted-foreground', rare: 'text-chart-2', epic: 'text-chart-4', legendary: 'text-chart-1',
    }
    return colors[rarity]
  }

  const getRarityBgClass = (rarity: AchievementRarity): string => {
    const classes: Record<AchievementRarity, string> = {
      common: 'bg-secondary border-border', rare: 'bg-chart-2/10 border-chart-2',
      epic: 'bg-chart-4/10 border-chart-4', legendary: 'bg-chart-1/10 border-chart-1',
    }
    return classes[rarity]
  }

  const formatDate = (date: Date): string =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const openDetail = (achievement: EnhancedAchievement) => {
    selectedAchievement.value = achievement
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    selectedAchievement.value = null
  }

  return {
    selectedCategory, selectedAchievement, showModal, achievementsData,
    getPoints, getRarityColor, getRarityBgClass, formatDate,
    openDetail, closeModal,
    filteredAchievements, earnedCount, totalPoints, rarityCount, recentAchievement,
  }
}
