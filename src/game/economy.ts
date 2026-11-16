import { AREAS, AREA_ORDER, ALL_LOTS } from './content/areas';
import { CATEGORIES } from './content/categories';
import { CHARACTERS } from './content/characters';
import { binderIncomeMult, binderLotDiscount, binderSafeHours } from './binder';
import { statsOf } from './characters';
import { news } from './headlines';
import { perk } from './perks';
import {
  AVERAGE_PHASE_MULT,
  XINDIAN_OFFLINE_MULT,
  CLAIM_LOT_DISCOUNT,
  EAST_HOT_ORDER,
  HOT_MULT,
  IN_PHASE_MULT,
  LOCAL_MANAGER_MULT,
  START_SAFE_HOURS,
  ZHONGSHAN_NIGHT_MULT,
  MAX_SAFE_HOURS,
  MILESTONES,
  NIGHT_MARKET_MULT,
  RIVAL_STAKE,
  UPGRADE_BASE,
  UPGRADE_GROWTH,
} from './constants';
import type { AreaId, BuyMode, GameState, IncomeMode, LotDef } from './types';

export function milestoneMult(level: number): number {
  let m = 1;
  for (const t of MILESTONES) if (level >= t) m *= 2;
  return m;
}

export function nextMilestone(level: number): number | null {
  return MILESTONES.find((t) => t > level) ?? null;
}

export function milestonesCrossed(from: number, to: number): number[] {
  return MILESTONES.filter((t) => t > from && t <= to);
}

function roleOf(charId: string | undefined) {
  return charId ? CHARACTERS[charId]?.role ?? null : null;
}

/** Locals: crew from a district's own gang know the neighborhood. */
export function isLocal(charId: string | undefined, area: AreaId): boolean {
  return !!charId && CHARACTERS[charId]?.faction === AREAS[area].rival;
}

/** Multiplier from the lot's Manager (Business stat, plus the 店長 and local bonuses). */
export function managerMult(state: GameState, lotId: string): number {
  const mgr = state.lots[lotId]?.manager;
  if (!mgr) return 1;
  const { business } = statsOf(mgr, state.characters[mgr]);
  let m = 1 + business / 100;
  if (roleOf(mgr) === 'dianzhang') m *= 1.25;
  const lot = ALL_LOTS[lotId];
  if (lot && isLocal(mgr, lot.area)) m *= LOCAL_MANAGER_MULT;
  return m;
}

export function phaseMult(state: GameState, lot: LotDef, mode: IncomeMode): number {
  // Zhongshan is a night town: its lots earn more at night than anywhere else.
  // Night Market Fever makes every night business earn like that.
  const tag = CATEGORIES[lot.category]?.tag;
  const nightTown = lot.area === 'zhongshan' || (news.nightMarket(state) && tag === 'night');
  const inPhase = nightTown ? Math.max(ZHONGSHAN_NIGHT_MULT, NIGHT_MARKET_MULT) : IN_PHASE_MULT;
  if (mode === 'average') return nightTown ? (1 + inPhase) / 2 : AVERAGE_PHASE_MULT;
  return tag === mode ? inPhase : 1;
}

/** East District's hot business type: ×2 while it's hot. Offline uses the average over the rotation. */
export function hotMult(state: GameState, lot: LotDef, mode: IncomeMode): number {
  if (lot.area !== 'east') return 1;
  if (mode === 'average') return 1 + (HOT_MULT - 1) / EAST_HOT_ORDER.length;
  return state.hot === lot.category ? HOT_MULT : 1;
}

/**
 * Every multiplier on a lot's income. Their product is the lot's income; `income.ts` groups them
 * into the four sources players see. `level` lets you price a lot you don't own yet (level 1).
 */
export interface IncomeBreakdown {
  /** NT$/s at level 1 with no bonuses. */
  base: number;
  level: number;
  milestones: number;
  phase: number;
  hot: number;
  claim: number;
  manager: number;
  goodName: number;
  binder: number;
  index: number;
}

export function incomeBreakdown(state: GameState, lot: LotDef, mode: IncomeMode, level = state.lots[lot.id]?.level ?? 1): IncomeBreakdown {
  return {
    base: lot.income,
    level,
    milestones: milestoneMult(level),
    phase: phaseMult(state, lot, mode),
    hot: hotMult(state, lot, mode),
    claim: state.areas[lot.area]?.boss ? 2 : 1,
    manager: managerMult(state, lot.id),
    goodName: perk.incomeMult(state),
    binder: binderIncomeMult(state, lot.area),
    index: state.index / 100,
  };
}

/** NT$/s from a breakdown. */
export function incomeOf(b: IncomeBreakdown): number {
  return b.base * b.level * b.milestones * b.phase * b.manager * b.claim * b.hot * b.goodName * b.binder * b.index;
}

export function lotIncome(state: GameState, lot: LotDef, mode: IncomeMode): number {
  if (!state.lots[lot.id]) return 0;
  return incomeOf(incomeBreakdown(state, lot, mode));
}

export function incomePerSec(state: GameState, mode: IncomeMode): number {
  let total = 0;
  for (const id of Object.keys(state.lots)) {
    const lot = ALL_LOTS[id];
    if (lot) total += lotIncome(state, lot, mode);
  }
  return total;
}

export function areaIncome(state: GameState, area: AreaId, mode: IncomeMode): number {
  return AREAS[area].lots.reduce((sum, lot) => sum + lotIncome(state, lot, mode), 0);
}

export function safeHours(state: GameState): number {
  const accountants = Object.values(state.lots).filter((ls) => roleOf(ls.manager) === 'kuaiji').length;
  // Typhoon Days goes past the usual cap.
  return Math.min(MAX_SAFE_HOURS, START_SAFE_HOURS + perk.safeHours(state) + accountants + binderSafeHours(state)) + news.safeHours(state);
}

