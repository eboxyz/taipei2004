import { describe, expect, it } from 'vitest';
import { buyLot } from './actions';
import { autoStaff, automate, dutyRoster, ordersScope, standingOrders } from './auto';
import { ALL_LOTS, AREAS } from './content/areas';
import { FIGHTS } from './content/fights';
import { CLAIM_INDEX, FACE_DIVISOR, START_CASH } from './constants';
import { buyPrice, incomePerSec, lotIncome, marketShare } from './economy';
import { claimEvent, tickEvents } from './events';
import { buyFaceUpgrade, canCashOut, cashOut, cashOutPreview, faceCost, startRun } from './face';
import { initialState, migrate } from './state';
import { hotCategory, tick } from './tick';
import { rematchCooldown, resolveFight } from './turf';
import type { GameState } from './types';

const NOW = Date.UTC(2004, 0, 1, 8);

function withLots(ids: string[], level = 1): GameState {
  const s = initialState(NOW);
  return { ...s, lots: Object.fromEntries(ids.map((id) => [id, { level, invested: ALL_LOTS[id]!.price }])) };
}

function claimed(s: GameState, area: keyof GameState['areas']): GameState {
  return { ...s, areas: { ...s.areas, [area]: { lt1: true, lt2: true, boss: true } } };
}

describe('areas', () => {
  it('every area has ~10 lots with a Xiaoxiao branch and two lieutenant lots', () => {
    for (const a of ['wanhua', 'ximending', 'zhongshan', 'east', 'xinyi'] as const) {
      const lots = AREAS[a].lots;
      expect(lots.length).toBe(9);
      expect(lots.filter((l) => l.lock === 'xiaoxiao')).toHaveLength(1);
      expect(lots.filter((l) => l.lock === 'lt1')).toHaveLength(1);
      expect(lots.filter((l) => l.lock === 'lt2')).toHaveLength(1);
    }
  });

  it('every area has three fights', () => {
    for (const a of ['wanhua', 'ximending', 'zhongshan', 'east', 'xinyi'])
      expect(Object.values(FIGHTS).filter((f) => f.area === a).map((f) => f.key).sort()).toEqual(['boss', 'lt1', 'lt2']);
  });

  it('Zhongshan earns ×2 at night', () => {
    const s = withLots(['z1']);
    const lot = ALL_LOTS.z1!;
    expect(lotIncome(s, lot, 'night') / lotIncome(s, lot, 'day')).toBeCloseTo(2);
  });

  it("East District's hot type earns double", () => {
    const hot = hotCategory(NOW);
    const lot = AREAS.east.lots.find((l) => l.category === hot)!;
    const other = AREAS.east.lots.find((l) => l.category !== hot && !l.lock)!;
    const s = { ...withLots([lot.id, other.id]), hot };
    expect(lotIncome(s, lot, 'day') / (lot.income * (s.index / 100))).toBeGreaterThan(lotIncome(s, other, 'day') / (other.income * (s.index / 100)));
  });

  it('lots in a claimed area cost 25% less', () => {
    const s = initialState(NOW);
    expect(buyPrice(claimed(s, 'wanhua'), ALL_LOTS.w5!)).toBe(Math.ceil(ALL_LOTS.w5!.price * 0.75));
  });
});

