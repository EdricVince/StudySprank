import { applySm2, cardKeyOf, SM2_DEFAULT_EASE, SM2_MIN_EASE } from './sm2';

const NOW = new Date('2026-01-01T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('applySm2 — simplified SM-2 scheduler', () => {
  it('schedules a brand-new card 1 day out on a correct answer', () => {
    const r = applySm2(null, 4, NOW);
    expect(r.repetitions).toBe(1);
    expect(r.interval_days).toBe(1);
    expect(r.due_at.getTime()).toBe(NOW.getTime() + DAY);
    expect(r.ease_factor).toBe(SM2_DEFAULT_EASE); // q=4 keeps EF unchanged
  });

  it('grows the interval 1 → 6 → round(6 × EF) on consecutive good answers', () => {
    const first = applySm2(null, 5, NOW);
    const second = applySm2(first, 5, NOW);
    const third = applySm2(second, 5, NOW);
    expect([first.interval_days, second.interval_days]).toEqual([1, 6]);
    expect(third.interval_days).toBe(Math.round(6 * second.ease_factor));
    expect(third.interval_days).toBeGreaterThan(second.interval_days);
    expect(third.ease_factor).toBeGreaterThan(SM2_DEFAULT_EASE); // q=5 raises EF
  });

  it('resets repetitions and interval when quality is low (< 3)', () => {
    const learned = { ease_factor: 2.5, interval_days: 15, repetitions: 4 };
    const r = applySm2(learned, 1, NOW);
    expect(r.repetitions).toBe(0);
    expect(r.interval_days).toBe(1);
    expect(r.due_at.getTime()).toBe(NOW.getTime() + DAY);
    expect(r.ease_factor).toBeLessThan(2.5);
  });

  it('never lets the ease factor drop below 1.3', () => {
    let s = applySm2(null, 0, NOW);
    for (let i = 0; i < 10; i++) s = applySm2(s, 0, NOW);
    expect(s.ease_factor).toBe(SM2_MIN_EASE);
  });

  it('clamps out-of-range quality into 0–5', () => {
    expect(applySm2(null, 9, NOW)).toEqual(applySm2(null, 5, NOW));
    expect(applySm2(null, -3, NOW)).toEqual(applySm2(null, 0, NOW));
  });

  it('normalises card keys (trim + lower-case)', () => {
    expect(cardKeyOf('  Apple ')).toBe('apple');
  });
});
