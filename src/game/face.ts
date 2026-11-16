/** 金盆洗手 cash-out and 面子 Face upgrades. */

const FIRST_GOOD_FACE = 10;
import { AREAS } from './content/areas';
import { FACE_BY_ID } from './content/face';
import { FACE_DIVISOR, FACE_PER_CLAIM, FACE_PER_UNDERDOG, INDEX_PER_LOT, INDEX_PER_MILESTONE, START_CASH } from './constants';
import { milestonesCrossed, upgradeCostN } from './economy';
import { faceLevel, perk } from './perks';
import { initialState } from './state';
import type { ActionResult } from './actions';
import type { GameState } from './types';

export function faceCost(id: string, level: number): number {
  const u = FACE_BY_ID[id]!;
  return Math.ceil(u.base * Math.pow(u.growth, level));
}

export function buyFaceUpgrade(state: GameState, id: string): ActionResult {
  const u = FACE_BY_ID[id];
  if (!u) return { ok: false, reason: 'Unknown upgrade' };
  const level = faceLevel(state, id);
  if (level >= u.max) return { ok: false, reason: 'Maxed' };
  const cost = faceCost(id, level);
  if (state.meta.face < cost) return { ok: false, reason: 'Not enough Face' };
  let s: GameState = { ...state, meta: { ...state.meta, face: state.meta.face - cost, upgrades: { ...state.meta.upgrades, [id]: level + 1 } } };
  // The bookkeeper perk applies to the current run straight away.
  if (id === 'bookkeeper') s = { ...s, run: { ...s.run, accountant: true } };
  return { ok: true, state: s };
}

export function canCashOut(state: GameState): boolean {
  return state.meta.claimedEver.includes('wanhua');
}

export interface CashOutPreview {
  face: number;
  fromWorth: number;
  fromClaims: number;
  fromUnderdog: number;
  /** Best net worth needed for one more Face from worth. */
  nextWorth: number;
  /** True when this cash-out would raise your lifetime Face by 50% or more. */
  goodTime: boolean;
}

export function cashOutPreview(state: GameState): CashOutPreview {
  const fromWorth = Math.floor(Math.sqrt(Math.max(0, state.bestNetWorth) / FACE_DIVISOR));
  const fromClaims = state.run.claims * FACE_PER_CLAIM;
  const fromUnderdog = state.run.underdog * FACE_PER_UNDERDOG;
  const face = fromWorth + fromClaims + fromUnderdog;
  return {
    face,
    fromWorth,
    fromClaims,
    fromUnderdog,
    nextWorth: Math.pow(fromWorth + 1, 2) * FACE_DIVISOR,
    // A first cash-out only glows once it's worth it (about a Ximending claim).
    goodTime: face >= Math.max(FIRST_GOOD_FACE, state.meta.faceTotal * 0.5),
  };
}

/** Sets up the start of a run from your Face upgrades. */
export function startRun(state: GameState): GameState {
  let s: GameState = { ...state, cash: perk.startCash(START_CASH, state) };
  if (perk.bookkeeper(s)) s = { ...s, run: { ...s.run, accountant: true } };
  const n = perk.oldTurfLots(s);
  if (n > 0) {
    const lots = { ...s.lots };
    let index = s.index;
    for (const lot of AREAS.wanhua.lots.filter((l) => !l.lock).slice(0, n)) {
      const invested = lot.price + upgradeCostN(s, lot, 1, 9);
      lots[lot.id] = { level: 10, invested };
      index += (INDEX_PER_LOT + milestonesCrossed(1, 10).length * INDEX_PER_MILESTONE) * perk.indexMult(s);
    }
    s = { ...s, lots, index, stats: { ...s.stats, lotsBought: s.stats.lotsBought + n } };
  }
  return s;
}

/**
 * Wash your hands in the golden basin: bank Face and a lottery ticket, then start over.
 * Cards, stars, levels, binder, currencies, guarantees, Face, slots and automation all stay.
 */
export function cashOut(state: GameState, now: number): { state: GameState; face: number } {
  const { face } = cashOutPreview(state);
  const fresh = initialState(now);
  let s: GameState = {
    ...state,
    lastSeen: now,
    cash: START_CASH,
    safe: 0,
    runEarned: 0,
    bestNetWorth: START_CASH,
    index: 100,
    lots: {},
    areas: fresh.areas,
    run: fresh.run,
    shakedownIn: fresh.shakedownIn,
    hot: null,
    event: null,
    eventIn: fresh.eventIn,
    currencies: { ...state.currencies, lottery: state.currencies.lottery + 1 },
    meta: { ...state.meta, face: state.meta.face + face, faceTotal: state.meta.faceTotal + face, runs: state.meta.runs + 1 },
  };
  s = startRun(s);
  return { state: s, face };
}
