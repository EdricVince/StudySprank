import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setCookie, getCookie, removeCookie } from '@/utils/cookies'
import { api, ApiError } from '@/utils/api'
import type { UserOut, UserProfileData } from '@/types/api'
import { UserRole } from '@/types/role'
import { useProgressStore } from '@/stores/progress.store'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const REMEMBER_EMAIL_KEY = 'remembered_email'
const USER_KEY = 'user_data'
const TEACHER_DOMAIN = '@teacher.sprk'

export interface AuthUser {
  id: number
  email: string
  name?: string
  is_active?: boolean
  role_id?: number
}

export interface AuthResult {
  success: boolean
  message?: string
  user?: AuthUser
}

export const useAuthStore = defineStore('auth', () => {
  // Load user from localStorage on init
  const savedUser = localStorage.getItem(USER_KEY)
  const currentUser = ref<AuthUser | null>(savedUser ? JSON.parse(savedUser) : null)

  // Use a reactive ref so computed re-evaluates when token changes
  // document.cookie is NOT reactive, so we track it separately
  const _accessToken = ref<string | undefined>(getCookie(ACCESS_TOKEN_KEY))
  const isAuthenticated = computed(() => !!_accessToken.value)

  const user = computed(() => currentUser.value)

  // Role-based computed properties
  const isTeacher = computed(() => currentUser.value?.role_id === UserRole.TEACHER)
  const isAdmin = computed(() => currentUser.value?.role_id === UserRole.ADMIN)
  const isStudent = computed(() => !currentUser.value?.role_id || currentUser.value.role_id === UserRole.STUDENT)
  const userRole = computed(() => currentUser.value?.role_id ?? UserRole.STUDENT)
  const isTeacherEmail = computed(() => currentUser.value?.email?.toLowerCase().endsWith(TEACHER_DOMAIN) ?? false)
  const canAccessTeacher = computed(() => isTeacher.value || isTeacherEmail.value)

  const setTokens = (accessToken: string, refreshToken?: string) => {
    _accessToken.value = accessToken
    setCookie(ACCESS_TOKEN_KEY, accessToken, {
      expires: 1,
      secure: true,
      sameSite: 'strict',
    })
    if (refreshToken) {
      setCookie(REFRESH_TOKEN_KEY, refreshToken, {
        expires: 7,
        secure: true,
        sameSite: 'strict',
      })
    }
  }

  const setUser = (user: AuthUser | null) => {
    currentUser.value = user
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  const clearTokens = () => {
    _accessToken.value = undefined
    removeCookie(ACCESS_TOKEN_KEY)
    removeCookie(REFRESH_TOKEN_KEY)
    setUser(null)
  }

  const getAccessToken = (): string | undefined => _accessToken.value ?? getCookie(ACCESS_TOKEN_KEY)
  const getRefreshToken = (): string | undefined => getCookie(REFRESH_TOKEN_KEY)

  const login = async (email: string, password: string, remember = false): Promise<AuthResult> => {
    try {
      const resp = await api.login(email, password)
      setTokens(resp.access_token, resp.refresh_token)
      setUser({
        id: resp.user.id,
        email: resp.user.email,
        is_active: resp.user.is_active,
        role_id: resp.user.role_id,
      })
      if (remember) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
      // Fetch full profile (includes name/avatar) — non-critical
      try {
        const profileData = await api.getProfile()
        setUser({
          id: profileData.id,
          email: profileData.email,
          name: profileData.name,
          is_active: profileData.is_active ?? resp.user.is_active,
          role_id: profileData.role_id ?? resp.user.role_id,
        })
      } catch {
        // Non-critical: continue with basic data from login response
      }
      const progressStore = useProgressStore()
      void Promise.all([progressStore.fetchProgress(), progressStore.fetchWeekly(), progressStore.fetchLeaderboard()])

      return { success: true, user: currentUser.value ?? undefined }
    } catch (error) {
      console.error('Login error:', error)
      const message = error instanceof ApiError ? error.errorMessage : 'Login failed'
      return { success: false, message }
    }
  }

  const register = async (email: string, password: string, roleId?: number): Promise<AuthResult> => {
    try {
      const userOut: UserOut = await api.register(email, password, roleId)
      // BE doesn't return token on register, user needs to login
      // Store user data temporarily
      const user: AuthUser = {
        id: userOut.id,
        email: userOut.email ?? '',
        is_active: userOut.is_active,
        role_id: userOut.role_id ?? roleId,
      }
      return { success: true, user, message: 'Registration successful! Please login.' }
    } catch (error) {
      console.error('Registration error:', error)
      const message = error instanceof ApiError ? error.errorMessage : 'Registration failed'
      return { success: false, message }
    }
  }

  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      await api.resetPassword(email)
      return { success: true, message: 'Password reset email sent' }
    } catch (error) {
      console.error('Reset password error:', error)
      const message = error instanceof ApiError ? error.errorMessage : 'Reset password failed'
      return { success: false, message }
    }
  }

  const logout = () => {
    // Revoke the refresh token server-side (best effort), then forget everything locally.
    const refreshToken = getRefreshToken()
    if (refreshToken) api.logout(refreshToken).catch(() => {})
    clearTokens()
    const progressStore = useProgressStore()
    progressStore.$reset()
  }

  const getRememberedEmail = (): string => localStorage.getItem(REMEMBER_EMAIL_KEY) || ''

  const fetchUserProfile = async (): Promise<UserProfileData | null> => {
    const token = getAccessToken()
    if (!token) return null
    try {
      const profile = await api.getProfile()
      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        is_active: profile.is_active,
        role_id: profile.role_id,
      })
      return profile
    } catch (error) {
      console.error('Fetch profile error:', error)
      clearTokens()
      return null
    }
  }

  // Refresh tokens are single-use (rotated by the server), so concurrent 401s must
  // share ONE refresh call — a second call with the same token would look like reuse.
  let refreshInFlight: Promise<boolean> | null = null

  const refreshAccessToken = (): Promise<boolean> => {
    if (refreshInFlight) return refreshInFlight
    const refreshToken = getRefreshToken()
    if (!refreshToken) return Promise.resolve(false)
    refreshInFlight = (async () => {
      try {
        const resp = await api.refreshToken(refreshToken)
        setTokens(resp.access_token, resp.refresh_token)
        return true
      } catch (error) {
        console.error('Token refresh error:', error)
        clearTokens()
        return false
      } finally {
        refreshInFlight = null
      }
    })()
    return refreshInFlight
  }

  return {
    // State
    currentUser,
    user,
    isAuthenticated,
    // Role helpers
    isTeacher,
    isTeacherEmail,
    canAccessTeacher,
    isAdmin,
    isStudent,
    userRole,
    // Actions
    // Google/Facebook OAuth lives in lib/supabase.ts + OAuthCallbackPage (the old
    // always-failing loginWithGoogle/registerWithGoogle stubs were removed).
    login,
    register,
    resetPassword,
    logout,
    getRememberedEmail,
    getAccessToken,
    getRefreshToken,
    fetchUserProfile,
    refreshAccessToken,
    setTokens,
    setUser,
    clearTokens,
  }
})
