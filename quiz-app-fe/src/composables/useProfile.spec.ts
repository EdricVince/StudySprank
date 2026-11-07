import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

vi.mock('@/stores/progress.store', () => ({
  useProgressStore: () => ({
    xp: 0, level: 1, xpToNextLevel: 100, streakCount: 0, longestStreak: 0,
    totalCardsStudied: 0, totalQuizzesCompleted: 0, todayCards: 0, weeklyActivity: [],
  }),
}))

vi.mock('@/utils/api', () => ({
  api: {
    getProfile: vi.fn(),
    getAccountProfile: vi.fn(),
    updateProfile: vi.fn(),
    updateAccountProfile: vi.fn(),
  },
}))

import { useProfile } from './useProfile'
import { api } from '@/utils/api'

const getProfile = api.getProfile as unknown as ReturnType<typeof vi.fn>
const getCard = api.getAccountProfile as unknown as ReturnType<typeof vi.fn>
const updateName = api.updateProfile as unknown as ReturnType<typeof vi.fn>
const updateCard = api.updateAccountProfile as unknown as ReturnType<typeof vi.fn>

const card = (over: Record<string, unknown> = {}) => ({
  username: '', phone: '', title: '', location: '', bio: '', social_links: [], preferences: {}, ...over,
})

function mountProfile() {
  let profile!: ReturnType<typeof useProfile>
  mount(defineComponent({ setup() { profile = useProfile(); return () => null } }), { global: { plugins: [createPinia()] } })
  return profile
}

describe('useProfile — the profile card is saved on the server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProfile.mockResolvedValue({ id: 1, email: 'an@x.com', name: 'An', is_active: true, role_id: 1 })
    getCard.mockResolvedValue(card())
    updateName.mockResolvedValue({})
    updateCard.mockImplementation((body: Record<string, unknown>) => Promise.resolve(card(body)))
  })

  it('shows what the server stores: handle, phone, location, bio and social links', async () => {
    getCard.mockResolvedValue(card({
      username: 'vinh', phone: '0900', title: 'Student', location: 'Hanoi', bio: 'Learning English',
      social_links: [{ platform: 'GitHub', url: 'https://github.com/vinh' }],
    }))
    const p = mountProfile()
    await flushPromises()

    expect(p.profile).toMatchObject({
      username: 'vinh', phone: '0900', title: 'Student', location: 'Hanoi', bio: 'Learning English',
      socialLinks: [{ platform: 'GitHub', url: 'https://github.com/vinh' }],
    })
  })

  it('saves every field of the card (not only the name) and shows it only once the server has it', async () => {
    const p = mountProfile()
    await flushPromises()
    p.startEditing()
    Object.assign(p.editForm, { fullName: 'Vinh', username: 'vinh', phone: '0900', title: 'Student', location: 'Hanoi', bio: 'Hello' })
    await p.saveProfile()

    expect(updateName).toHaveBeenCalledWith({ name: 'Vinh' })
    expect(updateCard).toHaveBeenCalledWith({ username: 'vinh', phone: '0900', title: 'Student', location: 'Hanoi', bio: 'Hello' })
    expect(p.profile).toMatchObject({ phone: '0900', bio: 'Hello' })
    expect(p.isEditing.value).toBe(false)
    expect(toast.success).toHaveBeenCalledWith('profile.toast.saved')
  })

  it('keeps the edit form open and shows an error when the server refuses', async () => {
    const p = mountProfile()
    await flushPromises()
    p.startEditing()
    p.editForm.bio = 'Changed'
    updateCard.mockRejectedValueOnce(new Error('offline'))
    await p.saveProfile()

    expect(p.isEditing.value).toBe(true)
    expect(p.profile.bio).not.toBe('Changed')
    expect(toast.error).toHaveBeenCalledWith('profile.toast.saveFailed')
  })

  it('adds a social link on the server, with https:// added when it is missing', async () => {
    const p = mountProfile()
    await flushPromises()
    p.addSocialLink()
    Object.assign(p.socialForm, { platform: ' GitHub ', url: 'github.com/vinh' })
    await p.saveSocialLink()

    expect(updateCard).toHaveBeenCalledWith({ social_links: [{ platform: 'GitHub', url: 'https://github.com/vinh' }] })
    expect(p.profile.socialLinks).toEqual([{ platform: 'GitHub', url: 'https://github.com/vinh' }])
    expect(p.showSocialModal.value).toBe(false)
  })

  it('refuses a link with an empty field without calling the server', async () => {
    const p = mountProfile()
    await flushPromises()
    p.addSocialLink()
    Object.assign(p.socialForm, { platform: 'GitHub', url: '  ' })
    await p.saveSocialLink()

    expect(updateCard).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('profile.toast.socialFillAll')
  })

  it('edits and removes links on the server, keeping the others', async () => {
    getCard.mockResolvedValue(card({
      social_links: [
        { platform: 'GitHub', url: 'https://github.com/a' },
        { platform: 'X', url: 'https://x.com/a' },
      ],
    }))
    const p = mountProfile()
    await flushPromises()

    p.editSocialLink(1)
    Object.assign(p.socialForm, { platform: 'X', url: 'https://x.com/b' })
    await p.saveSocialLink()
    expect(updateCard).toHaveBeenLastCalledWith({
      social_links: [
        { platform: 'GitHub', url: 'https://github.com/a' },
        { platform: 'X', url: 'https://x.com/b' },
      ],
    })

    await p.removeSocialLink(0)
    expect(updateCard).toHaveBeenLastCalledWith({ social_links: [{ platform: 'X', url: 'https://x.com/b' }] })
  })

  it('leaves the links as they were when the server cannot save them', async () => {
    getCard.mockResolvedValue(card({ social_links: [{ platform: 'GitHub', url: 'https://github.com/a' }] }))
    const p = mountProfile()
    await flushPromises()
    updateCard.mockRejectedValueOnce(new Error('offline'))
    await p.removeSocialLink(0)

    expect(p.profile.socialLinks).toHaveLength(1)
    expect(toast.error).toHaveBeenCalledWith('profile.toast.socialFailed')
  })
})