describe('cash-out and Face', () => {
  it('opens once Wanhua has ever been claimed', () => {
    const s = initialState(NOW);
    expect(canCashOut(s)).toBe(false);
    const won = resolveFight(claimed({ ...s, areas: { ...s.areas, wanhua: { lt1: true, lt2: true, boss: false } } }, 'xinyi'), 'wanhua_boss', 'win');
    expect(canCashOut(won.state)).toBe(true);
  });

  it('Face comes from net worth, claims and underdog wins', () => {
    const base = initialState(NOW);
    const s = { ...base, bestNetWorth: 100 * FACE_DIVISOR, run: { ...base.run, claims: 2, underdog: 1 } };
    const p = cashOutPreview(s);
    expect(p.fromWorth).toBe(10);
    expect(p.face).toBe(10 + 4 + 1);
    expect(p.nextWorth).toBe(121 * FACE_DIVISOR);
  });

  it('resets the run but keeps cards, currencies, Face and slots', () => {
    let s = withLots(['w1', 'w2'], 30);
    s = {
      ...s,
      cash: 1e12,
      bestNetWorth: 1e12,
      index: 140,
      currencies: { scratch: 3, incense: 50, lottery: 1 },
      characters: { ...s.characters, kun_bo: { level: 9, xp: 0, stars: 2 } },
      meta: { ...s.meta, squadSlots: 6, claimedEver: ['wanhua'] },
      areas: { ...s.areas, wanhua: { lt1: true, lt2: true, boss: true } },
    };
    const { state, face } = cashOut(s, NOW);
    expect(face).toBeGreaterThan(0);
    expect(state.lots).toEqual({});
    expect(state.cash).toBe(START_CASH);
    expect(state.index).toBe(100);
    expect(state.areas.wanhua.boss).toBe(false);
    expect(state.characters.kun_bo).toEqual({ level: 9, xp: 0, stars: 2 });
    expect(state.currencies).toEqual({ scratch: 3, incense: 50, lottery: 2 });
    expect(state.meta.squadSlots).toBe(6);
    expect(state.meta.face).toBe(face);
    expect(state.meta.runs).toBe(1);
  });

  it('upgrades cost Face, cap at their max, and apply', () => {
    let s = { ...initialState(NOW), meta: { ...initialState(NOW).meta, face: 1000 } };
    const before = incomePerSec(withLots(['w1']), 'day');
    const r = buyFaceUpgrade(s, 'income');
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    expect(s.meta.face).toBe(1000 - faceCost('income', 0));
    expect(incomePerSec({ ...withLots(['w1']), meta: s.meta }, 'day')).toBeCloseTo(before * 1.25);
    for (let i = 0; i < 5; i++) {
      const b = buyFaceUpgrade(s, 'bookkeeper');
      if (b.ok) s = b.state;
    }
    expect(s.meta.upgrades.bookkeeper).toBe(1);
    expect(s.run.accountant).toBe(true);
  });

  it('a new run starts with Seed Money, Old Turf and the bookkeeper', () => {
    const base = initialState(NOW);
    const s = startRun({ ...base, meta: { ...base.meta, upgrades: { seed: 2, old_turf: 1, bookkeeper: 1 } } });
    expect(s.cash).toBe(START_CASH * 100);
    expect(s.lots.w1?.level).toBe(10);
    expect(s.lots.w2?.level).toBe(10);
    expect(s.lots.w3).toBeUndefined();
    expect(s.run.accountant).toBe(true);
    expect(s.index).toBeGreaterThan(100);
  });
});

