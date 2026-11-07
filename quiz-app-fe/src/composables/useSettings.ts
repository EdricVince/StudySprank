import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from './useTheme'
import { useToast } from './useToast'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/utils/api'
import type { PreferencesData } from '@/types/account'

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

/** How long after the last change the notification / study / privacy settings are saved. */
const SAVE_DELAY_MS = 600

/** Copy the values the server sent over the defaults, leaving the keys it did not send alone. */
function assignDefined<T extends object>(target: T, source: object | undefined) {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value !== undefined && value !== null) (target as Record<string, unknown>)[key] = value
  }
}

const errorText = (e: unknown, fallback: string) =>
  (e as { errorMessage?: string })?.errorMessage || fallback

export function useSettings() {
  const { setTheme } = useTheme()
  const toast = useToast()
  const authStore = useAuthStore()
  const router = useRouter()
  const { t } = useI18n()

  // Get user info from auth store
  const getUserName = () => {
    if (authStore.user?.name) return authStore.user.name
    if (authStore.user?.email) return authStore.user.email.split('@')[0] ?? 'Guest User'
    return 'Guest User'
  }

  const getUserEmail = () => authStore.user?.email || ''

  const derivedUsername = (name: string) => name.toLowerCase().replace(/\s+/g, '')
  // The handle saved on the server wins over the one derived from the name.
  const serverUsername = ref('')

  // Account - initialized from auth store
  const accountSettings = reactive<AccountSettings>({
    fullName: getUserName(),
    username: derivedUsername(getUserName()),
    email: getUserEmail(),
  })

  // Watch for auth store changes and update account settings
  watch(
    () => authStore.user,
    (newUser) => {
      if (newUser) {
        accountSettings.fullName = newUser.name || newUser.email?.split('@')[0] || 'Guest User'
        accountSettings.username = serverUsername.value || derivedUsername(accountSettings.fullName)
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

  // Appearance - read saved theme/fontSize from localStorage (a per-device preference)
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

  // ── Notification / study / privacy settings live in the database ───────────────
  const prefsLoaded = ref(false)
  let lastSaved = ''
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const currentPreferences = (): PreferencesData => ({
    study: { cardsPerDay: Number(studySettings.cardsPerDay), studyMinutes: Number(studySettings.studyMinutes) },
    notifications: {
      email: notificationSettings.email,
      streakReminder: notificationSettings.streakReminder,
      achievements: notificationSettings.achievements,
      weeklyReport: notificationSettings.weeklyReport,
      reminderTime: notificationSettings.reminderTime,
      timezone: notificationSettings.timezone,
    },
    privacy: {
      publicProfile: privacySettings.publicProfile,
      showStreak: privacySettings.showStreak,
      showAchievements: privacySettings.showAchievements,
      analytics: privacySettings.analytics,
    },
  })

  async function loadFromServer() {
    try {
      const profile = await api.getAccountProfile()
      if (profile.username) {
        serverUsername.value = profile.username
        accountSettings.username = profile.username
      }
      assignDefined(notificationSettings, profile.preferences?.notifications)
      assignDefined(studySettings, profile.preferences?.study)
      assignDefined(privacySettings, profile.preferences?.privacy)
    } catch {
      // The defaults stay; nothing is saved until the learner changes something.
    } finally {
      lastSaved = JSON.stringify(currentPreferences())
      prefsLoaded.value = true
    }
  }

  async function savePreferences() {
    const snapshot = JSON.stringify(currentPreferences())
    if (snapshot === lastSaved) return
    lastSaved = snapshot
    try {
      await api.updateAccountProfile({ preferences: currentPreferences() })
      toast.success(t('settings.toast.saved'))
    } catch {
      lastSaved = '' // try again at the next change
      toast.error(t('settings.toast.saveFailed'))
    }
  }

  watch(
    [notificationSettings, studySettings, privacySettings],
    () => {
      if (!prefsLoaded.value || JSON.stringify(currentPreferences()) === lastSaved) return
      clearTimeout(saveTimer)
      saveTimer = setTimeout(savePreferences, SAVE_DELAY_MS)
    },
    { deep: true },
  )

  onMounted(loadFromServer)
  // A change made just before leaving the page is still saved.
  onUnmounted(() => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      void savePreferences()
    }
  })

  // Delete account
  const showDeleteConfirm = ref(false)
  const deleting = ref(false)
  const deleteError = ref('')

  const saveAccountSettings = async () => {
    const name = accountSettings.fullName.trim()
    try {
      await Promise.all([
        api.updateProfile({ name }),
        api.updateAccountProfile({ username: accountSettings.username }),
      ])
      serverUsername.value = accountSettings.username.trim()
      if (authStore.user) authStore.setUser({ ...authStore.user, name })
      toast.success(t('settings.toast.accountSaved'))
    } catch {
      toast.error(t('settings.toast.accountFailed'))
    }
  }

  const changePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error(t('settings.toast.passwordMismatch'))
      return false
    }
    if (passwordForm.new.length < 8) {
      toast.error(t('settings.toast.passwordShort'))
      return false
    }
    try {
      // Every other device is signed out; this one continues with the fresh tokens.
      const tokens = await api.changePassword(passwordForm.current, passwordForm.new)
      authStore.setTokens(tokens.access_token, tokens.refresh_token)
      passwordForm.current = ''
      passwordForm.new = ''
      passwordForm.confirm = ''
      toast.success(t('settings.toast.passwordChanged'))
      return true
    } catch (e) {
      toast.error(errorText(e, t('settings.toast.passwordFailed')))
      return false
    }
  }

  const updateTheme = (theme: 'light' | 'dark' | 'system') => {
    appearanceSettings.theme = theme
    setTheme(theme)
    toast.success(t('settings.toast.themeUpdated'))
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

  /** Download everything the app holds about the account (read from the server), as JSON. */
  const exportUserData = async () => {
    try {
      const data = await api.exportAccountData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `studyspark-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('settings.toast.exported'))
    } catch {
      toast.error(t('settings.toast.exportFailed'))
    }
  }

  /** Permanently delete the account (the server checks the password), then sign out. */
  const deleteAccount = async (password: string) => {
    deleting.value = true
    deleteError.value = ''
    try {
      await api.deleteAccount(password)
      showDeleteConfirm.value = false
      toast.success(t('settings.toast.deleted'))
      authStore.logout()
      await router.push('/login')
    } catch (e) {
      deleteError.value =
        (e as { status?: number })?.status === 400
          ? t('settings.deleteModal.wrongPassword')
          : errorText(e, t('settings.toast.deleteFailed'))
    } finally {
      deleting.value = false
    }
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
    deleting,
    deleteError,
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
