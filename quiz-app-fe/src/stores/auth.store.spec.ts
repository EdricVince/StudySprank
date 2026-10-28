import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// In-memory cookie jar (jsdom drops `secure` cookies on http://localhost).
const jar = new Map<string, string>()
vi.mock('@/utils/cookies', () => ({
  setCookie: (k: string, v: string) => jar.set(k, v),
  getCookie: (k: string) => jar.get(k),
  removeCookie: (k: string) => jar.delete(k),
}))

vi.mock('@/utils/api', () => ({
  api: {
    login: vi.fn(),
    getProfile: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    registerTeacher: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}))

vi.mock('@/stores/progress.store', () => ({
  useProgressStore: () => ({
    fetchProgress: vi.fn(), fetchWeekly: vi.fn(), fetchLeaderboard: vi.fn(), $reset: vi.fn(),
  }),
}))

import { useAuthStore } from './auth.store'
import { api } from '@/utils/api'

const m = api as unknown as Record<'login' | 'getProfile' | 'refreshToken' | 'logout' | 'registerTeacher', ReturnType<typeof vi.fn>>

describe('auth.store — refresh tokens', () => {
  beforeEach(() => {
    jar.clear()
    localStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('stores both the access and the refresh token on login', async () => {
    m.login.mockResolvedValue({ access_token: 'A1', refresh_token: 'R1', user: { id: 1, email: 'a@b.c', is_active: true, role_id: 1 } })
    m.getProfile.mockRejectedValue(new Error('skip'))
    const store = useAuthStore()

    await store.login('a@b.c', 'pw')

    expect(store.getAccessToken()).toBe('A1')
    expect(store.getRefreshToken()).toBe('R1')
  })

  it('rotates: saves the new refresh token returned by /auth/refresh', async () => {
    jar.set('refresh_token', 'R1')
    m.refreshToken.mockResolvedValue({ access_token: 'A2', refresh_token: 'R2' })
    const store = useAuthStore()

    await expect(store.refreshAccessToken()).resolves.toBe(true)
    expect(m.refreshToken).toHaveBeenCalledWith('R1')
    expect(store.getAccessToken()).toBe('A2')
    expect(store.getRefreshToken()).toBe('R2')
  })

  it('shares one refresh call between concurrent 401s (single-use tokens)', async () => {
    jar.set('refresh_token', 'R1')
    m.refreshToken.mockResolvedValue({ access_token: 'A2', refresh_token: 'R2' })
    const store = useAuthStore()

    const results = await Promise.all([store.refreshAccessToken(), store.refreshAccessToken(), store.refreshAccessToken()])
    expect(results).toEqual([true, true, true])
    expect(m.refreshToken).toHaveBeenCalledTimes(1)
  })

  it('clears the session when the refresh is rejected', async () => {
    jar.set('refresh_token', 'R1')
    jar.set('access_token', 'A1')
    m.refreshToken.mockRejectedValue(new Error('reuse detected'))
    const store = useAuthStore()

    await expect(store.refreshAccessToken()).resolves.toBe(false)
    expect(store.getRefreshToken()).toBeUndefined()
    expect(store.isAuthenticated).toBe(false)
  })

  it('logout revokes the refresh token on the server', () => {
    jar.set('refresh_token', 'R1')
    m.logout.mockResolvedValue({})
    const store = useAuthStore()

    store.logout()
    expect(m.logout).toHaveBeenCalledWith('R1')
    expect(store.getRefreshToken()).toBeUndefined()
  })
})

describe('auth.store — one portal for teachers and admins', () => {
  beforeEach(() => {
    jar.clear()
    localStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  const as = (role_id: number, teacher_status?: 'none' | 'pending' | 'approved' | 'rejected') => {
    const store = useAuthStore()
    store.setUser({ id: 1, email: 'u@x.y', role_id, teacher_status })
    return store
  }

  it('sends every role to its own home', () => {
    expect(as(1).homePath).toBe('/dashboard')
    expect(as(2, 'approved').homePath).toBe('/teacher/dashboard')
    expect(as(2, 'pending').homePath).toBe('/teacher/pending')
    expect(as(2, 'rejected').homePath).toBe('/teacher/pending')
    expect(as(3).homePath).toBe('/teacher/admin/overview')
  })

  it('only an approved teacher counts as approved; teachers and admins share the portal', () => {
    expect(as(2, 'pending').isTeacherApproved).toBe(false)
    expect(as(2, 'approved').isTeacherApproved).toBe(true)
    expect(as(3).isTeacherApproved).toBe(false)
    expect(as(1).canAccessTeacher).toBe(false)
    expect(as(2, 'pending').canAccessTeacher).toBe(true)
    expect(as(3).canAccessTeacher).toBe(true)
  })

  it('registerTeacher signs the applicant in as pending', async () => {
    m.registerTeacher.mockResolvedValue({
      id: 9, email: 't@school.edu', is_active: true, role_id: 2, teacher_status: 'pending',
      access_token: 'A', refresh_token: 'R',
    })
    m.getProfile.mockResolvedValue({ id: 9, email: 't@school.edu', role_id: 2, teacher_status: 'pending', teacher_organization: 'School' })
    const store = useAuthStore()
    const res = await store.registerTeacher({
      email: 't@school.edu', password: 'longenough', name: 'T', organization: 'School', teacher_card_image: 'data:image/png;base64,AA==',
    })
    expect(res.success).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.teacherStatus).toBe('pending')
    expect(store.homePath).toBe('/teacher/pending')
  })
})
