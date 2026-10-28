import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setCookie, getCookie, removeCookie } from '@/utils/cookies'
import { api, ApiError } from '@/utils/api'
import type { LoginResponseData, UserOut, UserProfileData } from '@/types/api'
import { UserRole } from '@/types/role'
import type { TeacherStatus } from '@/types/role'
import { useProgressStore } from '@/stores/progress.store'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const REMEMBER_EMAIL_KEY = 'remembered_email'
const USER_KEY = 'user_data'

export interface AuthUser {
  id: number
  email: string
  name?: string
  is_active?: boolean
  role_id?: number
  teacher_status?: TeacherStatus
  teacher_organization?: string | null
  teacher_reject_reason?: string | null
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
  // Access is decided by the role the server assigned, never by the email domain.
  // The teacher portal is shared: teachers and admins both use it.
  const canAccessTeacher = computed(() => isTeacher.value || isAdmin.value)
  const teacherStatus = computed<TeacherStatus>(() => currentUser.value?.teacher_status ?? 'none')
  // Teachers can create classes/content only once an admin has approved them.
  const isTeacherApproved = computed(() => isTeacher.value && teacherStatus.value === 'approved')
  // Where a signed-in user lands: each role has its own home.
  const homePath = computed(() => {
    if (isAdmin.value) return '/teacher/admin/overview'
    if (isTeacher.value) return isTeacherApproved.value ? '/teacher/dashboard' : '/teacher/pending'
    return '/dashboard'
  })

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

  /**
   * Shared post-login step for password login and OAuth: store the tokens and user,
   * enrich the user with the full profile (name/avatar), and warm the progress data.
   */
  const completeLogin = async (resp: LoginResponseData): Promise<void> => {
    setTokens(resp.access_token, resp.refresh_token)
    setUser({
      id: resp.user.id,
      email: resp.user.email,
      is_active: resp.user.is_active,
      role_id: resp.user.role_id,
      teacher_status: resp.user.teacher_status,
    })
    try {
      const profile = await api.getProfile()
      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        is_active: profile.is_active ?? resp.user.is_active,
        role_id: profile.role_id ?? resp.user.role_id,
        teacher_status: profile.teacher_status ?? resp.user.teacher_status,
        teacher_organization: profile.teacher_organization,
        teacher_reject_reason: profile.teacher_reject_reason,
      })
    } catch {
      // Non-critical: keep the basic data from the login response
    }
    const progressStore = useProgressStore()
    void Promise.all([progressStore.fetchProgress(), progressStore.fetchWeekly(), progressStore.fetchLeaderboard()])
  }

  const login = async (email: string, password: string, remember = false): Promise<AuthResult> => {
    try {
      await completeLogin(await api.login(email, password))
      // "Remember me" only pre-fills the email next time; it does not extend the session.
      if (remember) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
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

  /** A teacher applies for an account; they are signed in straight away, as 'pending'. */
  const registerTeacher = async (data: {
    email: string
    password: string
    name: string
    organization: string
    teacher_card_image: string
  }): Promise<AuthResult> => {
    try {
      const resp = await api.registerTeacher(data)
      await completeLogin({
        access_token: resp.access_token,
        refresh_token: resp.refresh_token,
        user: {
          id: resp.id,
          email: resp.email,
          is_active: resp.is_active,
          role_id: resp.role_id,
          teacher_status: resp.teacher_status,
        },
      })
      return { success: true, user: currentUser.value ?? undefined }
    } catch (error) {
      console.error('Teacher registration error:', error)
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
        teacher_status: profile.teacher_status,
        teacher_organization: profile.teacher_organization,
        teacher_reject_reason: profile.teacher_reject_reason,
      })
      return profile
    } catch (error) {
      console.error('Fetch profile error:', error)
      clearTokens()
      return null
    }
  }

  /**
   * Re-read the account (role, teacher approval…) without ever signing the user out:
   * unlike fetchUserProfile, a network hiccup or a 5xx just keeps the current session.
   * Real auth failures are already handled by apiRequest (refresh, then redirect to login).
   */
  const refreshProfile = async (): Promise<void> => {
    if (!getAccessToken()) return
    try {
      const profile = await api.getProfile()
      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        is_active: profile.is_active,
        role_id: profile.role_id,
        teacher_status: profile.teacher_status,
        teacher_organization: profile.teacher_organization,
        teacher_reject_reason: profile.teacher_reject_reason,
      })
    } catch {
      /* keep the session as it is */
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
    canAccessTeacher,
    teacherStatus,
    isTeacherApproved,
    homePath,
    isAdmin,
    isStudent,
    userRole,
    // Actions
    // Google/Facebook OAuth lives in lib/supabase.ts + OAuthCallbackPage (the old
    // always-failing loginWithGoogle/registerWithGoogle stubs were removed).
    login,
    completeLogin,
    register,
    registerTeacher,
    resetPassword,
    logout,
    getRememberedEmail,
    getAccessToken,
    getRefreshToken,
    fetchUserProfile,
    refreshProfile,
    refreshAccessToken,
    setTokens,
    setUser,
    clearTokens,
  }
})
