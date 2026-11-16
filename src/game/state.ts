import { drawCommissions } from './commissions';
import { AREA_ORDER } from './content/areas';
import { STARTERS } from './content/characters';
import { drawOffers } from './headlines';
import { seeded } from './rng';
import { SQUAD_SIZE } from './constants';
import { SAVE_VERSION, START_CASH, START_SAFE_HOURS } from './constants';
import type { AreaId, AreaProgress, GameState } from './types';

export function initialState(now: number): GameState {
  const s = blankState(now);
  // Seeded by the start time, so a fresh state never depends on Math.random.
  return { ...s, run: { ...s.run, commissions: drawCommissions(s, seeded(now), now) } };
}

function blankState(now: number): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeen: now,
    cash: START_CASH,
    safe: 0,
    lifetimeEarned: 0,
    runEarned: 0,
    bestNetWorth: START_CASH,
    index: 100,
    lots: {},
    characters: Object.fromEntries(STARTERS.map((id) => [id, { level: 1, xp: 0, stars: 1 }])),
    areas: Object.fromEntries(AREA_ORDER.map((a) => [a, { lt1: false, lt2: false, boss: false }])) as Record<
      AreaId,
      AreaProgress
    >,
    // The All-around fill of the starters: Hai-shu and A-Di up front, A-Cai behind them.
    // Squads are never re-filled automatically after this.
    squad: ['hai_shu', 'a_di', 'a_cai', ...Array<null>(SQUAD_SIZE - 3).fill(null)],
    currencies: { scratch: 0, incense: 0, lottery: 0 },
    zodiac: null,
    draws: { templePity: 0, lotteryPity: 0, lastFreeTemple: null, fortune: null, count: { scratch: 0, temple: 0, lottery: 0 } },
    binderPaid: [],
    run: { accountant: false, claims: 0, underdog: 0, startedAt: now, headline: null, offers: [], commissions: [], events: 0, agentWin: false, repelled: {} },
    meta: { safeHours: START_SAFE_HOURS, face: 0, faceTotal: 0, squadSlots: 3, runs: 0, chapterClears: 0, xindianClears: 0, upgrades: {}, claimedEver: [] },
    auto: { orders: false, focus: false, budget: 0, staff: false, placed: [], rosterSeen: 0 },
    cooldowns: {},
    hot: null,
    event: null,
    eventIn: 240,
    settings: { numberFormat: 'cjk', buyMode: 1, battleSpeed: 2, battleAuto: true },
    stats: { shakedownsRepelled: 0, shakedownBonus: 0, lotsBought: 0, fightsWon: 0, fightsLost: 0 },
    shakedownIn: 120,
  };
}

/**
 * Upgrades an older save to the current shape. Each version bump adds a step here.
 * Unknown or broken input returns null so the caller can start fresh.
 */
export function migrate(raw: unknown, now: number): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<GameState>;
  if (typeof s.version !== 'number' || s.version > SAVE_VERSION) return null;
  // v2 added the squad, currencies and fight stats; v3 added zodiac, draws and the binder;
  // v4 added Face upgrades, cash-out, automation and street events.
  // v5 retired squad auto-fill; save.ts turns an auto squad into a fixed one (turf.ts can't be imported here).
  // v8 added headlines and commissions: see `startHeadlines` below.
  // v9 merged Land Scout into Standing Orders: see `mergeAutomation` below.
  // Filling missing fields from a fresh state covers every step so far, and partial saves still load.
  const base = initialState(now);
  const merged: GameState = {
    ...base,
    ...s,
    run: {
      ...base.run,
      ...s.run,
      // Claims made before v4 still count toward this run's Face.
      claims: s.run?.claims ?? Object.values(s.areas ?? {}).filter((p) => (p as AreaProgress).boss).length,
    },
    meta: {
      ...base.meta,
      ...s.meta,
      upgrades: { ...s.meta?.upgrades },
      chapterClears: s.meta?.chapterClears ?? (s.areas?.xinyi?.boss ? 1 : 0),
      xindianClears: s.meta?.xindianClears ?? (s.areas?.xindian?.boss ? 1 : 0),
      // Saves from before v4 could already have claimed Wanhua.
      claimedEver: s.meta?.claimedEver ?? (Object.entries(s.areas ?? {}) as [AreaId, AreaProgress][]).filter(([, p]) => p.boss).map(([a]) => a),
    },
    auto: { ...base.auto, ...s.auto, placed: Array.isArray(s.auto?.placed) ? s.auto!.placed : [] },
    settings: {
      ...base.settings, ...s.settings,
      // v7 resets the default to 2× once for existing saves; later choices persist.
      battleSpeed: s.version < 7 ? 2 : ([1, 2, 4, 8].includes(s.settings?.battleSpeed ?? 0) ? s.settings!.battleSpeed : 2),
    },
    stats: { ...base.stats, ...s.stats },
    areas: { ...base.areas, ...s.areas },
    characters: { ...base.characters, ...s.characters },
    currencies: { ...base.currencies, ...s.currencies },
    draws: { ...base.draws, ...s.draws, count: { ...base.draws.count, ...s.draws?.count } },
    binderPaid: Array.isArray(s.binderPaid) ? s.binderPaid : [],
    squad: Array.isArray(s.squad) && s.squad.length === base.squad.length ? s.squad : base.squad,
    lots: { ...s.lots },
    version: SAVE_VERSION,
  };
  const headlined = s.version < 8 ? startHeadlines(merged, now) : merged;
  return s.version < 9 ? mergeAutomation(headlined, s.auto as { upgrade?: AreaId[]; buy?: boolean } | undefined) : headlined;
}

/** Face cost of Land Scout, refunded to anyone who owned both it and Standing Orders. */
const LAND_SCOUT_FACE = 20;

/**
 * v9: Land Scout (auto-buy) and per-district Standing Orders became one Standing Orders that buys
 * the best buy anywhere, new lots included. Owning either one now means owning Standing Orders;
 * owning both refunds Land Scout's Face. It's on if you own it, as if just bought.
 */
function mergeAutomation(s: GameState, old: { upgrade?: AreaId[]; buy?: boolean } | undefined): GameState {
  const { auto_buy: scout = 0, ...upgrades } = s.meta.upgrades;
  const hadOrders = (upgrades.auto_upgrade ?? 0) > 0;
  if (scout > 0 && !hadOrders) upgrades.auto_upgrade = 1;
  const refund = scout > 0 && hadOrders ? LAND_SCOUT_FACE : 0;
  const owns = (upgrades.auto_upgrade ?? 0) > 0;
  const { upgrade: _upgrade, buy: _buy, ...auto } = { ...s.auto, ...(old ?? {}) } as GameState['auto'] & { upgrade?: AreaId[]; buy?: boolean };
  return {
    ...s,
    meta: { ...s.meta, upgrades, face: s.meta.face + refund },
    auto: { ...auto, orders: owns, focus: false, budget: 0, placed: [], rosterSeen: Object.keys(s.characters).length },
  };
}

/**
 * v8: a save from before headlines and commissions gets them for the run it's already in.
 * The run's timer starts now, commissions already done are skipped, and a player who has
 * cashed out before gets this year's three front pages to pick from straight away.
 */
function startHeadlines(s: GameState, now: number): GameState {
  const rng = seeded(now);
  return {
    ...s,
    run: {
      ...s.run,
      startedAt: now,
      headline: null,
      offers: s.meta.runs > 0 ? drawOffers(rng) : [],
      commissions: drawCommissions(s, rng, now),
      events: 0,
      agentWin: false,
    },
  };
}
