import { describe, expect, it } from 'vitest';
import { assignStaff, buyLot, collectSafe, upgradeLot } from './actions';
import { ALL_LOTS, AREAS } from './content/areas';
import { addXp, statsOf, xpToNext } from './characters';
import { phaseAt } from './clock';
import { MILESTONES, UPGRADE_GROWTH } from './constants';
import {
  incomePerSec,
  isLotLocked,
  marketShare,
  maxAffordableUpgrades,
  milestoneMult,
  safeCapacity,
  upgradeCost,
  upgradeCostN,
} from './economy';
import { formatNumber, formatPercent } from './format';
import { applyOffline } from './offline';
import { exportSave, importSave } from './save';
import { initialState, migrate } from './state';
import { resolveShakedown, tick } from './tick';
import type { GameState } from './types';

const NOW = 1_700_000_000_000;
const rich = (s: GameState): GameState => ({ ...s, cash: 1e12 });
const must = (r: ReturnType<typeof buyLot>) => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('upgrades', () => {
  const s = initialState(NOW);
  const lot = ALL_LOTS.w1!;

  it('grows cost by 1.12x per level', () => {
    expect(upgradeCost(s, lot, 2) / upgradeCost(s, lot, 1)).toBeCloseTo(UPGRADE_GROWTH, 2);
  });

  it('bulk cost equals the sum of single steps', () => {
    let sum = 0;
    for (let l = 1; l <= 10; l++) sum += upgradeCost(s, lot, l);
    expect(upgradeCostN(s, lot, 1, 10)).toBeGreaterThanOrEqual(sum - 10);
    expect(upgradeCostN(s, lot, 1, 10)).toBeLessThanOrEqual(sum + 10);
  });

  it('max affordable never overspends', () => {
    const n = maxAffordableUpgrades(s, lot, 1, 1e6);
    expect(upgradeCostN(s, lot, 1, n)).toBeLessThanOrEqual(1e6);
    expect(upgradeCostN(s, lot, 1, n + 1)).toBeGreaterThan(1e6);
  });

  it('doubles income at each milestone', () => {
    expect(milestoneMult(9)).toBe(1);
    expect(milestoneMult(MILESTONES[0])).toBe(2);
    expect(milestoneMult(100)).toBe(16);
  });
});

describe('buying and income', () => {
  it('buys a lot, raises the index and earns income', () => {
    const s = must(buyLot(initialState(NOW), 'w1'));
    expect(s.cash).toBe(5e4 - ALL_LOTS.w1!.price);
    expect(s.index).toBe(101);
    expect(incomePerSec(s, 'average')).toBeGreaterThan(0);
  });

  it('lets a fresh player buy and upgrade the first stall without waiting', () => {
    const bought = must(buyLot(initialState(NOW), 'w1'));
    const upgraded = must(upgradeLot(bought, 'w1', 1));
    expect(upgraded.lots.w1!.level).toBe(2);
    expect(upgraded.cash).toBeGreaterThanOrEqual(0);
    expect(incomePerSec(upgraded, 'average')).toBeGreaterThan(incomePerSec(bought, 'average'));
    // The opening discount must not propagate into the later-area price template.
    expect(ALL_LOTS.x1!.price).toBe(1.8e6);
    expect(AREAS.zhongshan.lots[0]!.price).toBe(3e8);
  });

  it('keeps rival-held lots locked', () => {
    const s = initialState(NOW);
    expect(isLotLocked(s, ALL_LOTS.w7!)).toBe(true);
    expect(isLotLocked(s, ALL_LOTS.w9!)).toBe(true);
    expect(buyLot(rich(s), 'w7').ok).toBe(false);
  });

  it('day lots earn more by day, night lots by night', () => {
    let s = rich(initialState(NOW));
    s = must(buyLot(s, 'w1')); // food stall, day
    expect(incomePerSec(s, 'day')).toBeGreaterThan(incomePerSec(s, 'night'));
    let n = rich(initialState(NOW));
    n = must(buyLot(n, 'w3')); // tea house, night
    expect(incomePerSec(n, 'night')).toBeGreaterThan(incomePerSec(n, 'day'));
  });

  it('market share rises as you invest', () => {
    let s = rich(initialState(NOW));
    expect(marketShare(s, 'wanhua')).toBe(0);
    s = must(buyLot(s, 'w1'));
    const a = marketShare(s, 'wanhua');
    s = must(upgradeLot(s, 'w1', 20));
    expect(marketShare(s, 'wanhua')).toBeGreaterThan(a);
  });

  it('reaches exactly 100% once the area is claimed and every buyable lot is yours', () => {
    let s: GameState = { ...initialState(NOW), cash: 1e40 };
    s = { ...s, areas: { ...s.areas, wanhua: { lt1: true, lt2: true, boss: false } } };
    const buyable = AREAS.wanhua.lots.filter((l) => l.lock !== 'xiaoxiao');
    for (const lot of buyable) s = must(buyLot(s, lot.id));
    s = must(upgradeLot(s, 'w1', 50));
    // The gang still holds its base stake, so the share can't be complete yet.
    expect(marketShare(s, 'wanhua')).toBeLessThan(1);
    expect(formatPercent(marketShare(s, 'wanhua'))).not.toBe('100%');

    s = { ...s, areas: { ...s.areas, wanhua: { lt1: true, lt2: true, boss: true } } };
    expect(marketShare(s, 'wanhua')).toBe(1);
    expect(formatPercent(marketShare(s, 'wanhua'))).toBe('100%');

    // Missing one lot keeps it below 100%, even when the rounding would say otherwise.
    const { w1: _sold, ...rest } = s.lots;
    const missing = { ...s, lots: rest };
    expect(marketShare(missing, 'wanhua')).toBeLessThan(1);
    expect(formatPercent(marketShare(missing, 'wanhua'))).not.toBe('100%');
  });
});

