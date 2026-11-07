import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
vi.mock('@/composables/useTheme', () => ({ useTheme: () => ({ setTheme: vi.fn() }) }))

const auth = vi.hoisted(() => ({
  user: { id: 1, email: 'an@x.com', name: 'An' } as { id: number; email: string; name: string } | null,
  setUser: vi.fn(),
  setTokens: vi.fn(),
  logout: vi.fn(),
}))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => auth }))

vi.mock('@/utils/api', () => ({
  api: {
    getAccountProfile: vi.fn(),
    updateAccountProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
    exportAccountData: vi.fn(),
  },
}))

import { useSettings } from './useSettings'
import { api } from '@/utils/api'

const get = api.getAccountProfile as unknown as ReturnType<typeof vi.fn>
const update = api.updateAccountProfile as unknown as ReturnType<typeof vi.fn>
const updateName = api.updateProfile as unknown as ReturnType<typeof vi.fn>
const changePw = api.changePassword as unknown as ReturnType<typeof vi.fn>
const del = api.deleteAccount as unknown as ReturnType<typeof vi.fn>
const exportData = api.exportAccountData as unknown as ReturnType<typeof vi.fn>

const serverProfile = (over: Record<string, unknown> = {}) => ({
  username: '', phone: '', title: '', location: '', bio: '', social_links: [], preferences: {}, ...over,
})

function mountSettings() {
  let settings!: ReturnType<typeof useSettings>
  const wrapper = mount(defineComponent({ setup() { settings = useSettings(); return () => null } }))
  return { settings, wrapper }
}

describe('useSettings — saved on the server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = { id: 1, email: 'an@x.com', name: 'An' }
    get.mockResolvedValue(serverProfile())
    update.mockResolvedValue(serverProfile())
    updateName.mockResolvedValue({})
  })
  afterEach(() => vi.useRealTimers())

  it('shows the settings stored on the server and does not save them back just for loading', async () => {
    get.mockResolvedValue(serverProfile({
      username: 'vinh',
      preferences: {
        study: { cardsPerDay: 60 },
        notifications: { weeklyReport: true, reminderTime: '07:15' },
        privacy: { showStreak: false },
      },
    }))
    const { settings } = mountSettings()
    await flushPromises()

    expect(settings.accountSettings.username).toBe('vinh')
    expect(settings.studySettings).toEqual({ cardsPerDay: 60, studyMinutes: 20 }) // the rest keeps its default
    expect(settings.notificationSettings.weeklyReport).toBe(true)
    expect(settings.notificationSettings.reminderTime).toBe('07:15')
    expect(settings.privacySettings.showStreak).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('saves a changed setting once, shortly after the last change', async () => {
    const { settings } = mountSettings()
    await flushPromises()

    vi.useFakeTimers()
    settings.toggleNotification('weeklyReport')
    settings.studySettings.cardsPerDay = 45
    await vi.advanceTimersByTimeAsync(300)
    expect(update).not.toHaveBeenCalled() // still waiting for more changes
    await vi.advanceTimersByTimeAsync(500)

    expect(update).toHaveBeenCalledTimes(1)
    const prefs = update.mock.calls[0]![0].preferences
    expect(prefs.notifications.weeklyReport).toBe(true)
    expect(prefs.study.cardsPerDay).toBe(45)
    expect(prefs.privacy.publicProfile).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('settings.toast.saved')
  })

  it('tells the learner when saving fails', async () => {
    const { settings } = mountSettings()
    await flushPromises()
    update.mockRejectedValueOnce(new Error('offline'))

    vi.useFakeTimers()
    settings.togglePrivacy('analytics')
    await vi.advanceTimersByTimeAsync(800)
    expect(toast.error).toHaveBeenCalledWith('settings.toast.saveFailed')
  })

  it('saves the name and the handle of the account', async () => {
    const { settings } = mountSettings()
    await flushPromises()
    settings.accountSettings.fullName = '  Vinh Hoang '
    settings.accountSettings.username = 'vinh'
    await settings.saveAccountSettings()

    expect(updateName).toHaveBeenCalledWith({ name: 'Vinh Hoang' })
    expect(update).toHaveBeenCalledWith({ username: 'vinh' })
    expect(auth.setUser).toHaveBeenCalledWith(expect.objectContaining({ name: 'Vinh Hoang' }))
    expect(toast.success).toHaveBeenCalledWith('settings.toast.accountSaved')
  })
})

describe('useSettings — password, export and deleting the account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = { id: 1, email: 'an@x.com', name: 'An' }
    get.mockResolvedValue(serverProfile())
  })

  it('does not call the server when the two new passwords differ or are too short', async () => {
    const { settings } = mountSettings()
    await flushPromises()
    Object.assign(settings.passwordForm, { current: 'old-password', new: 'new-password-1', confirm: 'different' })
    expect(await settings.changePassword()).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('settings.toast.passwordMismatch')

    Object.assign(settings.passwordForm, { new: 'short', confirm: 'short' })
    expect(await settings.changePassword()).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('settings.toast.passwordShort')
    expect(changePw).not.toHaveBeenCalled()
  })

  it('changes the password, keeps this device signed in with the new tokens and clears the form', async () => {
    changePw.mockResolvedValue({ access_token: 'new-a', refresh_token: 'new-r' })
    const { settings } = mountSettings()
    await flushPromises()
    Object.assign(settings.passwordForm, { current: 'old-password', new: 'new-password-1', confirm: 'new-password-1' })

    expect(await settings.changePassword()).toBe(true)
    expect(changePw).toHaveBeenCalledWith('old-password', 'new-password-1')
    expect(auth.setTokens).toHaveBeenCalledWith('new-a', 'new-r')
    expect(settings.passwordForm).toEqual({ current: '', new: '', confirm: '' })
  })

  it('keeps the form and shows the server’s reason when the password change is refused', async () => {
    changePw.mockRejectedValue({ errorMessage: 'Current password is incorrect' })
    const { settings } = mountSettings()
    await flushPromises()
    Object.assign(settings.passwordForm, { current: 'wrong', new: 'new-password-1', confirm: 'new-password-1' })

    expect(await settings.changePassword()).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Current password is incorrect')
    expect(settings.passwordForm.new).toBe('new-password-1')
    expect(auth.setTokens).not.toHaveBeenCalled()
  })

  it('exports the data held on the server', async () => {
    exportData.mockResolvedValue({ account: { email: 'an@x.com' } })
    const createUrl = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() })
    const { settings } = mountSettings()
    await flushPromises()
    await settings.exportUserData()

    expect(exportData).toHaveBeenCalled()
    expect(createUrl).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('settings.toast.exported')
  })

  it('does not sign out or leave the page when the password is wrong (the modal shows why)', async () => {
    del.mockRejectedValue({ status: 400 })
    const { settings } = mountSettings()
    await flushPromises()
    settings.showDeleteConfirm.value = true
    await settings.deleteAccount('nope')

    expect(settings.deleteError.value).toBe('settings.deleteModal.wrongPassword')
    expect(settings.showDeleteConfirm.value).toBe(true)
    expect(auth.logout).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(settings.deleting.value).toBe(false)
  })

  it('deletes the account with the password, then signs out and goes to the login page', async () => {
    del.mockResolvedValue(null)
    const { settings } = mountSettings()
    await flushPromises()
    settings.showDeleteConfirm.value = true
    await settings.deleteAccount('right-password')

    expect(del).toHaveBeenCalledWith('right-password')
    expect(auth.logout).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/login')
    expect(settings.showDeleteConfirm.value).toBe(false)
  })
})
