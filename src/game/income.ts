/**
 * Where income comes from, and which purchase pays back best.
 *
 * A lot's income is its base rate times four named sources. Nothing here changes a number: it groups
 * the existing multipliers so players can see them, and compares purchases by income added per NT$.
 */
import { BINDER_STEP } from './content/binder';
import { AREAS, AREA_ORDER } from './content/areas';
import { COLLECTIBLES, uniqueCards } from './binder';
import { classOf } from './characters';
import { INDEX_PER_LOT, INDEX_PER_MILESTONE } from './constants';
import {
  areaIncome,
  buyPrice,
  incomeBreakdown,
  incomeOf,
  incomePerSec,
  indexGain,
  isAreaOpen,
  isLotLocked,
  milestoneMult,
  milestonesCrossed,
  nextMilestone,
  postOf,
  upgradeCostN,
  type IncomeBreakdown,
} from './economy';
import type { AreaId, GameState, LotDef } from './types';

export type SourceId = 'lot' | 'time' | 'people' | 'reputation';

export const SOURCES: { id: SourceId; name: string }[] = [
  { id: 'lot', name: 'The lot' },
  { id: 'time', name: 'Time & place' },
  { id: 'people', name: 'People' },
  { id: 'reputation', name: 'Reputation' },
];

/**
 * The four sources as multipliers. base × lot × time × people × reputation is the lot's income.
 * - The lot: level and ×2 milestones.
 * - Time & place: day/night, East District's hot type, a claimed district's ×2.
 * - People: the Manager.
 * - Reputation: Good Name, the binder, the price index.
 */
export function sourceFactors(b: IncomeBreakdown): Record<SourceId, number> {
  return {
    lot: b.level * b.milestones,
    time: b.phase * b.hot * b.claim,
    people: b.manager,
    reputation: b.goodName * b.binder * b.index,
  };
}

/** A purchase: buying a lot (level 0 → 1) or upgrading one to `toLevel`. */
export interface Buy {
  lotId: string;
  kind: 'buy' | 'upgrade';
  fromLevel: number;
  toLevel: number;
  cost: number;
  /**
   * NT$/s it adds, day and night averaged. Counts the price-index bump from a new lot or a ×2
   * milestone, which raises the income of everything you already own.
   */
  gain: number;
  /** The part of `gain` that comes from the price-index bump. */
  fromIndex: number;
}

/** True when most of what a purchase adds comes through the price index rather than the lot itself. */
export function mostlyIndex(b: Buy): boolean {
  return b.fromIndex > b.gain / 2;
}

/** Income added per NT$ spent. */
export function buyValue(b: Buy): number {
  return b.cost > 0 ? b.gain / b.cost : 0;
}

/**
 * What buying or upgrading this lot could do: buy it, take one level, or go to the next ×2.
 * `total` is your current average income, for the price-index bump.
 */
function lotBuys(state: GameState, lot: LotDef, total: number): Buy[] {
  const ls = state.lots[lot.id];
  if (!ls && (!isAreaOpen(state, lot.area) || isLotLocked(state, lot))) return [];
  const from = ls?.level ?? 0;
  const b = incomeBreakdown(state, lot, 'average', Math.max(1, from));
  // Income per "lot point" (level × milestones): everything except the lot's own source.
  const unit = incomeOf(b) / (b.level * b.milestones);
  const own = from > 0 ? unit * from * milestoneMult(from) : 0;
  const make = (to: number, cost: number, indexUp: number): Buy => {
    const after = unit * to * milestoneMult(to);
    // A higher index lifts this lot and everything else you own by the same fraction.
    const lift = (indexUp / state.index) * (total - own + after);
    return { lotId: lot.id, kind: from === 0 ? 'buy' : 'upgrade', fromLevel: from, toLevel: to, cost, gain: after - own + lift, fromIndex: lift };
  };
  if (!ls) return [make(1, buyPrice(state, lot), indexGain(state, lot, INDEX_PER_LOT))];
  const step = (to: number) =>
    make(to, upgradeCostN(state, lot, from, to - from), indexGain(state, lot, milestonesCrossed(from, to).length * INDEX_PER_MILESTONE));
  const next = nextMilestone(from);
  return next && next > from + 1 ? [step(from + 1), step(next)] : [step(from + 1)];
}

/**
 * The purchase among these lots that adds the most income per NT$, affordable or not.
 * Ties go to the cheaper one.
 */
export function bestBuy(state: GameState, lots: LotDef[], opts: { upgradesOnly?: boolean } = {}): Buy | null {
  return buyOptions(state, lots, opts)[0] ?? null;
}

/** Every purchase among these lots, best value (income per NT$) first; ties go to the cheaper one. */
export function buyOptions(state: GameState, lots: LotDef[], opts: { upgradesOnly?: boolean } = {}): Buy[] {
  const total = incomePerSec(state, 'average');
  const all: Buy[] = [];
  for (const lot of lots) {
    if (opts.upgradesOnly && !state.lots[lot.id]) continue;
    all.push(...lotBuys(state, lot, total));
  }
  return all.sort((p, q) => buyValue(q) - buyValue(p) || p.cost - q.cost);
}

/** Every lot in the districts that are open now. */
export function openLots(state: GameState): LotDef[] {
  return AREA_ORDER.filter((a) => isAreaOpen(state, a)).flatMap((a) => AREAS[a].lots);
}

/** Each open district's share of your income, day and night averaged, in map order. */
export function incomeByArea(state: GameState): { area: AreaId; income: number; share: number }[] {
  const total = incomePerSec(state, 'average');
  return AREA_ORDER.filter((a) => isAreaOpen(state, a))
    .map((area) => {
      const income = areaIncome(state, area, 'average');
      return { area, income, share: total > 0 ? income / total : 0 };
    })
    .filter((r) => r.income > 0);
}

/** Owned lots this many levels or fewer from their next ×2. */
export const NEAR_MILESTONE = 3;

/** Plain facts about where each source still has room to grow. */
export interface Growth {
  /** The lot: owned lots close to their next ×2. */
  nearMilestone: number;
  /** Time & place: the first open district where you own lots but haven't beaten the boss. */
  unclaimed: AreaId | null;
  /** People: owned lots without a Manager, and agents with no post. */
  noManager: number;
  freeAgents: number;
  /** Reputation: new cards until the binder's next income step, or null once there are no more. */
  cardsToStep: number | null;
}

export function growth(state: GameState): Growth {
  const owned = Object.entries(state.lots);
  const nearMilestone = owned.filter(([, ls]) => {
    const next = nextMilestone(ls.level);
    return next !== null && next - ls.level <= NEAR_MILESTONE;
  }).length;
  const unclaimed = AREA_ORDER.find((a) => isAreaOpen(state, a) && !state.areas[a].boss && AREAS[a].lots.some((l) => state.lots[l.id])) ?? null;
  const unique = uniqueCards(state);
  const toStep = BINDER_STEP - (unique % BINDER_STEP);
  return {
    nearMilestone,
    unclaimed,
    noManager: owned.filter(([, ls]) => !ls.manager).length,
    freeAgents: Object.keys(state.characters).filter((id) => classOf(id) === 'agent' && !postOf(state, id)).length,
    cardsToStep: unique + toStep <= COLLECTIBLES.length ? toStep : null,
  };
}