describe('safe and offline', () => {
  it('fills the safe and stops at capacity', () => {
    let s = must(buyLot(initialState(NOW), 'w1'));
    const { state, summary } = applyOffline(s, 10 * 3600, NOW + 10 * 3600e3, () => 0.5);
    expect(state.safe).toBeCloseTo(safeCapacity(state), 0);
    expect(summary.safeFull).toBe(true);
    s = must(collectSafe(state));
    expect(s.safe).toBe(0);
  });

  it('short absences earn average income', () => {
    const s = must(buyLot(initialState(NOW), 'w1'));
    const { summary } = applyOffline(s, 60, NOW + 60e3, () => 0.5);
    expect(summary.earned).toBeCloseTo(incomePerSec(s, 'average') * 60, 5);
    expect(summary.safeFull).toBe(false);
  });

  it('accountant collects straight to cash while online', () => {
    let s = must(buyLot(initialState(NOW), 'w1'));
    s = { ...s, run: { ...s.run, accountant: true } };
    const before = s.cash;
    const r = tick(s, 1, NOW, () => 0.5);
    expect(r.state.cash).toBeGreaterThan(before);
    expect(r.state.safe).toBe(0);
  });
});

describe('staff and shakedowns', () => {
  it('only agents manage and only gangsters guard', () => {
    const s = must(buyLot(initialState(NOW), 'w1'));
    expect(assignStaff(s, 'w1', 'manager', 'hai_shu').ok).toBe(false);
    expect(assignStaff(s, 'w1', 'security', 'a_cai').ok).toBe(false);
    expect(assignStaff(s, 'w1', 'manager', 'a_cai').ok).toBe(true);
  });

  it('a manager raises income', () => {
    const s = must(buyLot(initialState(NOW), 'w1'));
    const managed = must(assignStaff(s, 'w1', 'manager', 'a_cai'));
    expect(incomePerSec(managed, 'average')).toBeGreaterThan(incomePerSec(s, 'average'));
  });

  it('moving a character clears their old post', () => {
    let s = rich(initialState(NOW));
    s = must(buyLot(s, 'w1'));
    s = must(buyLot(s, 'w2'));
    s = must(assignStaff(s, 'w1', 'security', 'hai_shu'));
    s = must(assignStaff(s, 'w2', 'security', 'hai_shu'));
    expect(s.lots.w1!.security).toBeUndefined();
    expect(s.lots.w2!.security).toBe('hai_shu');
  });

  it('guarded lots repel shakedowns for a bonus; unguarded lots lose nothing', () => {
    let s = must(buyLot(initialState(NOW), 'w1'));
    const unguarded = resolveShakedown(s, () => 0);
    expect(unguarded.events[0]?.kind).toBe('shakedown-unguarded');
    expect(unguarded.state.cash).toBe(s.cash);
    s = must(assignStaff(s, 'w1', 'security', 'hai_shu'));
    const guarded = resolveShakedown(s, () => 0);
    expect(guarded.events[0]?.kind).toBe('shakedown-repelled');
    expect(guarded.state.cash).toBeGreaterThan(s.cash);
  });

  it('levels up with XP and gets stronger', () => {
    const cs = { level: 1, xp: 0, stars: 1 };
    const { cs: next, gained } = addXp(cs, xpToNext(1) + 1);
    expect(gained).toBe(1);
    expect(statsOf('hai_shu', next).muscle).toBeGreaterThanOrEqual(statsOf('hai_shu', cs).muscle);
  });
});

describe('clock', () => {
  it('flips between day and night', () => {
    expect(phaseAt(12 * 60_000)).toBe('day');
    expect(phaseAt(20 * 60_000)).toBe('night');
    expect(phaseAt(3 * 60_000)).toBe('night');
  });
});

describe('formatting', () => {
  it('uses 萬/億 and K/M/B', () => {
    expect(formatNumber(9999)).toBe('9,999');
    expect(formatNumber(12_345)).toBe('1.23萬');
    expect(formatNumber(1.2e8)).toBe('1.2億');
    expect(formatNumber(99_999_999)).toBe('1億');
    expect(formatNumber(1.2e8, 'kmb')).toBe('120M');
    expect(formatNumber(1e21)).toBe('1.00e21');
  });
});

describe('saves', () => {
  it('round-trips through the export string', () => {
    let s = must(buyLot(initialState(NOW), 'w1'));
    s = { ...s, settings: { ...s.settings, numberFormat: 'kmb' } };
    const back = importSave(exportSave(s), NOW);
    expect(back).toEqual(s);
  });

  it('rejects garbage and future versions', () => {
    expect(importSave('not base64 at all!!', NOW)).toBeNull();
    expect(migrate({ version: 999 }, NOW)).toBeNull();
  });

  it('fills missing fields on old saves', () => {
    const partial = { version: 1, cash: 123 };
    const s = migrate(partial, NOW)!;
    expect(s.cash).toBe(123);
    expect(s.characters.a_cai).toBeDefined();
  });
});
