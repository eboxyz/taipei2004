/** Street events: optional pop-ups on map stations while the game is open. */
import { payBinderPages } from './binder';
import { AREA_ORDER } from './content/areas';
import { EVENT_LIFETIME_S, EVENT_MAX_S, EVENT_MIN_S } from './constants';
import { incomePerSec, isAreaOpen } from './economy';
import { addCard, fortuneEventRate, pickCard, type CardGain } from './gacha';
import { news } from './headlines';
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

/** Seconds until the next street event. Pass `now` so today's temple fortune counts. */
export function nextEventDelay(state: GameState, rng: Rng, now?: number): number {
  const fortune = now === undefined ? 1 : fortuneEventRate(state, now);
  return (EVENT_MIN_S + rng() * (EVENT_MAX_S - EVENT_MIN_S)) / (perk.eventRate(state) * fortune);
}

function pickKind(state: GameState, rng: Rng): EventKind {
  // Idol Drama Craze: walk-in recruits turn up more often.
  const kinds = KINDS.map(([k, w]): [EventKind, number] => [k, k === 'recruit' ? w * news.recruitMult(state) : w]);
  const total = kinds.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of kinds) {
    r -= w;
    if (r < 0) return k;
  }
  return 'procession';
}

/** Counts down the current event and spawns the next one. */
export function tickEvents(state: GameState, dt: number, rng: Rng, now?: number): GameState {
  let { event, eventIn } = state;
  if (event) {
    const expiresIn = event.expiresIn - dt;
    event = expiresIn > 0 ? { ...event, expiresIn } : null;
  }
  eventIn -= dt;
  if (eventIn <= 0) {
    eventIn = nextEventDelay(state, rng, now);
    if (!event) {
      const open = AREA_ORDER.filter((a) => isAreaOpen(state, a) && a !== 'xindian');
      const area = open[Math.floor(rng() * open.length)] ?? 'wanhua';
      const kind = pickKind(state, rng);
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
  let s: GameState = { ...state, event: null, run: { ...state.run, events: state.run.events + 1 } };
  const reward: EventReward = { event };
  switch (event.kind) {
    case 'procession': {
      const cash = Math.max(5000, incomePerSec(s, 'average') * 120) * news.processionMult(s);
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