describe('claims', () => {
  it('claiming jumps the index, counts the claim, and opens the next area', () => {
    const s = initialState(NOW);
    const { state, result } = resolveFight(s, 'wanhua_boss', 'win');
    expect(result.claimed).toBe(true);
    expect(state.index).toBe(s.index + CLAIM_INDEX);
    expect(state.run.claims).toBe(1);
    expect(state.meta.claimedEver).toContain('wanhua');
  });

  it('a win right at the threshold is an underdog win', () => {
    const base = withLots(['w1']);
    const rival = base.lots.w1!.invested * (1 / marketShare(base, 'wanhua') - 1);
    const atThreshold = { ...base, lots: { w1: { ...base.lots.w1!, invested: rival / 3 + 1 } } };
    expect(marketShare(atThreshold, 'wanhua')).toBeCloseTo(0.25);
    const r = resolveFight(atThreshold, 'wanhua_lt1', 'win');
    expect(r.result.underdog).toBe(true);
    expect(r.state.run.underdog).toBe(1);
  });

  it('claiming Xinyi plays the full fireworks once, then the short version', () => {
    const first = resolveFight(initialState(NOW), 'xinyi_boss', 'win');
    expect(first.result.fireworks).toBe('full');
    expect(first.state.meta.chapterClears).toBe(1);
    const again = resolveFight({ ...first.state, areas: initialState(NOW).areas }, 'xinyi_boss', 'win');
    expect(again.result.fireworks).toBe('short');
  });

  it('rematch rewards cool down for 5 minutes', () => {
    const won = resolveFight(initialState(NOW), 'wanhua_lt1', 'win', NOW).state;
    const r1 = resolveFight(won, 'wanhua_lt1', 'win', NOW);
    expect(r1.result.scratch).toBe(1);
    expect(rematchCooldown(r1.state, 'wanhua_lt1', NOW)).toBeGreaterThan(0);
    const r2 = resolveFight(r1.state, 'wanhua_lt1', 'win', NOW + 60_000);
    expect(r2.result.cooling).toBe(true);
    expect(r2.result.xp).toBe(0);
    expect(r2.state.currencies.scratch).toBe(1);
    const r3 = resolveFight(r1.state, 'wanhua_lt1', 'win', NOW + 6 * 60_000);
    expect(r3.result.scratch).toBe(1);
  });
});

describe('automation', () => {
  const orders = (s: GameState, budget: number): GameState => ({
    ...s,
    meta: { ...s.meta, upgrades: { ...s.meta.upgrades, auto_upgrade: 1 } },
    auto: { ...s.auto, orders: true, budget },
  });

  it('Standing Orders buys new lots too: the best buy anywhere', () => {
    const r = standingOrders(orders({ ...initialState(NOW), cash: 1e5 }, 1e5));
    expect(Object.keys(r.state.lots)).toContain('w1');
    expect(r.events[0]).toEqual({ kind: 'auto-bought', lotId: 'w1' });
  });

  it('Standing Orders only spends its budget: half of what you earn', () => {
    const s = orders({ ...withLots(['w1', 'w2']), cash: 1e6 }, 0);
    expect(standingOrders(s).state.lots).toEqual(s.lots);
    const r = automate(s, 4e5);
    expect(r.state.cash).toBeGreaterThanOrEqual(1e6 - 2e5);
    expect(r.state.cash).toBeLessThan(1e6);
  });

  it('focus spends in the next rival’s district until that fight is ready', () => {
    const base = withLots(['w1', 'w2', 'w3']);
    const s = orders({ ...base, cash: 1e9, areas: { ...base.areas, wanhua: { lt1: true, lt2: true, boss: true } } }, 1e9);
    expect(ordersScope(s).area).toBeNull();
    const focused = { ...s, auto: { ...s.auto, focus: true } };
    expect(ordersScope(focused).area).toBe('ximending');
    const r = standingOrders(focused, 1);
    expect(Object.keys(r.state.lots).some((id) => ALL_LOTS[id]!.area === 'ximending')).toBe(true);
  });

  it('nothing runs without the Face upgrade and the switch', () => {
    const s = { ...initialState(NOW), cash: 1e6, auto: { ...initialState(NOW).auto, orders: true, budget: 1e6 } };
    expect(automate(s).state.lots).toEqual({});
    expect(Object.keys(automate(orders(s, 1e6)).state.lots)).toContain('w1');
    expect(automate({ ...orders(s, 1e6), auto: { ...orders(s, 1e6).auto, orders: false } }).state.lots).toEqual({});
  });

  it('Duty Roster fills empty slots with free crew', () => {
    const s = autoStaff(withLots(['w1']));
    expect(s.lots.w1!.manager).toBe('a_cai');
    expect(['hai_shu', 'a_di']).toContain(s.lots.w1!.security);
  });

  it('Duty Roster re-shuffles its own posts for a newcomer, never yours', () => {
    const roster = (s: GameState): GameState => ({ ...s, meta: { ...s.meta, upgrades: { ...s.meta.upgrades, auto_staff: 1 } }, auto: { ...s.auto, staff: true } });
    let s = dutyRoster(roster(withLots(['w1', 'w2'])));
    expect(s.lots.w2!.manager).toBe('a_cai');
    // A much stronger agent joins: the roster moves its own pick so the newcomer runs the bigger earner.
    s = dutyRoster({ ...s, characters: { ...s.characters, coco: { level: 20, xp: 0, stars: 1 } } });
    expect(s.lots.w2!.manager).toBe('coco');
    expect(s.lots.w1!.manager).toBe('a_cai');
    // A post you set by hand stays put.
    let mine = roster(withLots(['w1', 'w2']));
    mine = { ...mine, lots: { ...mine.lots, w2: { ...mine.lots.w2!, manager: 'a_cai' } }, auto: { ...mine.auto, rosterSeen: Object.keys(mine.characters).length } };
    mine = dutyRoster({ ...mine, characters: { ...mine.characters, coco: { level: 20, xp: 0, stars: 1 } } });
    expect(mine.lots.w2!.manager).toBe('a_cai');
    expect(mine.lots.w1!.manager).toBe('coco');
  });

  it('save v9: Land Scout folds into Standing Orders, and owning both refunds its Face', () => {
    const s = initialState(NOW);
    const old = (upgrades: Record<string, number>) =>
      migrate(JSON.parse(JSON.stringify({ ...s, version: 8, meta: { ...s.meta, face: 5, upgrades }, auto: { upgrade: ['wanhua'], buy: true, staff: false } })), NOW)!;
    const scoutOnly = old({ auto_buy: 1 });
    expect(scoutOnly.meta.upgrades).toEqual({ auto_upgrade: 1 });
    expect(scoutOnly.auto.orders).toBe(true);
    expect(scoutOnly.meta.face).toBe(5);
    const both = old({ auto_buy: 1, auto_upgrade: 1 });
    expect(both.meta.upgrades).toEqual({ auto_upgrade: 1 });
    expect(both.meta.face).toBe(25);
    expect('upgrade' in both.auto).toBe(false);
    expect(old({}).auto.orders).toBe(false);
  });
});

