/**
 * Draws: scratch cards, temple fortune sticks (with moon blocks) and the lottery.
 * Everything here is pure: pass in an rng and the current time.
 * In-game currencies only. No real money anywhere.
 */
import { payBinderPages } from './binder';
import { CHARACTERS } from './content/characters';
import { ZODIAC_BY_ID, ZODIAC_WEIGHT } from './content/zodiac';
import { MAX_STARS } from './constants';
import type { CharState, Currencies, DrawKind, FactionId, GameState, Rarity, Role } from './types';

export type Rng = () => number;

/** Published odds per card. The lottery draws LOTTERY_BALLS cards per ticket, one of them SR or better. */
export const ODDS: Record<DrawKind, Record<Rarity, number>> = {
  scratch: { N: 0.7, R: 0.275, SR: 0.02, SSR: 0.005 },
  temple: { N: 0.5, R: 0.38, SR: 0.1, SSR: 0.02 },
  lottery: { N: 0, R: 0.6, SR: 0.32, SSR: 0.08 },
};

export const COST: Record<DrawKind, { currency: keyof Currencies; amount: number }> = {
  scratch: { currency: 'scratch', amount: 1 },
  temple: { currency: 'incense', amount: 10 },
  lottery: { currency: 'lottery', amount: 1 },
};

export const TEMPLE_PITY = 10;
export const LOTTERY_PITY = 40;
export const LOTTERY_BALLS = 3;

/** Incense money paid for a duplicate once a card is already ★5. */
export const OVERFLOW_INCENSE: Record<Rarity, number> = { N: 1, R: 2, SR: 5, SSR: 10 };

/** Rotates weekly into the lottery as its featured card (half of its rarity tier). */
export const FEATURED_ROTATION = ['jackpot', 'lao_zhang', 'a_tai', 'chen_daishu', 'a_xiong'];

const WEEK_MS = 7 * 24 * 3600 * 1000;
/** A Monday, so featured weeks start on Mondays (UTC). */
const WEEK_EPOCH = Date.UTC(2024, 0, 1);

export function featuredOn(now: number): string {
  const week = Math.floor((now - WEEK_EPOCH) / WEEK_MS);
  const n = FEATURED_ROTATION.length;
  return FEATURED_ROTATION[((week % n) + n) % n]!;
}

/** Ms until the featured card changes. */
export function featuredEndsIn(now: number): number {
  return WEEK_MS - ((((now - WEEK_EPOCH) % WEEK_MS) + WEEK_MS) % WEEK_MS);
}

/** Local calendar day, for the free daily temple visit. */
export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whether a character can come out of a draw. Starters and "All" cards are in every draw; exclusives only in theirs. */
export function inPool(id: string, kind: DrawKind, now: number): boolean {
  const def = CHARACTERS[id];
  if (!def || def.rarity === 'NPC') return false;
  switch (def.source) {
    case 'all':
    case 'starter':
      return true;
    case 'scratch':
    case 'temple':
    case 'lottery':
      return def.source === kind || (kind === 'lottery' && id === featuredOn(now));
    default:
      return false;
  }
}

export function poolFor(kind: DrawKind, rarity: Rarity, now: number): string[] {
  return Object.values(CHARACTERS)
    .filter((c) => c.rarity === rarity && inPool(c.id, kind, now))
    .map((c) => c.id);
}

const RARITIES: Rarity[] = ['N', 'R', 'SR', 'SSR'];

export function rollRarity(kind: DrawKind, rng: Rng): Rarity {
  const r = rng();
  let acc = 0;
  for (const rar of RARITIES) {
    acc += ODDS[kind][rar];
    if (r < acc) return rar;
  }
  return 'N';
}

/** SR or SSR, in the draw's own SR:SSR proportion. */
function rollHigh(kind: DrawKind, rng: Rng): Rarity {
  const { SR, SSR } = ODDS[kind];
  return rng() < SSR / (SR + SSR) ? 'SSR' : 'SR';
}

