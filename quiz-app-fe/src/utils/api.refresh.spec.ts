import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// A fake auth store: the API client only needs these three methods.
const store = {
  token: 'old-access',
  getAccessToken: vi.fn(() => store.token),
  refreshAccessToken: vi.fn(),
  logout: vi.fn(),
}
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => store }))

import { apiRequest, ApiError } from './api'

const res = (status: number, body?: unknown) =>
  ({ status, text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)) }) as Response

describe('apiRequest — 401 handling with refresh token', () => {
  const fetchMock = vi.fn()
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    store.token = 'old-access'
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(window, 'location', { value: { href: '/dashboard' }, writable: true, configurable: true })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  })

  it('refreshes once and retries the request exactly once with the new access token', async () => {
    fetchMock
      .mockResolvedValueOnce(res(401, { code: 'UNAUTHORIZED', message: 'Token expired' }))
      .mockResolvedValueOnce(res(200, { code: 200, message: 'OK', data: { ok: true } }))
    store.refreshAccessToken.mockImplementation(async () => { store.token = 'new-access'; return true })

    await expect(apiRequest('/progress/me')).resolves.toEqual({ ok: true })

    expect(store.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const retryInit = fetchMock.mock.calls[1]?.[1] as RequestInit & { headers: Record<string, string> }
    expect(retryInit.headers.Authorization).toBe('Bearer new-access')
    expect(store.logout).not.toHaveBeenCalled()
  })

  it('does not loop: a second 401 after the retry is surfaced, no extra refresh', async () => {
    fetchMock.mockResolvedValue(res(401, { code: 'UNAUTHORIZED', message: 'Account is not active' }))
    store.refreshAccessToken.mockResolvedValue(true)

    await expect(apiRequest('/progress/me')).rejects.toMatchObject({ statusCode: 401 })
    expect(store.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('logs out and redirects to /login when the refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(res(401, { code: 'UNAUTHORIZED', message: 'Token expired' }))
    store.refreshAccessToken.mockResolvedValue(false)

    const err = (await apiRequest('/progress/me').catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.errorCode).toBe('SESSION_EXPIRED')
    expect(store.logout).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/login')
    expect(fetchMock).toHaveBeenCalledTimes(1) // no retry without a fresh token
  })
})