describe('street events', () => {
  it('spawn on an open station, pay out, and expire', () => {
    let s = { ...initialState(NOW), eventIn: 1 };
    s = tickEvents(s, 2, () => 0.1);
    expect(s.event?.area).toBe('wanhua');
    expect(s.event?.kind).toBe('procession');
    const r = claimEvent(s, () => 0.5, NOW);
    expect(r?.reward.cash).toBeGreaterThan(0);
    expect(r?.state.event).toBeNull();
    const gone = tickEvents(s, 200, () => 0.99);
    expect(gone.event?.id ?? null).not.toBe(s.event!.id);
  });

  it('keep ticking through the main game loop', () => {
    const s = { ...must(buyLot(initialState(NOW), 'w1')), eventIn: 0.5 };
    expect(tick(s, 1, NOW, () => 0.3).state.event).not.toBeNull();
  });
});

describe('saves', () => {
  it('a v3 save that had claimed Wanhua can cash out after migrating', () => {
    const v3 = { ...initialState(NOW), version: 3, areas: { ...initialState(NOW).areas, wanhua: { lt1: true, lt2: true, boss: true } } } as Partial<GameState>;
    delete v3.auto;
    v3.meta = { safeHours: 4, face: 0, squadSlots: 6 } as GameState['meta'];
    const s = migrate(JSON.parse(JSON.stringify(v3)), NOW)!;
    expect(s.meta.claimedEver).toEqual(['wanhua']);
    expect(s.meta.upgrades).toEqual({});
    expect(s.auto).toEqual({ orders: false, focus: false, budget: 0, staff: false, placed: [], rosterSeen: Object.keys(s.characters).length });
    expect(canCashOut(s)).toBe(true);
  });
});

function must(r: ReturnType<typeof buyLot>): GameState {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}
