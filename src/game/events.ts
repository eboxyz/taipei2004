/** Street events: optional pop-ups on map stations while the game is open. */
import { payBinderPages } from './binder';
import { AREA_ORDER } from './content/areas';
import { EVENT_LIFETIME_S, EVENT_MAX_S, EVENT_MIN_S } from './constants';
import { incomePerSec, isAreaOpen } from './economy';
import { addCard, pickCard, type CardGain } from './gacha';
import { perk } from './perks';
import type { EventKind, GameState, StreetEvent } from './types';

type Rng = () => number;

const KINDS: [EventKind, number][] = [
  ['procession', 35],
  ['scratch', 25],
  ['recruit', 20],
  ['tip', 20],
];

export const EVENT_INFO: Record<EventKind, { glyph: string; name: string }> = {
  procession: { glyph: '陣', name: 'Temple procession' },
  scratch: { glyph: '刮', name: 'Scratch card on the ground' },
  recruit: { glyph: '人', name: 'Walk-in recruit' },
  tip: { glyph: '報', name: 'Broker tip' },
};

export function nextEventDelay(state: GameState, rng: Rng): number {
  return (EVENT_MIN_S + rng() * (EVENT_MAX_S - EVENT_MIN_S)) / perk.eventRate(state);
}

function pickKind(rng: Rng): EventKind {
  const total = KINDS.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of KINDS) {
    r -= w;
    if (r < 0) return k;
  }
  return 'procession';
}

/** Counts down the current event and spawns the next one. */
export function tickEvents(state: GameState, dt: number, rng: Rng): GameState {
  let { event, eventIn } = state;
  if (event) {
    const expiresIn = event.expiresIn - dt;
    event = expiresIn > 0 ? { ...event, expiresIn } : null;
  }
  eventIn -= dt;
  if (eventIn <= 0) {
    eventIn = nextEventDelay(state, rng);
    if (!event) {
      const open = AREA_ORDER.filter((a) => isAreaOpen(state, a) && a !== 'xindian');
      const area = open[Math.floor(rng() * open.length)] ?? 'wanhua';
      const kind = pickKind(rng);
      event = { id: Math.floor(rng() * 1e9), area, kind, xiaoxiao: kind === 'tip' && rng() < 0.35, expiresIn: EVENT_LIFETIME_S };
    }
  }
  if (event === state.event && eventIn === state.eventIn) return state;
  return { ...state, event, eventIn };
}

export interface EventReward {
  event: StreetEvent;
  cash?: number;
  scratch?: number;
  card?: CardGain;
  index?: number;
}

/** Taps the waiting event and pays its reward. */
export function claimEvent(state: GameState, rng: Rng, now: number): { state: GameState; reward: EventReward } | null {
  const event = state.event;
  if (!event) return null;
  let s: GameState = { ...state, event: null };
  const reward: EventReward = { event };
  switch (event.kind) {
    case 'procession': {
      const cash = Math.max(5000, incomePerSec(s, 'average') * 120);
      s = { ...s, cash: s.cash + cash, lifetimeEarned: s.lifetimeEarned + cash, runEarned: s.runEarned + cash };
      reward.cash = cash;
      break;
    }
    case 'scratch':
      s = { ...s, currencies: { ...s.currencies, scratch: s.currencies.scratch + 1 } };
      reward.scratch = 1;
      break;
    case 'recruit': {
      const id = pickCard(s, 'scratch', rng() < 0.7 ? 'N' : 'R', rng, now);
      const r = addCard(s, id);
      s = payBinderPages(r.state).state;
      reward.card = r.gain;
      break;
    }
    case 'tip': {
      const index = 2 * perk.indexMult(s);
      s = { ...s, index: s.index + index };
      reward.index = index;
      break;
    }
  }
  return { state: s, reward };
}
