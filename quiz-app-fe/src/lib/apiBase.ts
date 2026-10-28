// Single source of truth for where the backend lives (baked in at build time).

/**
 * REST base, e.g. https://api.example.com/api/v1. Set VITE_API_BASE_URL at build time;
 * only the dev server falls back to a local backend, a production build never guesses.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000/api/v1' : '')

if (!API_BASE_URL) console.error('VITE_API_BASE_URL is not set: API requests will fail.')

/** Server origin without the /api/v1 suffix — used for Socket.IO connections. */
export const API_ORIGIN: string = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
