import { describe, expect, it } from 'vitest';
import { buyLot } from './actions';
import { isPageComplete } from './binder';
import { AREAS, ALL_LOTS } from './content/areas';
import { CATEGORIES } from './content/categories';
import { CHARACTERS } from './content/characters';
import { FIGHTS } from './content/fights';
import { skillOf } from './content/skills';
import { incomePerSec, isAreaOpen, isLocal, isLotLocked, lotIncome, offlineIncomePerSec, safeCapacity } from './economy';
import { cashOut } from './face';
import { inPool } from './gacha';
import { applyOffline } from './offline';
import { deserialize, serialize } from './save';
import { initialState, migrate } from './state';
import { canChallenge, resolveFight } from './turf';
import type { GameState } from './types';

const NOW = new Date(2026, 10, 16, 12).getTime();
function open(): GameState {
  const s = initialState(NOW);
  return { ...s, cash: 1e45, meta: { ...s.meta, chapterClears: 1 }, areas: { ...s.areas, ...Object.fromEntries(['wanhua', 'ximending', 'zhongshan', 'east', 'xinyi'].map((id) => [id, { lt1: true, lt2: true, boss: true }])) } };
}
const buy = (s: GameState, id: string) => {
  const r = buyLot(s, id); if (!r.ok) throw new Error(r.reason); return r.state;
};

