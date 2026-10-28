import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { apiRequest } from '@/utils/api'
import type { ActivityItem } from '@/types/content'
import type { TeacherStatus } from '@/types/role'

// Admin endpoints use the same login as everyone else: the admin is a normal
// account (role 3), so requests carry the JWT via apiRequest (refresh included).
const admin = <T>(path: string, init: RequestInit = {}) => apiRequest<T>(`/admin${path}`, init)
const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

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
  teacher_status: TeacherStatus
  teacher_organization: string | null
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
  teacher_status: TeacherStatus
  teacher_organization: string | null
  teacher_reject_reason: string | null
  created_at: string
  xp: number
  level: number
  streak_count: number
  longest_streak: number
  total_cards_studied: number
  total_quizzes_completed: number
}

/** One teacher with their activity counts (same data as the teacher_overview DB view). */
export interface TeacherOverviewRow {
  id: number
  email: string
  name: string | null
  is_active: boolean
  teacher_status: TeacherStatus
  teacher_organization: string | null
  teacher_reviewed_at: string | null
  created_at: string
  classes: number
  students: number
  tests: number
  assignments: number
  lessons: number
  vocab_sets: number
  last_activity: string | null
}

export interface ActivityFilter {
  actor_id?: number
  class_id?: number
  action?: string
  before_id?: number
  limit?: number
}

export const ROLE_STUDENT = 1
export const ROLE_TEACHER = 2

export const useAdminStore = defineStore('admin', () => {
  const users = ref<AdminUser[]>([])
  const stats = ref<AdminStats | null>(null)
  const teacherOverview = ref<TeacherOverviewRow[]>([])
  const pendingTeachers = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const students = computed(() => users.value.filter(u => u.role_id === ROLE_STUDENT))
  const teachers = computed(() => users.value.filter(u => u.role_id === ROLE_TEACHER))

  async function fetchStats() {
    stats.value = await admin<AdminStats>('/stats')
  }

  async function fetchUsers() {
    loading.value = true
    try {
      users.value = await admin<AdminUser[]>('/users')
    } finally {
      loading.value = false
    }
  }

  async function setActive(userId: number, isActive: boolean) {
    const user = users.value.find(u => u.id === userId)
    const previous = user?.is_active
    if (user) user.is_active = isActive // optimistic
    try {
      await admin(`/users/${userId}/active`, { method: 'PATCH', ...json({ is_active: isActive }) })
      await fetchStats()
    } catch (e) {
      if (user && previous !== undefined) user.is_active = previous // revert
      throw e
    }
  }

  async function resetPassword(userId: number, newPassword: string) {
    await admin(`/users/${userId}/reset-password`, { method: 'PATCH', ...json({ new_password: newPassword }) })
  }

  async function deleteUser(userId: number) {
    await admin(`/users/${userId}`, { method: 'DELETE' })
    users.value = users.value.filter(u => u.id !== userId)
    await fetchStats()
  }

  async function bulkDeleteUsers(ids: number[]): Promise<number> {
    const data = await admin<{ deleted: number }>('/users/bulk-delete', { method: 'POST', ...json({ ids }) })
    users.value = users.value.filter(u => !ids.includes(u.id))
    await fetchStats()
    return data.deleted
  }

  async function getUserProfile(userId: number): Promise<AdminUserProfile> {
    return admin<AdminUserProfile>(`/users/${userId}/profile`)
  }

  async function createTeacher(name: string, password: string, email?: string, teacherCardImage?: string): Promise<string> {
    const data = await admin<{ email: string }>('/create-teacher', {
      method: 'POST',
      ...json({
        name, password,
        ...(email ? { email } : {}),
        ...(teacherCardImage ? { teacher_card_image: teacherCardImage } : {}),
      }),
    })
    await Promise.all([fetchUsers(), fetchStats()])
    return data.email
  }

  async function getTeacherCard(userId: number): Promise<string | null> {
    const data = await admin<{ teacher_card_image: string | null }>(`/users/${userId}/teacher-card`)
    return data.teacher_card_image
  }

  /** Approve / reject (reason required) / re-open a teacher application. */
  async function reviewTeacher(userId: number, status: Exclude<TeacherStatus, 'none'>, reason?: string): Promise<void> {
    await admin(`/users/${userId}/teacher-status`, {
      method: 'PATCH',
      ...json({ status, ...(reason ? { reason } : {}) }),
    })
    const row = teacherOverview.value.find(t => t.id === userId)
    if (row) row.teacher_status = status
    const user = users.value.find(u => u.id === userId)
    if (user) { user.teacher_status = status; user.is_verified = status === 'approved' }
    pendingTeachers.value = teacherOverview.value.filter(t => t.teacher_status === 'pending').length
  }

  async function fetchTeacherOverview(): Promise<void> {
    teacherOverview.value = await admin<TeacherOverviewRow[]>('/teachers/overview')
    pendingTeachers.value = teacherOverview.value.filter(t => t.teacher_status === 'pending').length
  }

  /** Cheap badge refresh for the sidebar; a failure just leaves the old count. */
  async function fetchPendingTeachers(): Promise<void> {
    try { await fetchTeacherOverview() } catch { /* non-critical */ }
  }

  async function fetchActivity(filter: ActivityFilter = {}): Promise<ActivityItem[]> {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(filter)) if (v !== undefined && v !== '') qs.set(k, String(v))
    const query = qs.toString()
    return admin<ActivityItem[]>(`/activity${query ? `?${query}` : ''}`)
  }

  async function fetchAiStatus(): Promise<{
    enabled: boolean; provider: string; model: string; key_preview: string | null;
    features: { name: string; key: string }[];
  }> {
    return admin('/ai/status')
  }

  async function setAiKey(key: string): Promise<void> {
    await admin('/ai/key', { method: 'POST', ...json({ key }) })
  }

  async function removeAiKey(): Promise<void> {
    await admin('/ai/key', { method: 'DELETE' })
  }

  return {
    users, stats, teacherOverview, pendingTeachers, loading, error,
    students, teachers,
    fetchStats, fetchUsers,
    setActive, resetPassword, deleteUser, bulkDeleteUsers, getUserProfile, createTeacher,
    getTeacherCard, reviewTeacher, fetchTeacherOverview, fetchPendingTeachers,
    fetchActivity,
    fetchAiStatus, setAiKey, removeAiKey,
  }
})