/** Safe capacity in NT$: N hours of average income. */
export function safeCapacity(state: GameState): number {
  return offlineIncomePerSec(state) * safeHours(state) * 3600;
}

export function brokerDiscount(state: GameState, area: AreaId): number {
  const brokers = AREAS[area].lots.filter((l) => roleOf(state.lots[l.id]?.manager) === 'fangzhong').length;
  return Math.min(0.25, brokers * 0.05);
}

export function buyPrice(state: GameState, lot: LotDef): number {
  const claimed = state.areas[lot.area]?.boss ? 1 - CLAIM_LOT_DISCOUNT : 1;
  return Math.ceil(
    lot.price *
      (1 - brokerDiscount(state, lot.area)) *
      (1 - binderLotDiscount(state)) *
      (1 - perk.lotDiscount(state)) *
      (1 - news.lotDiscount(state, lot.area)) *
      claimed,
  );
}

/** Cost to go from `level` to `level + 1`. */
export function upgradeCost(state: GameState, lot: LotDef, level: number): number {
  const scrivener = roleOf(state.lots[lot.id]?.manager) === 'daishu' ? 0.9 : 1;
  return Math.ceil(lot.price * UPGRADE_BASE * Math.pow(UPGRADE_GROWTH, level - 1) * scrivener * (1 - perk.upgradeDiscount(state)));
}

/** Total cost of `n` upgrades starting from `level`. */
export function upgradeCostN(state: GameState, lot: LotDef, level: number, n: number): number {
  if (n <= 0) return 0;
  const c0 = upgradeCost(state, lot, level);
  return Math.ceil((c0 * (Math.pow(UPGRADE_GROWTH, n) - 1)) / (UPGRADE_GROWTH - 1));
}

/** Most upgrades affordable with `cash`, starting from `level`. */
export function maxAffordableUpgrades(state: GameState, lot: LotDef, level: number, cash: number): number {
  const c0 = upgradeCost(state, lot, level);
  if (cash < c0) return 0;
  let n = Math.floor(Math.log((cash * (UPGRADE_GROWTH - 1)) / c0 + 1) / Math.log(UPGRADE_GROWTH));
  while (n > 0 && upgradeCostN(state, lot, level, n) > cash) n -= 1;
  return n;
}

/**
 * How many upgrades a buy mode means for a lot at `level`. 'next' goes to the next ×2
 * milestone (10 levels at a time once every milestone is reached). 0 means 'max' can't afford one.
 */
export function upgradeCountFor(state: GameState, lot: LotDef, level: number, mode: BuyMode): number {
  if (mode === 'max') return maxAffordableUpgrades(state, lot, level, state.cash);
  if (mode === 'next') {
    const m = nextMilestone(level);
    return m ? m - level : 10;
  }
  return mode;
}

export function isAreaOpen(state: GameState, area: AreaId): boolean {
  const i = AREA_ORDER.indexOf(area);
  if (i <= 0) return true;
  if (AREAS[area].secret) return state.meta.chapterClears > 0 && state.areas.xinyi.boss;
  const prev = AREA_ORDER[i - 1];
  return prev ? state.areas[prev].boss : false;
}

export function isLotLocked(state: GameState, lot: LotDef): boolean {
  if (!lot.lock) return false;
  if (lot.lock === 'xiaoxiao') return !state.areas.xindian.lt2;
  return !state.areas[lot.area][lot.lock];
}

export function marketShare(state: GameState, area: AreaId): number {
  // Once the boss is beaten the gang is gone. Only lots still for sale count against you,
  // so owning every buyable lot in a claimed area is exactly 100%.
  const claimed = state.areas[area].boss;
  let yours = 0;
  let rival = claimed ? 0 : AREAS[area].rivalBase;
  for (const lot of AREAS[area].lots) {
    const ls = state.lots[lot.id];
    if (ls) yours += ls.invested;
    else if (claimed) {
      if (!isLotLocked(state, lot)) rival += lot.price * RIVAL_STAKE;
    }
    // Lieutenant-held lots are part of the gang's base stake, so unlocking them never drops your share.
    else if (lot.lock !== 'lt1' && lot.lock !== 'lt2') rival += lot.price * RIVAL_STAKE;
  }
  return yours + rival === 0 ? 0 : yours / (yours + rival);
}

export function netWorth(state: GameState): number {
  const property = Object.values(state.lots).reduce((s, ls) => s + ls.invested, 0);
  return state.cash + state.safe + property * (state.index / 100) * news.propertyMult(state);
}

/** Where a character is currently posted, if anywhere. */
export function postOf(state: GameState, charId: string): { lotId: string; slot: 'manager' | 'security' } | null {
  for (const [lotId, ls] of Object.entries(state.lots)) {
    if (ls.manager === charId) return { lotId, slot: 'manager' };
    if (ls.security === charId) return { lotId, slot: 'security' };
  }
  return null;
}

/** Literal property ownership for map progress; separate from investment-weighted battle influence. */
export function lotOwnership(state: GameState, area: AreaId): { owned: number; total: number; fraction: number } {
  const lots = AREAS[area].lots;
  const owned = lots.filter((lot) => !!state.lots[lot.id]).length;
  return { owned, total: lots.length, fraction: lots.length ? owned / lots.length : 0 };
}

/** Average away income: only Xindian lots receive the commuter bonus. */
export function offlineIncomePerSec(state: GameState): number {
  let total = 0;
  for (const id of Object.keys(state.lots)) {
    const lot = ALL_LOTS[id];
    if (lot) total += lotIncome(state, lot, 'average') * (lot.area === 'xindian' ? XINDIAN_OFFLINE_MULT : 1);
  }
  return total;
}
