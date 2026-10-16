import type { DueCardData } from '@/types/content'

// The study page has two answer buttons; they map onto SM-2's 0–5 quality scale.
export const QUALITY_KNOWN = 4 // correct recall with some effort
export const QUALITY_UNKNOWN = 1 // failed recall → the card restarts and returns tomorrow

const DAY_MS = 24 * 60 * 60 * 1000

/** Short, learner-facing reason why the scheduler is showing this card again. */
export function describeDueReason(card: Pick<DueCardData, 'reason' | 'due_at' | 'interval_days' | 'last_quality'>, now: Date = new Date()): string {
  if (card.reason === 'new') return 'New card — you have not reviewed it yet.'
  const overdueDays = card.due_at ? Math.floor((now.getTime() - new Date(card.due_at).getTime()) / DAY_MS) : 0
  const when = overdueDays >= 1 ? `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue` : 'due today'
  if (card.last_quality !== null && card.last_quality < 3) {
    return `You missed this card last time, so it comes back sooner (${when}).`
  }
  return `Scheduled review after a ${card.interval_days}-day gap (${when}).`
}