/** Chance weights inside one rarity tier: zodiac roles ×1.5; the featured card is half the lottery tier. */
export function tierWeights(state: GameState, kind: DrawKind, rarity: Rarity, now: number): { id: string; w: number }[] {
  const pool = poolFor(kind, rarity, now);
  const favoured: Role[] = state.zodiac ? ZODIAC_BY_ID[state.zodiac].roles : [];
  const weights = pool.map((id) => ({ id, w: favoured.includes(CHARACTERS[id]!.role!) ? ZODIAC_WEIGHT : 1 }));
  if (kind === 'lottery') {
    const feat = weights.find((x) => x.id === featuredOn(now));
    const rest = weights.filter((x) => x !== feat).reduce((s, x) => s + x.w, 0);
    if (feat && rest > 0) feat.w = rest;
  }
  return weights;
}

export function pickCard(state: GameState, kind: DrawKind, rarity: Rarity, rng: Rng, now: number): string {
  const weights = tierWeights(state, kind, rarity, now);
  const total = weights.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  for (const x of weights) {
    r -= x.w;
    if (r < 0) return x.id;
  }
  return weights[weights.length - 1]!.id;
}

/* ---------- Adding cards ---------- */

export interface CardGain {
  charId: string;
  rarity: Rarity;
  isNew: boolean;
  starsBefore: number;
  starsAfter: number;
  /** Incense paid for a duplicate past ★5. */
  incense: number;
  /** The card's state before this gain, so a moon-block upgrade can undo it. */
  prev: CharState | null;
}

/** Adds a card: new cards join at Lv1 ★1, duplicates add a star, and past ★5 they trade in for incense. */
export function addCard(state: GameState, charId: string): { state: GameState; gain: CardGain } {
  const def = CHARACTERS[charId]!;
  const rarity = def.rarity === 'NPC' ? 'N' : def.rarity;
  const cs = state.characters[charId];
  if (!cs) {
    return {
      state: { ...state, characters: { ...state.characters, [charId]: { level: 1, xp: 0, stars: 1 } } },
      gain: { charId, rarity, isNew: true, starsBefore: 0, starsAfter: 1, incense: 0, prev: null },
    };
  }
  if (cs.stars < MAX_STARS) {
    return {
      state: { ...state, characters: { ...state.characters, [charId]: { ...cs, stars: cs.stars + 1 } } },
      gain: { charId, rarity, isNew: false, starsBefore: cs.stars, starsAfter: cs.stars + 1, incense: 0, prev: cs },
    };
  }
  const incense = OVERFLOW_INCENSE[rarity];
  return {
    state: { ...state, currencies: { ...state.currencies, incense: state.currencies.incense + incense } },
    gain: { charId, rarity, isNew: false, starsBefore: cs.stars, starsAfter: cs.stars, incense, prev: cs },
  };
}

/* ---------- Drawing ---------- */

export type StickGrade = '下籤' | '中籤' | '上籤' | '上上籤';
export const STICK_GRADE: Record<Rarity, StickGrade> = { N: '下籤', R: '中籤', SR: '上籤', SSR: '上上籤' };
export const STICK_GRADE_EN: Record<StickGrade, string> = { 下籤: 'Low', 中籤: 'Middle', 上籤: 'High', 上上籤: 'Highest' };

export interface DrawResult {
  kind: DrawKind;
  gains: CardGain[];
  /** Temple only: the stick that fell. */
  stick?: { number: number; grade: StickGrade };
  free: boolean;
  /** A guarantee counter decided this draw. */
  pity: boolean;
  binderPages: FactionId[];
}

export function canDraw(state: GameState, kind: DrawKind, now: number): { ok: boolean; free: boolean; reason?: string } {
  if (!state.zodiac) return { ok: false, free: false, reason: 'Pick your zodiac first' };
  if (kind === 'temple' && state.draws.lastFreeTemple !== dayKey(now)) return { ok: true, free: true };
  const { currency, amount } = COST[kind];
  if (state.currencies[currency] < amount) return { ok: false, free: false, reason: 'Not enough' };
  return { ok: true, free: false };
}

