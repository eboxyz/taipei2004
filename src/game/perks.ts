/**
 * Face upgrade levels and the numbers they change. Kept separate so economy, battle and draws can all use it.
 * Where this run's headline changes the same number (index growth, event rate), it's folded in here.
 */
import { news } from './headlines';
import type { GameState } from './types';

export function faceLevel(state: GameState, id: string): number {
  return state.meta.upgrades?.[id] ?? 0;
}

export const perk = {
  incomeMult: (s: GameState) => 1 + 0.25 * faceLevel(s, 'income'),
  lotDiscount: (s: GameState) => 0.05 * faceLevel(s, 'lot_price'),
  upgradeDiscount: (s: GameState) => 0.04 * faceLevel(s, 'upgrade_price'),
  startCash: (base: number, s: GameState) => base * Math.pow(10, faceLevel(s, 'seed')),
  oldTurfLots: (s: GameState) => 2 * faceLevel(s, 'old_turf'),
  safeHours: (s: GameState) => 2 * faceLevel(s, 'safe'),
  bookkeeper: (s: GameState) => faceLevel(s, 'bookkeeper') > 0,
  autoStaff: (s: GameState) => faceLevel(s, 'auto_staff') > 0,
  autoUpgrade: (s: GameState) => faceLevel(s, 'auto_upgrade') > 0,
  autoBuy: (s: GameState) => faceLevel(s, 'auto_buy') > 0,
  training: (s: GameState) => 0.1 * faceLevel(s, 'training'),
  ultCharge: (s: GameState) => 0.15 * faceLevel(s, 'command'),
  homeTurf: (s: GameState) => 0.03 + 0.02 * faceLevel(s, 'home_turf'),
  warmUp: (s: GameState) => 0.15 * faceLevel(s, 'warm_up'),
  eventRate: (s: GameState) => (1 + 0.25 * faceLevel(s, 'events')) * news.eventRate(s),
  scratchLuck: (s: GameState) => faceLevel(s, 'scratch_luck'),
  incenseMult: (s: GameState) => 1 + 0.5 * faceLevel(s, 'incense'),
  indexMult: (s: GameState) => (1 + 0.25 * faceLevel(s, 'index')) * news.indexMult(s),
};
