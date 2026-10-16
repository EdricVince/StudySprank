/**
 * Simplified SM-2 spaced-repetition scheduler (SuperMemo 2, Wozniak 1987).
 *
 * quality 0–5:  < 3 = failed recall → the card restarts (repetitions 0, due tomorrow);
 *              >= 3 = recalled → interval grows 1 day → 6 days → previous × ease factor.
 * The ease factor moves with every answer (never below 1.3), so hard cards come
 * back more often than easy ones.
 */
export interface Sm2State {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  due_at: Date;
}

export const SM2_DEFAULT_EASE = 2.5;
export const SM2_MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function applySm2(
  prev: Sm2State | null,
  quality: number,
  now: Date = new Date(),
): Sm2Result {
  const q = Math.min(5, Math.max(0, Math.round(quality)));
  const state: Sm2State = prev ?? {
    ease_factor: SM2_DEFAULT_EASE,
    interval_days: 0,
    repetitions: 0,
  };

  let repetitions: number;
  let interval: number;
  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = state.repetitions + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else
      interval = Math.round(
        Math.max(1, state.interval_days) * state.ease_factor,
      );
  }

  const ease = state.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const ease_factor = Math.max(SM2_MIN_EASE, Math.round(ease * 100) / 100);

  return {
    ease_factor,
    interval_days: interval,
    repetitions,
    due_at: new Date(now.getTime() + interval * DAY_MS),
  };
}

/** Stable key for a card inside a deck (decks store cards as a jsonb array with no ids). */
export function cardKeyOf(term: string): string {
  return term.trim().toLowerCase().slice(0, 255);
}
