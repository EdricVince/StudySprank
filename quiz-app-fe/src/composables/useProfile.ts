import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  Star,
  Trophy,
  BookOpen,
  Flame,
  Zap,
  Crown,
  Sparkles,
  Rocket,
  Brain,
  GraduationCap,
} from '@/components/icons'
import { useToast } from './useToast'
import { useAuthStore } from '@/stores/auth.store'
import { useProgressStore } from '@/stores/progress.store'
import { api } from '@/utils/api'
import type {
  ProfileData,
  ProfileStats,
  ProfileEditForm,
  SocialLinkForm,
} from '@/types/profile'
import type { Component } from 'vue'

const LEVEL_TITLES = [
  'Beginner', 'Explorer', 'Learner', 'Scholar', 'Thinker',
  'Achiever', 'Expert', 'Master', 'Champion', 'Legend',
]

export type ActivityType = 'lesson' | 'quiz' | 'achievement' | 'streak' | 'milestone' | 'review'
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface LearningStats {
  level: number
  levelTitle: string
  currentXP: number
  nextLevelXP: number
  totalXP: number
  wordsLearned: number
  quizzesCompleted: number
  studyHours: number
  currentStreak: number
  longestStreak: number
}

export interface RecentActivity {
  id: string
  type: ActivityType
  title: string
  description: string
  xp?: number
  timestamp: Date
}

export interface ShowcaseAchievement {
  id: string
  name: string
  description: string
  icon: Component
  rarity: AchievementRarity
  earned: boolean
  earnedAt?: Date
  progress?: number
  target?: number
}

