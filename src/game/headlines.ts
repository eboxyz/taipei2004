/** This run's headline: what it changes, and the three front pages offered at cash-out. */
import { AREAS, AREA_ORDER } from './content/areas';
import { HEADLINES, HEADLINE_IDS } from './content/headlines';
import {
  ELECTION_INDEX_MULT,
  FESTIVAL_EVENT_RATE,
  FESTIVAL_PROCESSION_MULT,
  HEADLINE_OFFERS,
  IDOL_RECRUIT_MULT,
  MRT_LOT_DISCOUNT,
  REARMED_STRENGTH,
  STOCK_RALLY_PROPERTY,
  TYPHOON_SAFE_HOURS,
} from './constants';
import { pickDistinct, type Rng } from './rng';
import type { AreaId, GameState, Headline, HeadlineId } from './types';

export function headlineIs(s: GameState, id: HeadlineId): boolean {
  return s.run.headline?.id === id;
}

/** What this run's headline changes. Each gives the neutral value when another headline (or none) is running. */
export const news = {
  safeHours: (s: GameState) => (headlineIs(s, 'typhoon') ? TYPHOON_SAFE_HOURS : 0),
  nightMarket: (s: GameState) => headlineIs(s, 'night_market'),
  indexMult: (s: GameState) => (headlineIs(s, 'election') ? ELECTION_INDEX_MULT : 1),
  lotDiscount: (s: GameState, area: AreaId) => (headlineIs(s, 'mrt') && s.run.headline?.area === area ? MRT_LOT_DISCOUNT : 0),
  eventRate: (s: GameState) => (headlineIs(s, 'festival') ? FESTIVAL_EVENT_RATE : 1),
  processionMult: (s: GameState) => (headlineIs(s, 'festival') ? FESTIVAL_PROCESSION_MULT : 1),
  recruitMult: (s: GameState) => (headlineIs(s, 'idol') ? IDOL_RECRUIT_MULT : 1),
  propertyMult: (s: GameState) => (headlineIs(s, 'stock_rally') ? STOCK_RALLY_PROPERTY : 1),
  rivalMult: (s: GameState) => (headlineIs(s, 'rearmed') ? REARMED_STRENGTH : 1),
};

/** The run's rule in plain words, with the New MRT Line's district filled in. */
export function headlineRule(h: Headline): string {
  return HEADLINES[h.id].rule.replace('{area}', h.area ? AREAS[h.area].name : 'one district');
}

/** Districts a New MRT Line can open in (the Chapter 1 districts). */
const MRT_AREAS = AREA_ORDER.filter((a) => !AREAS[a].secret);

/** Three different front pages for the coming run. */
export function drawOffers(rng: Rng): Headline[] {
  return pickDistinct(HEADLINE_IDS, HEADLINE_OFFERS, rng).map((id) =>
    id === 'mrt' ? { id, area: MRT_AREAS[Math.floor(rng() * MRT_AREAS.length)]! } : { id },
  );
}

/** Picks one of the waiting front pages as this run's headline. */
export function pickHeadline(state: GameState, index: number): GameState {
  const h = state.run.offers[index];
  if (!h) return state;
  return { ...state, run: { ...state.run, headline: h, offers: [] } };
}
