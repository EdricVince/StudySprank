import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdminStore } from './admin.store'

describe('admin.store — admin key storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { total: 1 } }) })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the admin key in sessionStorage (cleared with the tab), never in localStorage', async () => {
    localStorage.setItem('admin_key', 'legacy-key') // left behind by an older build
    const store = useAdminStore()

    expect(await store.login('secret')).toBe(true)
    expect(sessionStorage.getItem('admin_key')).toBe('secret')
    expect(localStorage.getItem('admin_key')).toBeNull()
  })

  it('logout removes the key everywhere', async () => {
    const store = useAdminStore()
    await store.login('secret')
    store.logout()
    expect(sessionStorage.getItem('admin_key')).toBeNull()
    expect(localStorage.getItem('admin_key')).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
