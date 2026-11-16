/** Automation unlocked by Face upgrades. Runs while the game is open (offline stays closed-form). */
import { buyLot, upgradeLot } from './actions';
import { ALL_LOTS, AREAS, AREA_ORDER } from './content/areas';
import { buyPrice, isAreaOpen, isLotLocked, upgradeCost } from './economy';
import { perk } from './perks';
import { fillPosts } from './staffing';
import type { GameEvent, GameState } from './types';

/**
 * Duty Roster: fills empty Manager and Security slots with free crew, best value first
 * (strongest managers on the biggest earners, the weakest strong-enough guard per lot).
 * Never moves anyone the player has posted.
 */
export function autoStaff(state: GameState): GameState {
  return fillPosts(state);
}

/** Buys the cheapest open lot you can afford. */
export function autoBuy(state: GameState): { state: GameState; events: GameEvent[] } {
  const options = AREA_ORDER.filter((a) => isAreaOpen(state, a))
    .flatMap((a) => AREAS[a].lots)
    .filter((l) => !state.lots[l.id] && !isLotLocked(state, l))
    .sort((a, b) => buyPrice(state, a) - buyPrice(state, b));
  const cheapest = options[0];
  if (!cheapest || buyPrice(state, cheapest) > state.cash) return { state, events: [] };
  const r = buyLot(state, cheapest.id);
  return r.ok ? { state: r.state, events: [{ kind: 'auto-bought', lotId: cheapest.id }] } : { state, events: [] };
}

/** Keeps buying the cheapest single upgrade among your lots in an area. */
export function autoUpgrade(state: GameState, area: string, maxSteps = 25): { state: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const lots = Object.keys(s.lots)
      .map((id) => ALL_LOTS[id]!)
      .filter((l) => l && l.area === area)
      .sort((a, b) => upgradeCost(s, a, s.lots[a.id]!.level) - upgradeCost(s, b, s.lots[b.id]!.level));
    const lot = lots[0];
    if (!lot || upgradeCost(s, lot, s.lots[lot.id]!.level) > s.cash) break;
    const r = upgradeLot(s, lot.id, 1);
    if (!r.ok) break;
    s = r.state;
    for (const m of r.milestones ?? []) events.push({ kind: 'milestone', lotId: lot.id, level: m });
  }
  return { state: s, events };
}

/** One pass of every switched-on automation. */
export function automate(state: GameState): { state: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  if (perk.autoBuy(s) && s.auto.buy) {
    const r = autoBuy(s);
    s = r.state;
    events.push(...r.events);
  }
  if (perk.autoUpgrade(s)) {
    for (const area of s.auto.upgrade) {
      const r = autoUpgrade(s, area);
      s = r.state;
      events.push(...r.events);
    }
  }
  if (perk.autoStaff(s) && s.auto.staff) s = autoStaff(s);
  return { state: s, events };
}
