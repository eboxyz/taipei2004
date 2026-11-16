import { OFFLINE_SHAKEDOWN_CAP, SHAKEDOWN_MAX_S, SHAKEDOWN_MIN_S } from './constants';
import { incomePerSec, safeCapacity, safeHours } from './economy';
import { resolveShakedown, workManagers, type Rng } from './tick';
import type { GameEvent, GameState } from './types';

export interface AwaySummary {
  seconds: number;
  earned: number;
  /** True when the safe filled up before you came back. */
  safeFull: boolean;
  safeHours: number;
  repelled: number;
  bonus: number;
  /** Scratch cards left behind by repelled shakedowns. */
  scratch: number;
  levelUps: GameEvent[];
}

/**
 * Applies `seconds` of offline time in closed form: average day/night income,
 * capped by the safe, plus a batch of shakedowns. Offline income always goes to the safe.
 */
export function applyOffline(state: GameState, seconds: number, now: number, rng: Rng = Math.random): { state: GameState; summary: AwaySummary } {
  const rate = incomePerSec(state, 'average');
  const room = Math.max(0, safeCapacity(state) - state.safe);
  const earned = Math.min(room, rate * seconds);
  let s: GameState = {
    ...state,
    safe: state.safe + earned,
    lifetimeEarned: state.lifetimeEarned + earned,
    runEarned: state.runEarned + earned,
  };

  const levelUps: GameEvent[] = [];
  const worked = workManagers(s, seconds);
  s = worked.state;
  levelUps.push(...worked.events);

  const avg = (SHAKEDOWN_MIN_S + SHAKEDOWN_MAX_S) / 2;
  const attempts = Math.min(OFFLINE_SHAKEDOWN_CAP, Math.floor((seconds + (avg - s.shakedownIn)) / avg));
  let repelled = 0;
  let bonus = 0;
  let scratch = 0;
  for (let i = 0; i < attempts; i++) {
    const r = resolveShakedown(s, rng);
    s = r.state;
    for (const e of r.events) {
      if (e.kind === 'shakedown-repelled') {
        repelled += 1;
        bonus += e.bonus;
        if (e.scratch) scratch += 1;
      } else if (e.kind === 'level-up') levelUps.push(e);
    }
  }

  const shakedownIn = attempts > 0 ? avg : Math.max(1, s.shakedownIn - seconds);
  s = { ...s, shakedownIn, lastSeen: now };
  return {
    state: s,
    summary: {
      seconds,
      earned,
      safeFull: rate > 0 && earned >= room - 1e-6,
      safeHours: safeHours(s),
      repelled,
      bonus,
      scratch,
      levelUps,
    },
  };
}
