import { AREAS, ALL_LOTS } from './content/areas';
import { addXp, statsOf } from './characters';
import { phaseAt } from './clock';
import {
  EAST_HOT_ORDER,
  GAME_HOUR_MS,
  MANAGER_XP_PER_MIN,
  SHAKEDOWN_ATTEMPT_XP,
  SHAKEDOWN_BONUS_SECONDS,
  SHAKEDOWN_MAX_S,
  SHAKEDOWN_MIN_S,
  SHAKEDOWN_SCRATCH_EVERY,
  SHAKEDOWN_XP,
} from './constants';
import { incomePerSec, lotIncome, netWorth, safeCapacity } from './economy';
import { automate } from './auto';
import { checkCommissions } from './commissions';
import { tickEvents } from './events';
import type { GameEvent, GameState } from './types';

export type Rng = () => number;

export function nextShakedownDelay(rng: Rng): number {
  return SHAKEDOWN_MIN_S + rng() * (SHAKEDOWN_MAX_S - SHAKEDOWN_MIN_S);
}

/** Adds income to the safe (or straight to cash when the accountant is collecting). */
export function addIncome(state: GameState, amount: number, autoCollect: boolean): GameState {
  if (amount <= 0) return state;
  if (autoCollect) {
    return { ...state, cash: state.cash + amount, lifetimeEarned: state.lifetimeEarned + amount, runEarned: state.runEarned + amount };
  }
  const room = Math.max(0, safeCapacity(state) - state.safe);
  const added = Math.min(room, amount);
  return {
    ...state,
    safe: state.safe + added,
    lifetimeEarned: state.lifetimeEarned + added,
    runEarned: state.runEarned + added,
  };
}

/** Resolves one shakedown attempt against a random owned lot in a rival-held area. */
export function resolveShakedown(state: GameState, rng: Rng): { state: GameState; events: GameEvent[] } {
  const targets = Object.keys(state.lots).filter((id) => {
    const lot = ALL_LOTS[id];
    return lot && !state.areas[lot.area].boss;
  });
  if (targets.length === 0) return { state, events: [] };
  const lotId = targets[Math.floor(rng() * targets.length)]!;
  const lot = ALL_LOTS[lotId]!;
  const guard = state.lots[lotId]?.security;
  if (!guard) return { state, events: [{ kind: 'shakedown-unguarded', lotId }] };

  const cs = state.characters[guard] ?? { level: 1, xp: 0, stars: 1 };
  const strong = statsOf(guard, cs).muscle >= AREAS[lot.area].threat;
  const events: GameEvent[] = [];
  const { cs: next, gained } = addXp(cs, strong ? SHAKEDOWN_XP : SHAKEDOWN_ATTEMPT_XP);
  if (gained > 0) events.push({ kind: 'level-up', charId: guard, level: next.level });
  let s: GameState = { ...state, characters: { ...state.characters, [guard]: next } };
  if (strong) {
    const bonus = Math.max(1000, lotIncome(s, lot, 'average') * SHAKEDOWN_BONUS_SECONDS);
    const repelled = s.stats.shakedownsRepelled + 1;
    const scratch = repelled % SHAKEDOWN_SCRATCH_EVERY === 0;
    s = {
      ...s,
      cash: s.cash + bonus,
      lifetimeEarned: s.lifetimeEarned + bonus,
      runEarned: s.runEarned + bonus,
      currencies: scratch ? { ...s.currencies, scratch: s.currencies.scratch + 1 } : s.currencies,
      stats: { ...s.stats, shakedownsRepelled: repelled, shakedownBonus: s.stats.shakedownBonus + bonus },
    };
    events.unshift({ kind: 'shakedown-repelled', lotId, charId: guard, bonus, scratch });
  } else {
    events.unshift({ kind: 'shakedown-unguarded', lotId });
  }
  return { state: s, events };
}

/** Managers slowly gain XP while posted. */
export function workManagers(state: GameState, seconds: number): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let characters = state.characters;
  for (const ls of Object.values(state.lots)) {
    if (!ls.manager) continue;
    const cs = characters[ls.manager];
    if (!cs) continue;
    const { cs: next, gained } = addXp(cs, (seconds / 60) * MANAGER_XP_PER_MIN);
    if (characters === state.characters) characters = { ...characters };
    characters[ls.manager] = next;
    if (gained > 0) events.push({ kind: 'level-up', charId: ls.manager, level: next.level });
  }
  return { state: characters === state.characters ? state : { ...state, characters }, events };
}

/** East District's hot business type for the current game day. */
export function hotCategory(now: number): string {
  const day = Math.floor(now / (24 * GAME_HOUR_MS));
  return EAST_HOT_ORDER[((day % EAST_HOT_ORDER.length) + EAST_HOT_ORDER.length) % EAST_HOT_ORDER.length]!;
}

/** Advances the game by `dt` seconds of active play. */
export function tick(state: GameState, dt: number, now: number, rng: Rng = Math.random): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const hot = hotCategory(now);
  let s = state.hot === hot ? state : { ...state, hot };
  const income = incomePerSec(s, phaseAt(now)) * dt;
  s = addIncome(s, income, s.run.accountant);

  s = tickEvents(s, dt, rng, now);
  const auto = automate(s, income);
  s = auto.state;
  events.push(...auto.events);

  const worked = workManagers(s, dt);
  s = worked.state;
  events.push(...worked.events);

  let shakedownIn = s.shakedownIn - dt;
  if (shakedownIn <= 0) {
    const r = resolveShakedown(s, rng);
    s = r.state;
    events.push(...r.events);
    shakedownIn = nextShakedownDelay(rng);
  }

  const done = checkCommissions(s, now);
  s = done.state;
  events.push(...done.events);

  const worth = netWorth(s);
  s = { ...s, shakedownIn, lastSeen: now, bestNetWorth: Math.max(s.bestNetWorth, worth) };
  return { state: s, events };
}
