/** Automation unlocked by Face upgrades. Runs while the game is open (offline stays closed-form). */
import { buyLot, upgradeLot } from './actions';
import { ALL_LOTS, AREAS } from './content/areas';
import { ORDERS_SHARE, ORDERS_WAIT_S } from './constants';
import { buyPrice, incomePerSec, upgradeCost } from './economy';
import { buyOptions, openLots, type Buy } from './income';
import { perk } from './perks';
import { fillPosts } from './staffing';
import { nextRivalFight } from './turf';
import type { AreaId, GameEvent, GameState, LotDef } from './types';

/** Fills empty posts with free crew, best value first. Used by the pacing sim. */
export function autoStaff(state: GameState): GameState {
  return fillPosts(state);
}

type Slot = 'manager' | 'security';
const postKey = (lotId: string, slot: Slot, charId: string) => `${lotId}:${slot}:${charId}`;

/** Posts the Duty Roster filled whose occupant is still the one it put there. */
function rosterPosts(state: GameState): string[] {
  return state.auto.placed.filter((key) => {
    const [lotId, slot, charId] = key.split(':') as [string, Slot, string];
    return state.lots[lotId]?.[slot] === charId;
  });
}

/**
 * Duty Roster: keeps posts filled with free crew, best value first (strongest managers on the
 * biggest earners, the weakest strong-enough guard per lot). When a new character joins, it
 * re-shuffles the posts it filled itself so the newcomer can take the job they're best at.
 * It never moves anyone you posted by hand.
 */
export function dutyRoster(state: GameState): GameState {
  const crew = Object.keys(state.characters).length;
  const mine = rosterPosts(state);
  let s = state;
  const reshuffle = crew !== state.auto.rosterSeen && mine.length > 0;
  if (reshuffle) {
    const lots = { ...s.lots };
    for (const key of mine) {
      const [lotId, slot] = key.split(':') as [string, Slot];
      lots[lotId] = { ...lots[lotId]!, [slot]: undefined };
    }
    s = { ...s, lots };
  }
  const filled = fillPosts(s);
  const added: string[] = [];
  if (filled !== s) {
    for (const [lotId, ls] of Object.entries(filled.lots)) {
      for (const slot of ['manager', 'security'] as const) {
        const who = ls[slot];
        if (who && s.lots[lotId]?.[slot] !== who) added.push(postKey(lotId, slot, who));
      }
    }
  }
  const placed = [...(reshuffle ? [] : mine), ...added];
  if (filled === state && placed.length === state.auto.placed.length && crew === state.auto.rosterSeen) return state;
  return { ...filled, auto: { ...filled.auto, placed, rosterSeen: crew } };
}

/**
 * Where Standing Orders shops: with focus on, the next rival's district until that fight is ready;
 * otherwise every open district.
 */
export function ordersScope(state: GameState): { lots: LotDef[]; area: AreaId | null } {
  if (state.auto.focus) {
    const next = nextRivalFight(state);
    if (next && !next.ready) return { lots: AREAS[next.fight.area].lots, area: next.fight.area };
  }
  return { lots: openLots(state), area: null };
}

const spend = (s: GameState, amount: number): GameState => ({ ...s, auto: { ...s.auto, budget: Math.max(0, s.auto.budget - amount) } });

/** What a purchase costs right now: a new lot's whole price, or one level of an upgrade. */
function stepCost(s: GameState, b: Buy): number {
  const lot = ALL_LOTS[b.lotId]!;
  return b.kind === 'buy' ? buyPrice(s, lot) : upgradeCost(s, lot, s.lots[lot.id]!.level);
}

/**
 * What Standing Orders buys next. New lots first: the most valuable unowned lot it can afford.
 * Then the best buy, waiting for it only when the budget will cover it within ORDERS_WAIT_S seconds;
 * otherwise the best one it can afford now, so it never sits idle for minutes.
 * `ready` says whether it can buy right now.
 */
export function ordersPick(state: GameState): { buy: Buy; ready: boolean } | null {
  const options = buyOptions(state, ordersScope(state).lots);
  const best = options[0];
  if (!best) return null;
  const wallet = Math.min(state.auto.budget, state.cash);
  const rate = incomePerSec(state, 'average') * ORDERS_SHARE;
  // New lots come first: the most valuable one it can afford. If none is affordable yet but the
  // cheapest is close, it saves for that; otherwise it keeps upgrading meanwhile.
  const lots = options.filter((o) => o.kind === 'buy');
  const affordable = lots.filter((o) => o.cost <= wallet).sort((p, q) => q.cost - p.cost)[0];
  if (affordable) return { buy: affordable, ready: true };
  const nearest = [...lots].sort((p, q) => p.cost - q.cost)[0];
  if (nearest && rate > 0 && (nearest.cost - wallet) / rate <= ORDERS_WAIT_S) return { buy: nearest, ready: false };
  const cost = stepCost(state, best);
  if (cost <= wallet) return { buy: best, ready: true };
  if (rate > 0 && (cost - wallet) / rate <= ORDERS_WAIT_S) return { buy: best, ready: false };
  const now = options.find((o) => stepCost(state, o) <= wallet);
  return now ? { buy: now, ready: true } : { buy: best, ready: false };
}

/**
 * Standing Orders: spends its budget on new lots and upgrades, picked by `ordersPick`,
 * one level at a time (so a push to the next ×2 happens step by step).
 */
export function standingOrders(state: GameState, maxSteps = 25): { state: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const pick = ordersPick(s);
    if (!pick || !pick.ready) break;
    const lot = ALL_LOTS[pick.buy.lotId]!;
    const cost = stepCost(s, pick.buy);
    if (pick.buy.kind === 'buy') {
      const r = buyLot(s, lot.id);
      if (!r.ok) break;
      s = spend(r.state, cost);
      events.push({ kind: 'auto-bought', lotId: lot.id });
    } else {
      const r = upgradeLot(s, lot.id, 1);
      if (!r.ok) break;
      s = spend(r.state, cost);
      for (const m of r.milestones ?? []) events.push({ kind: 'milestone', lotId: lot.id, level: m });
    }
  }
  return { state: s, events };
}

/** One pass of every switched-on automation. `earned` is this tick's income, for Standing Orders' budget. */
export function automate(state: GameState, earned = 0): { state: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  if (perk.standingOrders(s) && s.auto.orders) {
    // Half of what you earn is set aside for Standing Orders, never more than you have (cash plus the safe).
    if (earned > 0) s = { ...s, auto: { ...s.auto, budget: Math.min(s.cash + s.safe, s.auto.budget + earned * ORDERS_SHARE) } };
    const r = standingOrders(s);
    s = r.state;
    events.push(...r.events);
  }
  if (perk.autoStaff(s) && s.auto.staff) s = dutyRoster(s);
  return { state: s, events };
}