export function draw(state: GameState, kind: DrawKind, rng: Rng, now: number): { ok: true; state: GameState; result: DrawResult } | { ok: false; reason: string } {
  const check = canDraw(state, kind, now);
  if (!check.ok) return { ok: false, reason: check.reason ?? 'Not enough' };
  const { currency, amount } = COST[kind];
  let s: GameState = check.free
    ? { ...state, draws: { ...state.draws, lastFreeTemple: dayKey(now) } }
    : { ...state, currencies: { ...state.currencies, [currency]: state.currencies[currency] - amount } };

  let rarities: Rarity[];
  let pity = false;
  const d = { ...s.draws, count: { ...s.draws.count, [kind]: s.draws.count[kind] + 1 } };
  if (kind === 'scratch') {
    rarities = [rollRarity('scratch', rng)];
  } else if (kind === 'temple') {
    let r = rollRarity('temple', rng);
    if ((r === 'N' || r === 'R') && d.templePity + 1 >= TEMPLE_PITY) {
      r = rollHigh('temple', rng);
      pity = true;
    }
    d.templePity = r === 'SR' || r === 'SSR' ? 0 : d.templePity + 1;
    rarities = [r];
  } else {
    rarities = Array.from({ length: LOTTERY_BALLS }, () => rollRarity('lottery', rng));
    if (!rarities.includes('SSR') && d.lotteryPity + 1 >= LOTTERY_PITY) {
      rarities[LOTTERY_BALLS - 1] = 'SSR';
      pity = true;
    } else if (!rarities.some((r) => r === 'SR' || r === 'SSR')) {
      rarities[LOTTERY_BALLS - 1] = 'SR';
    }
    d.lotteryPity = rarities.includes('SSR') ? 0 : d.lotteryPity + 1;
  }
  s = { ...s, draws: d };

  const gains: CardGain[] = [];
  for (const rar of rarities) {
    const r = addCard(s, pickCard(s, kind, rar, rng, now));
    s = r.state;
    gains.push(r.gain);
  }
  const paid = payBinderPages(s);
  const stick = kind === 'temple' ? { number: 1 + Math.floor(rng() * 60), grade: STICK_GRADE[rarities[0]!] } : undefined;
  return { ok: true, state: paid.state, result: { kind, gains, stick, free: check.free, pity, binderPages: paid.pages } };
}

/* ---------- Moon blocks 擲筊 ---------- */

/** 聖筊 (one flat, one round: yes), 笑筊 (both flat: the gods laugh), 陰筊 (both round: no). */
export type Block = 'sheng' | 'xiao' | 'yin';
export const BLOCK_ZH: Record<Block, string> = { sheng: '聖筊', xiao: '笑筊', yin: '陰筊' };
export const BLOCK_EN: Record<Block, string> = { sheng: 'Yes', xiao: 'Laughing', yin: 'No' };
export const BLOCKS_NEEDED = 3;

/** Throws until a non-聖筊 or three 聖筊 in a row (12.5%). */
export function throwBlocks(rng: Rng): Block[] {
  const out: Block[] = [];
  while (out.length < BLOCKS_NEEDED) {
    const r = rng();
    const b: Block = r < 0.5 ? 'sheng' : r < 0.75 ? 'xiao' : 'yin';
    out.push(b);
    if (b !== 'sheng') break;
  }
  return out;
}

const NEXT: Partial<Record<Rarity, Rarity>> = { N: 'R', R: 'SR', SR: 'SSR' };

/**
 * After a temple draw: throw the moon blocks once. Three 聖筊 swap the card for one of the
 * next rarity. Anything else keeps it, so a throw can never make things worse.
 */
export function throwForUpgrade(
  state: GameState,
  gain: CardGain,
  rng: Rng,
  now: number,
): { state: GameState; throws: Block[]; upgraded: CardGain | null; binderPages: FactionId[] } {
  const next = NEXT[gain.rarity];
  const throws = throwBlocks(rng);
  if (!next || throws.length < BLOCKS_NEEDED || throws.some((b) => b !== 'sheng')) return { state, throws, upgraded: null, binderPages: [] };
  // Undo the original card, then add one of the next rarity.
  const characters = { ...state.characters };
  if (gain.prev) characters[gain.charId] = gain.prev;
  else delete characters[gain.charId];
  let s: GameState = { ...state, characters, currencies: { ...state.currencies, incense: state.currencies.incense - gain.incense } };
  const r = addCard(s, pickCard(s, 'temple', next, rng, now));
  s = r.state;
  const paid = payBinderPages(s);
  return { state: paid.state, throws, upgraded: r.gain, binderPages: paid.pages };
}
