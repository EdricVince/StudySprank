import type { DueCardData } from '@/types/content'
import i18n from '@/i18n'

// The study page has two answer buttons; they map onto SM-2's 0–5 quality scale.
export const QUALITY_KNOWN = 4 // correct recall with some effort
export const QUALITY_UNKNOWN = 1 // failed recall → the card restarts and returns tomorrow

const DAY_MS = 24 * 60 * 60 * 1000

/** Short, learner-facing reason (in the current UI language) why the scheduler is showing this card again. */
export function describeDueReason(card: Pick<DueCardData, 'reason' | 'due_at' | 'interval_days' | 'last_quality'>, now: Date = new Date()): string {
  const { t } = i18n.global
  if (card.reason === 'new') return t('flashcards.srs.new')
  const overdueDays = card.due_at ? Math.floor((now.getTime() - new Date(card.due_at).getTime()) / DAY_MS) : 0
  const when = overdueDays >= 1 ? t('flashcards.srs.overdue', overdueDays) : t('flashcards.srs.dueToday')
  if (card.last_quality !== null && card.last_quality < 3) return t('flashcards.srs.missed', { when })
  return t('flashcards.srs.scheduled', { n: card.interval_days, when })
}
