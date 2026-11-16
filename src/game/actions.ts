import { ALL_LOTS } from './content/areas';
import { classOf } from './characters';
import { ACCOUNTANT_COST, ACCOUNTANT_UNLOCK_LOTS, INDEX_PER_LOT, INDEX_PER_MILESTONE } from './constants';
import {
  buyPrice,
  isAreaOpen,
  isLotLocked,
  maxAffordableUpgrades,
  milestonesCrossed,
  postOf,
  upgradeCostN,
} from './economy';
import { perk } from './perks';
import type { GameState } from './types';

export type ActionResult = { ok: true; state: GameState; milestones?: number[] } | { ok: false; reason: string };

export function buyLot(state: GameState, lotId: string): ActionResult {
  const lot = ALL_LOTS[lotId];
  if (!lot) return { ok: false, reason: 'Unknown lot' };
  if (state.lots[lotId]) return { ok: false, reason: 'Already yours' };
  if (!isAreaOpen(state, lot.area)) return { ok: false, reason: 'Area not open yet' };
  if (isLotLocked(state, lot)) return { ok: false, reason: 'Held by a rival' };
  const price = buyPrice(state, lot);
  if (state.cash < price) return { ok: false, reason: 'Not enough cash' };
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - price,
      index: state.index + INDEX_PER_LOT * perk.indexMult(state),
      lots: { ...state.lots, [lotId]: { level: 1, invested: price } },
      stats: { ...state.stats, lotsBought: state.stats.lotsBought + 1 },
    },
  };
}

/** Upgrades a lot `n` times, or as many as affordable when n is 'max'. */
export function upgradeLot(state: GameState, lotId: string, n: number | 'max'): ActionResult {
  const lot = ALL_LOTS[lotId];
  const ls = state.lots[lotId];
  if (!lot || !ls) return { ok: false, reason: 'Not yours' };
  const count = n === 'max' ? maxAffordableUpgrades(state, lot, ls.level, state.cash) : n;
  if (count <= 0) return { ok: false, reason: 'Not enough cash' };
  const cost = upgradeCostN(state, lot, ls.level, count);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash' };
  const crossed = milestonesCrossed(ls.level, ls.level + count);
  return {
    ok: true,
    milestones: crossed,
    state: {
      ...state,
      cash: state.cash - cost,
      index: state.index + crossed.length * INDEX_PER_MILESTONE * perk.indexMult(state),
      lots: { ...state.lots, [lotId]: { ...ls, level: ls.level + count, invested: ls.invested + cost } },
    },
  };
}

export function collectSafe(state: GameState): ActionResult {
  if (state.safe <= 0) return { ok: false, reason: 'Safe is empty' };
  return { ok: true, state: { ...state, cash: state.cash + state.safe, safe: 0 } };
}

/** Posts a character to a lot slot (moving them from any previous post), or clears the slot with null. */
export function assignStaff(state: GameState, lotId: string, slot: 'manager' | 'security', charId: string | null): ActionResult {
  const ls = state.lots[lotId];
  if (!ls) return { ok: false, reason: 'Not yours' };
  const lots = { ...state.lots };
  if (charId) {
    if (!state.characters[charId]) return { ok: false, reason: 'Not in your crew' };
    const need = slot === 'manager' ? 'agent' : 'gangster';
    if (classOf(charId) !== need) return { ok: false, reason: slot === 'manager' ? 'Managers must be agents' : 'Security must be gangsters' };
    const prev = postOf(state, charId);
    if (prev) lots[prev.lotId] = { ...lots[prev.lotId]!, [prev.slot]: undefined };
  }
  lots[lotId] = { ...lots[lotId]!, [slot]: charId ?? undefined };
  return { ok: true, state: { ...state, lots } };
}

export function canHireAccountant(state: GameState): boolean {
  return !state.run.accountant && Object.keys(state.lots).length >= ACCOUNTANT_UNLOCK_LOTS;
}

export function hireAccountant(state: GameState): ActionResult {
  if (state.run.accountant) return { ok: false, reason: 'Already hired' };
  if (!canHireAccountant(state)) return { ok: false, reason: `Own ${ACCOUNTANT_UNLOCK_LOTS} lots first` };
  if (state.cash < ACCOUNTANT_COST) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, state: { ...state, cash: state.cash - ACCOUNTANT_COST, run: { ...state.run, accountant: true } } };
}
