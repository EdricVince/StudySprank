import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { API_BASE_URL } from '@/lib/apiBase'

const ADMIN_API = `${API_BASE_URL}/admin`

export interface AdminUser {
  id: number
  email: string
  name: string | null
  role_id: number
  is_active: boolean
  created_at: string
  xp: number
  is_verified: boolean
  has_teacher_card: boolean
}

export interface AdminStats {
  total: number
  students: number
  teachers: number
  active: number
  newThisWeek: number
}

export interface AdminUserProfile {
  id: number
  email: string
  name: string | null
  avatar: string | null
  role_id: number
  is_active: boolean
  is_verified: boolean
  has_teacher_card: boolean
  created_at: string
  xp: number
  level: number
  streak_count: number
  longest_streak: number
  total_cards_studied: number
  total_quizzes_completed: number
}

export const ROLE_STUDENT = 1
export const ROLE_TEACHER = 2

export const useAdminStore = defineStore('admin', () => {
  const adminKey = ref<string>(sessionStorage.getItem('admin_key') ?? '')
  const isAuthenticated = ref(false)
  const users = ref<AdminUser[]>([])
  const stats = ref<AdminStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const headers = computed((): Record<string, string> => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey.value,
  }))

  const students = computed(() => users.value.filter(u => u.role_id === ROLE_STUDENT))
  const teachers = computed(() => users.value.filter(u => u.role_id === ROLE_TEACHER))

  async function login(key: string): Promise<boolean> {
    try {
      const res = await fetch(`${ADMIN_API}/stats`, {
        headers: { 'x-admin-key': key },
      })
      if (res.ok) {
        adminKey.value = key
        isAuthenticated.value = true
        // sessionStorage: the admin secret is forgotten when the tab closes
        // (it used to persist in localStorage indefinitely).
        sessionStorage.setItem('admin_key', key)
        localStorage.removeItem('admin_key') // clean up keys stored by older builds
        const data = await res.json()
        stats.value = data.data
        return true
      }
      return false
    } catch {
      return false
    }
  }

  async function tryRestoreSession(): Promise<boolean> {
    const stored = sessionStorage.getItem('admin_key')
    if (!stored) return false
    const ok = await login(stored)
    if (!ok) sessionStorage.removeItem('admin_key')
    return ok
  }

  function logout() {
    adminKey.value = ''
    isAuthenticated.value = false
    sessionStorage.removeItem('admin_key')
    localStorage.removeItem('admin_key')
    users.value = []
    stats.value = null
  }

  async function fetchStats() {
    const res = await fetch(`${ADMIN_API}/stats`, { headers: headers.value })
    if (!res.ok) { isAuthenticated.value = false; throw new Error('Unauthorized') }
    const data = await res.json()
    stats.value = data.data
  }

  async function fetchUsers() {
    loading.value = true
    try {
      const res = await fetch(`${ADMIN_API}/users`, { headers: headers.value })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      users.value = data.data
    } finally {
      loading.value = false
    }
  }

  async function setActive(userId: number, isActive: boolean) {
    const user = users.value.find(u => u.id === userId)
    const previous = user?.is_active
    if (user) user.is_active = isActive // optimistic
    try {
      const res = await fetch(`${ADMIN_API}/users/${userId}/active`, {
        method: 'PATCH',
        headers: headers.value,
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      await fetchStats()
    } catch (e) {
      if (user && previous !== undefined) user.is_active = previous // revert
      throw e
    }
  }

  async function resetPassword(userId: number, newPassword: string) {
    const res = await fetch(`${ADMIN_API}/users/${userId}/reset-password`, {
      method: 'PATCH',
      headers: headers.value,
      body: JSON.stringify({ new_password: newPassword }),
    })
    if (!res.ok) throw new Error('Failed to reset password')
  }

  async function deleteUser(userId: number) {
    const res = await fetch(`${ADMIN_API}/users/${userId}`, {
      method: 'DELETE',
      headers: headers.value,
    })
    if (!res.ok) throw new Error('Failed to delete user')
    users.value = users.value.filter(u => u.id !== userId)
    await fetchStats()
  }

  async function bulkDeleteUsers(ids: number[]): Promise<number> {
    const res = await fetch(`${ADMIN_API}/users/bulk-delete`, {
      method: 'POST',
      headers: headers.value,
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) throw new Error('Failed to delete selected users')
    const data = await res.json()
    users.value = users.value.filter(u => !ids.includes(u.id))
    await fetchStats()
    return data.data.deleted as number
  }

  async function getUserProfile(userId: number): Promise<AdminUserProfile> {
    const res = await fetch(`${ADMIN_API}/users/${userId}/profile`, { headers: headers.value })
    if (!res.ok) throw new Error('Failed to load user profile')
    const data = await res.json()
    return data.data as AdminUserProfile
  }

  async function createTeacher(name: string, password: string, email?: string, teacherCardImage?: string): Promise<string> {
    const res = await fetch(`${ADMIN_API}/create-teacher`, {
      method: 'POST',
      headers: headers.value,
      body: JSON.stringify({
        name, password,
        ...(email ? { email } : {}),
        ...(teacherCardImage ? { teacher_card_image: teacherCardImage } : {}),
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create teacher' }))
      throw new Error((Array.isArray(err.message) ? err.message[0] : err.message) ?? 'Failed to create teacher')
    }
    const data = await res.json()
    await fetchUsers()
    await fetchStats()
    return data.data.email as string
  }

  async function getTeacherCard(userId: number): Promise<string | null> {
    const res = await fetch(`${ADMIN_API}/users/${userId}/teacher-card`, { headers: headers.value })
    if (!res.ok) throw new Error('Failed to load teacher card')
    const data = await res.json()
    return data.data.teacher_card_image as string | null
  }

  async function setVerified(userId: number, verified: boolean): Promise<void> {
    const user = users.value.find(u => u.id === userId)
    const previous = user?.is_verified
    if (user) user.is_verified = verified // optimistic
    try {
      const res = await fetch(`${ADMIN_API}/users/${userId}/verify`, {
        method: 'PATCH',
        headers: headers.value,
        body: JSON.stringify({ verified }),
      })
      if (!res.ok) throw new Error('Failed to update verification')
    } catch (e) {
      if (user && previous !== undefined) user.is_verified = previous // revert
      throw e
    }
  }

  async function fetchAiStatus(): Promise<{
    enabled: boolean; provider: string; key_preview: string | null;
    features: { name: string; key: string }[];
  }> {
    const res = await fetch(`${ADMIN_API}/ai/status`, { headers: headers.value })
    if (!res.ok) throw new Error('Failed to fetch AI status')
    const data = await res.json()
    return data.data
  }

  async function setAiKey(key: string): Promise<string> {
    const res = await fetch(`${ADMIN_API}/ai/key`, {
      method: 'POST',
      headers: headers.value,
      body: JSON.stringify({ key }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? 'Failed to set AI key')
    return data.message as string
  }

  async function removeAiKey(): Promise<void> {
    const res = await fetch(`${ADMIN_API}/ai/key`, {
      method: 'DELETE',
      headers: headers.value,
    })
    if (!res.ok) throw new Error('Failed to remove AI key')
  }

  return {
    adminKey, isAuthenticated, users, stats, loading, error,
    students, teachers,
    login, tryRestoreSession, logout,
    fetchStats, fetchUsers,
    setActive, resetPassword, deleteUser, bulkDeleteUsers, getUserProfile, createTeacher,
    getTeacherCard, setVerified,
    fetchAiStatus, setAiKey, removeAiKey,
  }
})
