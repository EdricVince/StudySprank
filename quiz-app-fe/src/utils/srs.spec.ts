import { describe, it, expect } from 'vitest'
import { QUALITY_KNOWN, QUALITY_UNKNOWN, describeDueReason } from './srs'

const NOW = new Date('2026-03-10T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

describe('srs helpers', () => {
  it('maps Known/Unknown onto passing and failing SM-2 qualities', () => {
    expect(QUALITY_KNOWN).toBeGreaterThanOrEqual(3)
    expect(QUALITY_UNKNOWN).toBeLessThan(3)
  })

  it('explains new cards', () => {
    expect(describeDueReason({ reason: 'new', due_at: null, interval_days: 0, last_quality: null }, NOW)).toMatch(/New card/)
  })

  it('explains a missed card that comes back sooner', () => {
    const msg = describeDueReason({ reason: 'due', due_at: daysAgo(2), interval_days: 1, last_quality: 1 }, NOW)
    expect(msg).toMatch(/missed this card/)
    expect(msg).toMatch(/2 days overdue/)
  })

  it('explains a scheduled review after a gap', () => {
    const msg = describeDueReason({ reason: 'due', due_at: daysAgo(0), interval_days: 6, last_quality: 4 }, NOW)
    expect(msg).toBe('Scheduled review after a 6-day gap (due today).')
  })
})
