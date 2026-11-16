/**
 * This year's headlines: one run-long twist each, picked from three front pages at cash-out.
 * Every one has a clear upside, so picking one is choosing a play style, not taking a penalty.
 * Generic 2000s Taipei news; no real events, people or papers.
 */
import {
  ELECTION_INDEX_MULT,
  FESTIVAL_EVENT_RATE,
  IDOL_RECRUIT_MULT,
  MRT_LOT_DISCOUNT,
  NIGHT_MARKET_MULT,
  REARMED_FACE_PER_WIN,
  REARMED_STRENGTH,
  STOCK_RALLY_PROPERTY,
  TYPHOON_SAFE_HOURS,
} from '../constants';
import type { HeadlineId } from '../types';

export interface HeadlineDef {
  id: HeadlineId;
  name: string;
  /** The big 漢字 headline on the front page. */
  nameZh: string;
  /** The line under the headline: flavor only. */
  deck: string;
  /** The rule for the run, in plain words. `{area}` is the New MRT Line's district. */
  rule: string;
  /** Who it's good for. */
  suits: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export const HEADLINES: Record<HeadlineId, HeadlineDef> = {
  typhoon: {
    id: 'typhoon',
    name: 'Typhoon Days',
    nameZh: '颱風假',
    deck: 'Offices close, everyone stays in, and the shops keep the shutters half up.',
    rule: `Your safe holds ${TYPHOON_SAFE_HOURS} more hours.`,
    suits: 'Playing mostly offline',
  },
  night_market: {
    id: 'night_market',
    name: 'Night Market Fever',
    nameZh: '夜市熱',
    deck: 'Lines around the block for pepper buns, and nobody goes home before 2 a.m.',
    rule: `Night businesses everywhere earn ×${NIGHT_MARKET_MULT} at night, like Zhongshan.`,
    suits: 'Stacking night lots',
  },
  election: {
    id: 'election',
    name: 'Election Year',
    nameZh: '選舉年',
    deck: 'Every candidate promises a new park, a new MRT stop and lower taxes.',
    rule: `The price index grows ${pct(ELECTION_INDEX_MULT - 1)} faster.`,
    suits: 'Buying and ×2 milestones',
  },
  mrt: {
    id: 'mrt',
    name: 'New MRT Line',
    nameZh: '捷運通車',
    deck: 'A new exit opens, and land prices around it are still catching up.',
    rule: `Lots in {area} cost ${pct(MRT_LOT_DISCOUNT)} less.`,
    suits: 'Rushing that district',
  },
  festival: {
    id: 'festival',
    name: 'Temple Festival Year',
    nameZh: '遶境年',
    deck: 'Firecrackers every weekend as the processions wind through the city.',
    rule: `Street events come ${FESTIVAL_EVENT_RATE}× as often, and processions pay double.`,
    suits: 'Playing actively',
  },
  idol: {
    id: 'idol',
    name: 'Idol Drama Craze',
    nameZh: '偶像劇熱',
    deck: 'Everyone wants to be discovered, and everyone wants a job in the city.',
    rule: `Walk-in recruits turn up ${IDOL_RECRUIT_MULT}× as often.`,
    suits: 'Collecting cards',
  },
  stock_rally: {
    id: 'stock_rally',
    name: 'Stock Rally',
    nameZh: '股市狂飆',
    deck: 'The index is up again, and suddenly everyone is a property expert.',
    rule: `Your properties count ${STOCK_RALLY_PROPERTY}× toward net worth, so cashing out pays more Face.`,
    suits: 'Chasing Face',
  },
  rearmed: {
    id: 'rearmed',
    name: 'Rearmed Rivals',
    nameZh: '重整旗鼓',
    deck: 'The gangs have regrouped over the winter, and they remember you.',
    rule: `Rivals are ${pct(REARMED_STRENGTH - 1)} stronger. Every first win pays double incense and +${REARMED_FACE_PER_WIN} Face at cash-out.`,
    suits: 'Fighting',
  },
};

export const HEADLINE_IDS = Object.keys(HEADLINES) as HeadlineId[];
