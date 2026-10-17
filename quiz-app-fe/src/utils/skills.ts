// Shared helpers for the Reading / Listening / Writing / Speaking practice pages.

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

const BADGE: Record<string, string> = { A1: 'badge-a1', A2: 'badge-a2', B1: 'badge-b1', B2: 'badge-b2', C1: 'badge-c1', C2: 'badge-c2' }

/** Coloured chip for a CEFR level (falls back to a neutral chip). */
export function levelBadge(level: string): string {
  return BADGE[level] ?? 'chip'
}

/** Active style of a level filter button; '' is the "All" button, tinted with the page accent. */
export function levelFilterClass(level: string, accent: 'blue' | 'emerald'): string {
  return level ? `level-filter-${level.toLowerCase()}` : `level-filter-all-${accent}`
}

/** Seconds → "m:ss". */
export function fmtTime(secs: number): string {
  const s = Math.max(0, Math.round(secs))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Local "HH:MM" time stamp shown next to results. */
export function clockTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Best message from a failed API call, or the given fallback. */
export function errorText(e: unknown, fallback: string): string {
  const err = e as { errorMessage?: string; message?: string } | null
  return err?.errorMessage || err?.message || fallback
}
