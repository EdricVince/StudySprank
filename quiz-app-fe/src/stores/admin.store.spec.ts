import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/utils/api', () => ({ apiRequest: vi.fn() }))

import { useAdminStore } from './admin.store'
import { apiRequest } from '@/utils/api'

const call = apiRequest as unknown as ReturnType<typeof vi.fn>

const teacher = (id: number, teacher_status: string) => ({
  id, email: `t${id}@school.edu`, name: null, is_active: true, teacher_status,
  teacher_organization: 'School', teacher_reviewed_at: null, created_at: '2026-01-01',
  classes: 0, students: 0, tests: 0, assignments: 0, lessons: 0, vocab_sets: 0, last_activity: null,
})

describe('admin.store — the admin is a normal signed-in account', () => {
  beforeEach(() => {
    call.mockReset()
    setActivePinia(createPinia())
  })

  it('calls the admin endpoints through the authenticated API client (no admin key)', async () => {
    call.mockResolvedValue({ total: 1 })
    const store = useAdminStore()
    await store.fetchStats()
    expect(call).toHaveBeenCalledWith('/admin/stats', {})
    expect(store.stats).toEqual({ total: 1 })
  })

  it('counts pending teacher applications for the sidebar badge', async () => {
    call.mockResolvedValue([teacher(1, 'pending'), teacher(2, 'approved'), teacher(3, 'pending')])
    const store = useAdminStore()
    await store.fetchTeacherOverview()
    expect(store.pendingTeachers).toBe(2)
  })

  it('reviewing a teacher sends the status + reason and updates the badge', async () => {
    call.mockResolvedValueOnce([teacher(1, 'pending'), teacher(2, 'pending')])
    const store = useAdminStore()
    await store.fetchTeacherOverview()

    call.mockResolvedValueOnce({ id: 1, teacher_status: 'rejected' })
    await store.reviewTeacher(1, 'rejected', 'Blurry photo')

    expect(call).toHaveBeenLastCalledWith('/admin/users/1/teacher-status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected', reason: 'Blurry photo' }),
    })
    expect(store.teacherOverview[0]?.teacher_status).toBe('rejected')
    expect(store.pendingTeachers).toBe(1)
  })

  it('builds the activity query string from the filters', async () => {
    call.mockResolvedValue([])
    const store = useAdminStore()
    await store.fetchActivity({ action: 'class', limit: 20, class_id: undefined })
    expect(call).toHaveBeenCalledWith('/admin/activity?action=class&limit=20', {})
  })
})