export function useProfile() {
  const toast = useToast()
  const authStore = useAuthStore()
  const progressStore = useProgressStore()

  // Get user info from auth store
  const getUserName = () => {
    if (authStore.user?.name) return authStore.user.name
    if (authStore.user?.email) return authStore.user.email.split('@')[0] ?? 'Guest User'
    return 'Guest User'
  }

  const getUserEmail = () => authStore.user?.email || ''

  // Profile data - initialized from auth store
  const profile = reactive<ProfileData>({
    avatar: '',
    fullName: getUserName(),
    username: getUserName().toLowerCase().replace(/\s+/g, ''),
    email: getUserEmail(),
    phone: '',
    title: 'Learner',
    location: '',
    bio: 'Welcome to StudySpark! Start your learning journey today.',
    socialLinks: [],
  })

  // Watch for auth store changes and update profile
  watch(
    () => authStore.user,
    (newUser) => {
      if (newUser) {
        profile.fullName = newUser.name || newUser.email?.split('@')[0] || 'Guest User'
        profile.username = profile.fullName.toLowerCase().replace(/\s+/g, '')
        profile.email = newUser.email || ''
      }
    },
    { immediate: true }
  )

  // Avatar stats - sourced from progressStore
  const avatarStats = reactive<ProfileStats>({
    courses: 0,
    streak: progressStore.streakCount,
    xp: progressStore.xp,
  })

  watch(
    () => ({ streak: progressStore.streakCount, xp: progressStore.xp }),
    ({ streak, xp }) => {
      avatarStats.streak = streak
      avatarStats.xp = xp
    },
  )

  // Learning stats - sourced from progressStore
  const learningStats = reactive<LearningStats>({
    level: progressStore.level,
    levelTitle: LEVEL_TITLES[(progressStore.level - 1)] || 'Beginner',
    currentXP: progressStore.xp,
    nextLevelXP: progressStore.xpToNextLevel,
    totalXP: progressStore.xp,
    wordsLearned: progressStore.totalCardsStudied,
    quizzesCompleted: progressStore.totalQuizzesCompleted,
    studyHours: 0,
    currentStreak: progressStore.streakCount,
    longestStreak: progressStore.longestStreak,
  })

  watch(
    () => ({
      level: progressStore.level,
      xp: progressStore.xp,
      xpToNextLevel: progressStore.xpToNextLevel,
      totalCardsStudied: progressStore.totalCardsStudied,
      totalQuizzesCompleted: progressStore.totalQuizzesCompleted,
      streakCount: progressStore.streakCount,
      longestStreak: progressStore.longestStreak,
    }),
    (v) => {
      learningStats.level = v.level
      learningStats.levelTitle = LEVEL_TITLES[v.level - 1] || 'Beginner'
      learningStats.currentXP = v.xp
      learningStats.nextLevelXP = v.xpToNextLevel
      learningStats.totalXP = v.xp
      learningStats.wordsLearned = v.totalCardsStudied
      learningStats.quizzesCompleted = v.totalQuizzesCompleted
      learningStats.currentStreak = v.streakCount
      learningStats.longestStreak = v.longestStreak
    },
  )

  // Recent activities — derived from real weekly progress data
  const recentActivities = computed<RecentActivity[]>(() => {
    const activities: RecentActivity[] = []
    ;[...progressStore.weeklyActivity]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((day) => {
        if (day.cards_studied > 0) {
          activities.push({
            id: `flashcard-${day.date}`,
            type: 'lesson',
            title: `Studied ${day.cards_studied} flashcard${day.cards_studied > 1 ? 's' : ''}`,
            description: day.day_label,
            xp: Math.min(day.cards_studied * 5, 100),
            timestamp: new Date(day.date),
          })
        }
        if (day.quizzes_completed > 0) {
          activities.push({
            id: `quiz-${day.date}`,
            type: 'quiz',
            title: `Completed ${day.quizzes_completed} quiz${day.quizzes_completed > 1 ? 'zes' : ''}`,
            description: day.day_label,
            xp: day.quizzes_completed * 25,
            timestamp: new Date(day.date),
          })
        }
      })
    return activities.slice(0, 5)
  })

  // Achievements — computed from real progressStore data
  const achievements = computed<ShowcaseAchievement[]>(() => {
    const cards = progressStore.totalCardsStudied
    const quizzes = progressStore.totalQuizzesCompleted
    const streak = progressStore.longestStreak

    const make = (
      id: string,
      name: string,
      description: string,
      icon: Component,
      rarity: AchievementRarity,
      current: number,
      target: number,
    ): ShowcaseAchievement => {
      const earned = current >= target
      return { id, name, description, icon, rarity, earned, earnedAt: earned ? new Date() : undefined, progress: Math.min(current, target), target }
    }

    return [
      make('1', 'First Steps',       'Complete your first lesson or quiz',  Star,         'common',    cards + quizzes,  1),
      make('2', 'Word Collector',    'Study 100 flashcards',                BookOpen,     'common',    cards,           100),
      make('3', 'Knowledge Seeker',  'Study 500 flashcards',                Brain,        'rare',      cards,           500),
      make('4', 'Vocabulary Master', 'Study 1000 flashcards',               GraduationCap,'epic',      cards,          1000),
      make('5', 'Week Warrior',      'Maintain a 7-day streak',             Flame,        'common',    streak,            7),
      make('6', 'Streak Champion',   'Maintain a 30-day streak',            Zap,          'rare',      streak,           30),
      make('7', 'Unstoppable',       'Maintain a 100-day streak',           Crown,        'legendary', streak,          100),
      make('8', 'Quiz Starter',      'Complete 10 quizzes',                 Rocket,       'common',    quizzes,          10),
      make('9', 'Quiz Master',       'Complete 50 quizzes',                 Trophy,       'rare',      quizzes,          50),
      make('10','Quiz Legend',       'Complete 100 quizzes',                Sparkles,     'epic',      quizzes,         100),
    ]
  })

  // Edit state
  const isEditing = ref(false)
  const editForm = reactive<ProfileEditForm>({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    title: '',
    location: '',
    bio: '',
  })

  const maxBioLength = 300

  // Social link modal state
  const showSocialModal = ref(false)
  const editingSocialIndex = ref<number | null>(null)
  const socialForm = reactive<SocialLinkForm>({
    platform: '',
    url: '',
  })

  // Computed
  const userInitials = computed(() => {
    const names = profile.fullName.split(' ')
    return names.map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  })

  const levelProgress = computed(() => {
    return Math.min((learningStats.currentXP / learningStats.nextLevelXP) * 100, 100)
  })

  // Fetch profile from BE on mount to sync name/avatar
  onMounted(async () => {
    try {
      const data = await api.getProfile()
      if (data.name) {
        profile.fullName = data.name
        profile.username = data.name.toLowerCase().replace(/\s+/g, '')
      }
      if (data.avatar) profile.avatar = data.avatar
      authStore.setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        is_active: data.is_active,
        role_id: data.role_id,
      })
    } catch {
      // Non-critical — keep current data from authStore
    }
  })

  // Avatar handlers
  const handleAvatarChange = async (avatar: string) => {
    profile.avatar = avatar
    try {
      await api.updateProfile({ avatar })
    } catch {
      // Non-critical
    }
    toast.success('Avatar updated!')
  }

  const changeCover = () => {
    toast.info('Cover photo feature coming soon!')
  }

  // Edit profile
  const startEditing = () => {
    editForm.fullName = profile.fullName
    editForm.username = profile.username
    editForm.email = profile.email
    editForm.phone = profile.phone
    editForm.title = profile.title
    editForm.location = profile.location
    editForm.bio = profile.bio
    isEditing.value = true
  }

  const cancelEditing = () => {
    isEditing.value = false
  }

  const saveProfile = async () => {
    profile.fullName = editForm.fullName
    profile.username = editForm.username
    profile.email = editForm.email
    profile.phone = editForm.phone
    profile.title = editForm.title
    profile.location = editForm.location
    profile.bio = editForm.bio
    isEditing.value = false
    try {
      await api.updateProfile({ name: editForm.fullName })
      authStore.setUser({ ...authStore.user!, name: editForm.fullName })
      toast.success('Profile updated successfully!')
    } catch {
      toast.error('Failed to save profile to server.')
    }
  }

  // Social links
  const addSocialLink = () => {
    socialForm.platform = ''
    socialForm.url = ''
    editingSocialIndex.value = null
    showSocialModal.value = true
  }

  const editSocialLink = (index: number) => {
    const link = profile.socialLinks[index]
    if (!link) return
    socialForm.platform = link.platform
    socialForm.url = link.url
    editingSocialIndex.value = index
    showSocialModal.value = true
  }

  const removeSocialLink = (index: number) => {
    profile.socialLinks.splice(index, 1)
    toast.success('Social link removed!')
  }

  const saveSocialLink = () => {
    if (!socialForm.platform || !socialForm.url) {
      toast.error('Please fill in all fields!')
      return
    }

    if (editingSocialIndex.value !== null) {
      profile.socialLinks[editingSocialIndex.value] = {
        platform: socialForm.platform,
        url: socialForm.url,
      }
      toast.success('Social link updated!')
    } else {
      profile.socialLinks.push({
        platform: socialForm.platform,
        url: socialForm.url,
      })
      toast.success('Social link added!')
    }
    closeSocialModal()
  }

  const closeSocialModal = () => {
    showSocialModal.value = false
    editingSocialIndex.value = null
  }

  return {
    // State
    profile,
    avatarStats,
    learningStats,
    recentActivities,
    achievements,
    isEditing,
    editForm,
    maxBioLength,
    showSocialModal,
    editingSocialIndex,
    socialForm,
    // Computed
    userInitials,
    levelProgress,
    // Actions
    handleAvatarChange,
    changeCover,
    startEditing,
    cancelEditing,
    saveProfile,
    addSocialLink,
    editSocialLink,
    removeSocialLink,
    saveSocialLink,
    closeSocialModal,
  }
}
