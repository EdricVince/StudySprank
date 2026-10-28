import { ref, reactive, computed, watch } from 'vue'
import { useTheme } from './useTheme'
import { useToast } from './useToast'
import { useAuthStore } from '@/stores/auth.store'

export interface AccountSettings {
  fullName: string
  username: string
  email: string
}

export interface PasswordForm {
  current: string
  new: string
  confirm: string
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
}

export interface NotificationSettings {
  email: boolean
  streakReminder: boolean
  achievements: boolean
  weeklyReport: boolean
  reminderTime: string
  timezone: string
  [key: string]: boolean | string
}

export interface StudySettings {
  cardsPerDay: number
  studyMinutes: number
}

export interface PrivacySettings {
  publicProfile: boolean
  showStreak: boolean
  showAchievements: boolean
  analytics: boolean
  [key: string]: boolean
}

export function useSettings() {
  const { setTheme } = useTheme()
  const toast = useToast()
  const authStore = useAuthStore()

  // Get user info from auth store
  const getUserName = () => {
    if (authStore.user?.name) return authStore.user.name
    if (authStore.user?.email) return authStore.user.email.split('@')[0] ?? 'Guest User'
    return 'Guest User'
  }

  const getUserEmail = () => authStore.user?.email || ''

  // Account - initialized from auth store
  const accountSettings = reactive<AccountSettings>({
    fullName: getUserName(),
    username: getUserName().toLowerCase().replace(/\s+/g, ''),
    email: getUserEmail(),
  })

  // Watch for auth store changes and update account settings
  watch(
    () => authStore.user,
    (newUser) => {
      if (newUser) {
        accountSettings.fullName = newUser.name || newUser.email?.split('@')[0] || 'Guest User'
        accountSettings.username = accountSettings.fullName.toLowerCase().replace(/\s+/g, '')
        accountSettings.email = newUser.email || ''
      }
    },
    { immediate: true }
  )

  const passwordForm = reactive<PasswordForm>({
    current: '',
    new: '',
    confirm: '',
  })

  const userInitials = computed(() => {
    const names = accountSettings.fullName.split(' ')
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2)
  })

  // Appearance - read saved theme/fontSize from localStorage
  const savedTheme = localStorage.getItem('studyspark-theme') as 'light' | 'dark' | 'system' | null
  const savedFontSize = Number(localStorage.getItem('studyspark-font-size') || '100')
  const appearanceSettings = reactive<AppearanceSettings>({
    theme: savedTheme && ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system',
    fontSize: savedFontSize,
  })

  // Apply font size to root element and persist whenever it changes
  watch(
    () => appearanceSettings.fontSize,
    (size) => {
      document.documentElement.style.fontSize = `${size}%`
      localStorage.setItem('studyspark-font-size', String(size))
    },
    { immediate: true }
  )

  // Notifications
  const notificationSettings = reactive<NotificationSettings>({
    email: true,
    streakReminder: true,
    achievements: true,
    weeklyReport: false,
    reminderTime: '09:00',
    timezone: 'Asia/Ho_Chi_Minh',
  })

  // Study
  const studySettings = reactive<StudySettings>({
    cardsPerDay: 30,
    studyMinutes: 20,
  })

  // Privacy
  const privacySettings = reactive<PrivacySettings>({
    publicProfile: true,
    showStreak: true,
    showAchievements: true,
    analytics: true,
  })

  // Delete account
  const showDeleteConfirm = ref(false)

  // Actions
  const saveAccountSettings = () => {
    // API call here
    toast.success('Account settings saved!')
  }

  const changePassword = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Passwords do not match!')
      return false
    }
    if (passwordForm.new.length < 8) {
      toast.error('Password must be at least 8 characters!')
      return false
    }
    // API call here
    passwordForm.current = ''
    passwordForm.new = ''
    passwordForm.confirm = ''
    toast.success('Password updated successfully!')
    return true
  }

  const updateTheme = (theme: 'light' | 'dark' | 'system') => {
    appearanceSettings.theme = theme
    setTheme(theme)
    toast.success('Theme updated!')
  }

  const toggleNotification = (key: string) => {
    if (typeof notificationSettings[key] === 'boolean') {
      notificationSettings[key] = !notificationSettings[key]
    }
  }

  const togglePrivacy = (key: string) => {
    if (typeof privacySettings[key] === 'boolean') {
      privacySettings[key] = !privacySettings[key]
    }
  }

  const exportUserData = () => {
    const data = {
      account: accountSettings,
      appearance: appearanceSettings,
      notifications: notificationSettings,
      study: studySettings,
      privacy: privacySettings,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studyspark-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Data exported successfully!')
  }

  const deleteAccount = () => {
    showDeleteConfirm.value = false
    toast.success('Account deleted')
  }

  return {
    // State
    accountSettings,
    passwordForm,
    appearanceSettings,
    notificationSettings,
    studySettings,
    privacySettings,
    showDeleteConfirm,
    // Computed
    userInitials,
    // Actions
    saveAccountSettings,
    changePassword,
    updateTheme,
    toggleNotification,
    togglePrivacy,
    exportUserData,
    deleteAccount,
  }
}
