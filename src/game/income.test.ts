import { describe, expect, it } from 'vitest';
import { buyLot, upgradeLot } from './actions';
import { autoUpgrade } from './auto';
import { ALL_LOTS, AREAS } from './content/areas';
import { incomeBreakdown, incomePerSec, lotIncome, upgradeCost } from './economy';
import { bestBuy, growth, sourceFactors } from './income';
import { initialState } from './state';
import type { GameState } from './types';

function withLots(levels: Record<string, number>, cash = 0): GameState {
  const s = initialState(0);
  const lots: GameState['lots'] = {};
  for (const [id, level] of Object.entries(levels)) lots[id] = { level, invested: ALL_LOTS[id]!.price };
  return { ...s, cash, lots };
}

describe('income sources', () => {
  it('base × the four sources is exactly the lot income', () => {
    const s = { ...withLots({ w1: 37, w2: 12 }), index: 131.5, areas: { ...initialState(0).areas, wanhua: { lt1: true, lt2: true, boss: true } } };
    for (const id of ['w1', 'w2']) {
      const lot = ALL_LOTS[id]!;
      for (const mode of ['day', 'night', 'average'] as const) {
        const b = incomeBreakdown(s, lot, mode);
        const f = sourceFactors(b);
        expect(b.base * f.lot * f.time * f.people * f.reputation).toBeCloseTo(lotIncome(s, lot, mode), 6);
      }
    }
  });
});

describe('best buy', () => {
  it('says exactly how much income a purchase adds, price-index bump included', () => {
    // Early on (buying a new lot pays best), one level from a ×2, and well past the first milestones.
    const cases: Record<string, number>[] = [{ w1: 4 }, { w1: 9, w2: 3 }, { w1: 12, w2: 30 }];
    for (const levels of cases) {
      const s = withLots(levels, 1e12);
      const best = bestBuy(s, AREAS.wanhua.lots)!;
      const r = best.kind === 'buy' ? buyLot(s, best.lotId) : upgradeLot(s, best.lotId, best.toLevel - best.fromLevel);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const actual = incomePerSec(r.state, 'average') - incomePerSec(s, 'average');
      expect(best.gain / actual).toBeCloseTo(1, 9);
      expect(s.cash - r.state.cash).toBeCloseTo(best.cost, 0);
    }
  });

  it('prefers the step to a ×2 milestone over a pricey plain level', () => {
    const best = bestBuy(withLots({ w1: 9, w2: 3 }), AREAS.wanhua.lots, { upgradesOnly: true })!;
    expect(best).toMatchObject({ lotId: 'w1', kind: 'upgrade', toLevel: 10 });
  });
});

describe('Standing Orders', () => {
  // w1's next level is the cheapest upgrade, but w2's step to Lv 10 adds far more per NT$.
  const levels = { w1: 10, w2: 9 };

  it('takes the best buy, not the cheapest upgrade', () => {
    // Enough for w2's step to Lv 10, or for w1's next level, but not both.
    const s = withLots(levels, 3.5e5);
    expect(upgradeCost(s, ALL_LOTS.w1!, 10)).toBeLessThan(upgradeCost(s, ALL_LOTS.w2!, 9));
    expect(upgradeCost(s, ALL_LOTS.w1!, 10) + upgradeCost(s, ALL_LOTS.w2!, 9)).toBeGreaterThan(s.cash);
    const { state } = autoUpgrade(s, 'wanhua');
    expect(state.lots.w2!.level).toBe(10);
    expect(state.lots.w1!.level).toBe(10);
  });

  it('waits for the best buy instead of spending on a worse one', () => {
    // Enough for w1's next level only.
    const s = withLots(levels, 2e5);
    expect(upgradeCost(s, ALL_LOTS.w1!, 10)).toBeLessThan(s.cash);
    expect(upgradeCost(s, ALL_LOTS.w2!, 9)).toBeGreaterThan(s.cash);
    const { state } = autoUpgrade(s, 'wanhua');
    expect(state.lots.w1!.level).toBe(10);
    expect(state.lots.w2!.level).toBe(9);
    expect(state.cash).toBe(2e5);
  });
});

describe('room to grow', () => {
  it('counts lots near a ×2, empty Manager slots and the unclaimed district', () => {
    const g = growth(withLots({ w1: 10, w2: 9 }));
    expect(g.nearMilestone).toBe(1);
    expect(g.noManager).toBe(2);
    expect(g.unclaimed).toBe('wanhua');
  });
});
