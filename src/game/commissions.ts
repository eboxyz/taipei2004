/**
 * Commissions 委託: three optional goals per run, drawn at random. Each pays 1 lottery ticket the
 * moment it's done. They nudge you toward things you'd otherwise skip; none can cost anything.
 */
import { AREAS, AREA_ORDER } from './content/areas';
import { COMMISSIONS_PER_RUN, FAST_XIMENDING_MS } from './constants';
import { pickDistinct, type Rng } from './rng';
import type { AreaId, Commission, CommissionId, GameEvent, GameState } from './types';

interface CommissionDef {
  id: CommissionId;
  text: string;
  need: number;
  /** Progress toward `need`. `c.from` holds the counter's value when the run started. */
  progress: (s: GameState, c: Commission, now: number) => number;
  /** The counter to remember at the start of the run, for goals counted "this run". */
  start?: (s: GameState) => number;
  /** Timed goals only: true once it can't be done this run any more. */
  missed?: (s: GameState, now: number) => boolean;
}

const CHAPTER: AreaId[] = AREA_ORDER.filter((a) => !AREAS[a].secret);
const forSale = (a: AreaId) => AREAS[a].lots.filter((l) => l.lock !== 'xiaoxiao');
const mostIn = (count: (a: AreaId) => number) => Math.max(0, ...CHAPTER.map(count));
const DISTRICT_LOTS = forSale('wanhua').length;

export const COMMISSIONS: Record<CommissionId, CommissionDef> = {
  agents_only: {
    id: 'agents_only',
    text: 'Win a Turf War with only agents in your squad.',
    need: 1,
    progress: (s) => (s.run.agentWin ? 1 : 0),
  },
  fast_ximending: {
    id: 'fast_ximending',
    text: 'Claim Ximending within 2 hours of starting this run.',
    need: 1,
    progress: (s, _c, now) => (s.areas.ximending.boss && now - s.run.startedAt <= FAST_XIMENDING_MS ? 1 : 0),
    missed: (s, now) => now - s.run.startedAt > FAST_XIMENDING_MS,
  },
  lv100: {
    id: 'lv100',
    text: 'Take one lot to Lv 100.',
    need: 100,
    progress: (s) => Math.max(0, ...Object.values(s.lots).map((ls) => ls.level)),
  },
  repel10: {
    id: 'repel10',
    text: 'Repel 10 shakedowns this run.',
    need: 10,
    start: (s) => s.stats.shakedownsRepelled,
    progress: (s, c) => s.stats.shakedownsRepelled - c.from,
  },
  underdog: {
    id: 'underdog',
    text: 'Win an underdog fight: a first win within 5% of the market share it needs.',
    need: 1,
    progress: (s) => s.run.underdog,
  },
  full_district: {
    id: 'full_district',
    text: `Own all ${DISTRICT_LOTS} regular lots in one district.`,
    need: DISTRICT_LOTS,
    progress: (s) => mostIn((a) => forSale(a).filter((l) => s.lots[l.id]).length),
  },
  index130: {
    id: 'index130',
    text: 'Raise the price index to 130.',
    need: 130,
    progress: (s) => Math.floor(s.index),
  },
  street5: {
    id: 'street5',
    text: 'Take 5 street events this run.',
    need: 5,
    progress: (s) => s.run.events,
  },
  managers6: {
    id: 'managers6',
    text: 'Have a Manager on 6 lots in one district.',
    need: 6,
    progress: (s) => mostIn((a) => AREAS[a].lots.filter((l) => s.lots[l.id]?.manager).length),
  },
};

export const COMMISSION_IDS = Object.keys(COMMISSIONS) as CommissionId[];

/** Where a commission stands, for display. */
export function commissionStatus(s: GameState, c: Commission, now: number): { have: number; need: number; missed: boolean } {
  const def = COMMISSIONS[c.id];
  const have = c.done ? def.need : Math.max(0, Math.min(def.need, def.progress(s, c, now)));
  return { have, need: def.need, missed: !c.done && !!def.missed?.(s, now) };
}

/** Three goals for the run starting now. Skips any that are already done, so none come free. */
export function drawCommissions(s: GameState, rng: Rng, now: number): Commission[] {
  const open = COMMISSION_IDS.filter((id) => {
    const def = COMMISSIONS[id];
    const c: Commission = { id, from: def.start?.(s) ?? 0, done: false };
    return def.progress(s, c, now) < def.need && !def.missed?.(s, now);
  });
  return pickDistinct(open, COMMISSIONS_PER_RUN, rng).map((id) => ({ id, from: COMMISSIONS[id].start?.(s) ?? 0, done: false }));
}

/** Marks finished commissions done and pays 1 lottery ticket for each. */
export function checkCommissions(s: GameState, now: number): { state: GameState; events: GameEvent[] } {
  const finished = s.run.commissions.filter((c) => !c.done && !COMMISSIONS[c.id].missed?.(s, now) && COMMISSIONS[c.id].progress(s, c, now) >= COMMISSIONS[c.id].need);
  if (finished.length === 0) return { state: s, events: [] };
  return {
    state: {
      ...s,
      run: { ...s.run, commissions: s.run.commissions.map((c) => (finished.includes(c) ? { ...c, done: true } : c)) },
      currencies: { ...s.currencies, lottery: s.currencies.lottery + finished.length },
    },
    events: finished.map((c) => ({ kind: 'commission' as const, id: c.id })),
  };
}