describe('Xindian secret chapter', () => {
  it('opens on the first Chapter 1 clear and stays revealed but gated behind Xinyi on later runs', () => {
    const fresh = initialState(NOW);
    expect(isAreaOpen(fresh, 'xindian')).toBe(false);
    expect(canChallenge(fresh, FIGHTS.xindian_lt1!)).toBe(false);
    const claimed = resolveFight(fresh, 'xinyi_boss', 'win', NOW).state;
    expect(claimed.meta.chapterClears).toBe(1);
    expect(isAreaOpen(claimed, 'xindian')).toBe(true);
    const retired = cashOut(claimed, NOW + 1000, () => 0.2).state;
    expect(retired.meta.chapterClears).toBe(1);
    expect(isAreaOpen(retired, 'xindian')).toBe(false);
    expect(isAreaOpen({ ...retired, areas: { ...retired.areas, xinyi: claimed.areas.xinyi } }, 'xindian')).toBe(true);
  });

  it('has nine valid properties, three distinct earned leaders, and real skills', () => {
    expect(AREAS.xindian.lots).toHaveLength(9);
    expect(AREAS.xindian.lots.filter((lot) => lot.lock === 'lt1')).toHaveLength(1);
    expect(AREAS.xindian.lots.filter((lot) => lot.lock === 'lt2')).toHaveLength(1);
    for (const lot of AREAS.xindian.lots) { expect(CATEGORIES[lot.category]).toBeTruthy(); expect(lot.income).toBeGreaterThan(0); }
    const leaders = [AREAS.xindian.lt1Id, AREAS.xindian.lt2Id, AREAS.xindian.bossId];
    expect(new Set(leaders).size).toBe(3);
    for (const [i, id] of leaders.entries()) {
      expect(CHARACTERS[id]!.rarity).toBe(i === 2 ? 'SSR' : 'SR');
      expect(CHARACTERS[id]!.source).toBe('earned'); expect(isLocal(id, 'xindian')).toBe(true);
      expect(skillOf(id).charge).toBeGreaterThan(0);
      for (const kind of ['scratch', 'temple', 'lottery'] as const) expect(inPool(id, kind, NOW)).toBe(false);
    }
  });

  it('unlocks lieutenant properties and the branch network in order', () => {
    let s = open();
    expect(isLotLocked(s, ALL_LOTS.n7!)).toBe(true);
    expect(isLotLocked(s, ALL_LOTS.n8!)).toBe(true);
    expect(buyLot(s, 'w9').ok).toBe(false);
    const first = resolveFight(s, 'xindian_lt1', 'win', NOW);
    s = first.state;
    expect(first.result.joined).toBe('xiaoxiao_agent'); expect(first.result.lotsUnlocked).toContain('n7');
    expect(isLotLocked(s, ALL_LOTS.n7!)).toBe(false);
    expect(isLotLocked(s, ALL_LOTS.w9!)).toBe(true);
    const second = resolveFight(s, 'xindian_lt2', 'win', NOW);
    expect(second.result.joined).toBe('a_yin');
    for (const id of ['w9', 'x9', 'z9', 'e9', 'y9', 'n9']) {
      expect(second.result.lotsUnlocked).toContain(id);
      expect(isLotLocked(second.state, ALL_LOTS[id]!)).toBe(false);
      const owned = buy(second.state, id);
      expect(lotIncome(owned, ALL_LOTS[id]!, 'average')).toBeGreaterThan(0);
    }
  });

  it('doubles only Xindian away income, preserves safe hours, and caps payouts', () => {
    const s = buy(buy(open(), 'w1'), 'n1');
    const online = incomePerSec(s, 'average');
    const xindian = lotIncome(s, ALL_LOTS.n1!, 'average');
    expect(offlineIncomePerSec(s)).toBeCloseTo(online + xindian);
    const short = applyOffline(s, 30, NOW + 30_000, () => 0.99);
    expect(short.summary.earned).toBeCloseTo((online + xindian) * 30);
    expect(short.state.safe).toBeCloseTo(short.summary.earned);
    expect(safeCapacity(s)).toBeCloseTo(offlineIncomePerSec(s) * 4 * 3600);
    const long = applyOffline(s, 24 * 3600, NOW + 86_400_000, () => 0.99);
    expect(long.state.safe).toBe(safeCapacity(s)); expect(long.summary.safeFull).toBe(true);
  });

  it('awards the boss, binder page and finale once, then supports repeat-run stars', () => {
    let s = resolveFight(open(), 'xindian_lt1', 'win', NOW).state;
    s = resolveFight(s, 'xindian_lt2', 'win', NOW).state;
    const win = resolveFight(s, 'xindian_boss', 'win', NOW);
    expect(win.result.joined).toBe('xiao_dong'); expect(win.result.ending).toBe('full');
    expect(win.result.fireworks).toBeNull(); expect(win.state.meta.xindianClears).toBe(1);
    expect(isPageComplete(win.state, 'xiaoxiao')).toBe(true);
    expect(win.result.binderPages).toContain('xiaoxiao'); expect(win.result.lottery).toBe(4);
    const rematch = resolveFight(win.state, 'xindian_boss', 'win', NOW);
    expect(rematch.result.ending).toBeNull(); expect(rematch.result.joined).toBeNull();
    expect(rematch.state.meta.xindianClears).toBe(1);
    const reset = cashOut(win.state, NOW + 1000, () => 0.2).state;
    expect(reset.meta.xindianClears).toBe(1); expect(reset.characters.xiao_dong).toBeTruthy();
    expect(isLotLocked(reset, ALL_LOTS.w9!)).toBe(true);
    const repeat = resolveFight(reset, 'xindian_boss', 'win', NOW + 2000);
    expect(repeat.result.ending).toBe('short'); expect(repeat.result.starUp).toMatchObject({ charId: 'xiao_dong', stars: 2 });
    expect(repeat.result.binderPages).toHaveLength(0);
  });

  it('round-trips new progress and migrates old Chapter 1 saves without losing anything', () => {
    const s = open();
    const { xindianClears: _oldSecret, chapterClears: _oldChapter, ...meta } = s.meta;
    const migrated = migrate({ ...s, meta }, NOW)!;
    expect(migrated.meta.chapterClears).toBe(1); expect(migrated.meta.xindianClears).toBe(0);
    expect(isAreaOpen(migrated, 'xindian')).toBe(true);
    const won = resolveFight(migrated, 'xindian_boss', 'win', NOW).state;
    const restored = deserialize(serialize(won), NOW)!;
    expect(restored.meta.xindianClears).toBe(1); expect(restored.characters.xiao_dong).toEqual(won.characters.xiao_dong);
    expect(restored.draws).toEqual(won.draws);
  });
});
