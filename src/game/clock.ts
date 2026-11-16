import { DAY_START, GAME_HOUR_MS, NIGHT_START } from './constants';
import type { Phase } from './types';

/** Game time in hours (0–24, fractional). Derived from wall-clock time, so it needs no saved state. */
export function gameHour(nowMs: number): number {
  return (nowMs / GAME_HOUR_MS) % 24;
}

export function phaseAt(nowMs: number): Phase {
  const h = gameHour(nowMs);
  return h >= DAY_START && h < NIGHT_START ? 'day' : 'night';
}

/** Real seconds until the phase flips. */
export function secondsToNextPhase(nowMs: number): number {
  const h = gameHour(nowMs);
  const next = h < DAY_START ? DAY_START : h < NIGHT_START ? NIGHT_START : DAY_START + 24;
  return ((next - h) * GAME_HOUR_MS) / 1000;
}

export function clockLabel(nowMs: number): string {
  const h = gameHour(nowMs);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
