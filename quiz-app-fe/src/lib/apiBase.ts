// Single source of truth for where the backend lives (baked in at build time).

/** REST base, e.g. https://api.example.com/api/v1 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

/** Server origin without the /api/v1 suffix — used for Socket.IO connections. */
export const API_ORIGIN: string = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
