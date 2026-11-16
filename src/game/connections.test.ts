import { describe, expect, it } from 'vitest';
import { statsOf } from './characters';
import { AREAS, ALL_LOTS } from './content/areas';
import { FIGHTS } from './content/fights';
import { FORTUNE_EVENT_RATE, LOCAL_MANAGER_MULT } from './constants';
import { isLocal, lotIncome, managerMult } from './economy';
import { nextEventDelay, tickEvents } from './events';
import { dayKey, draw, fortuneEventRate, fortuneToday, throwForUpgrade } from './gacha';
import { fillPosts, managerGain } from './staffing';
import { initialState, migrate } from './state';
import { buildYourSide } from './turf';
import type { GameState, Rarity } from './types';

const NOW = new Date(2026, 10, 16, 12).getTime();
const TOMORROW = new Date(2026, 10, 17, 12).getTime();
const HOME = AREAS.zhongshan.lots[0]!.id;
function setup(): GameState {
  const s = initialState(NOW);
  return {
    ...s,
    zodiac: 'rat',
    characters: { ...s.characters, coco: { level: 1, xp: 0, stars: 1 }, yue_jie: { level: 1, xp: 0, stars: 1 }, a_biao: { level: 1, xp: 0, stars: 1 } },
    lots: Object.fromEntries(['w1', HOME].map((id) => [id, { level: 1, invested: ALL_LOTS[id]!.price }])),
  };
}
const managed = (s: GameState, lot: string, manager: string): GameState => ({ ...s, lots: { ...s.lots, [lot]: { ...s.lots[lot]!, manager } } });

describe('Locals', () => {
  it('gives Coco 25% more manager income at home, independent of lot base income', () => {
    const s = setup();
    const home = managed(s, HOME, 'coco');
    const away = managed(s, 'w1', 'coco');
    expect(isLocal('coco', 'zhongshan')).toBe(true);
    expect(isLocal('coco', 'wanhua')).toBe(false);
    expect(managerMult(home, HOME) / managerMult(away, 'w1')).toBeCloseTo(LOCAL_MANAGER_MULT);
    const homeBoost = lotIncome(home, ALL_LOTS[HOME]!, 'average') / lotIncome(s, ALL_LOTS[HOME]!, 'average');
    const awayBoost = lotIncome(away, ALL_LOTS.w1!, 'average') / lotIncome(s, ALL_LOTS.w1!, 'average');
    expect(homeBoost / awayBoost).toBeCloseTo(1.25);
  });

  it('stacks the local bonus with Yue-jie’s manager-role bonus', () => {
    const s = setup();
    const business = 1 + statsOf('yue_jie', s.characters.yue_jie).business / 100;
    expect(managerMult(managed(s, HOME, 'yue_jie'), HOME)).toBeCloseTo(business * 1.25 * LOCAL_MANAGER_MULT);
    expect(managerMult(managed(s, 'w1', 'yue_jie'), 'w1')).toBeCloseTo(business * 1.25);
  });

  it('counts a local guard twice for Home Turf, without changing other stats', () => {
    const s = setup();
    const withGuard = (security: string) => ({ ...s, lots: { ...s.lots, w1: { ...s.lots.w1!, security } } });
    const base = buildYourSide(s, FIGHTS.wanhua_lt1!, 'day');
    const away = buildYourSide(withGuard('a_di'), FIGHTS.wanhua_lt1!, 'day');
    const home = buildYourSide(withGuard('a_biao'), FIGHTS.wanhua_lt1!, 'day');
    for (let i = 0; i < base.specs.length; i++) {
      const grit = base.specs[i]!.grit!;
      expect(home.specs[i]!.grit! - grit).toBeCloseTo(2 * (away.specs[i]!.grit! - grit));
      expect(home.specs[i]!.muscle).toBe(base.specs[i]!.muscle);
      expect(home.specs[i]!.business).toBe(base.specs[i]!.business);
    }
    expect(home.mods.find((m) => m.label.startsWith('Home Turf'))).toMatchObject({ label: 'Home Turf: 1 Security posted (1 local, counted ×2)', value: '+6% Grit' });
    expect(away.mods.find((m) => m.label.startsWith('Home Turf'))).toMatchObject({ value: '+3% Grit' });
  });

  it('matches the best local manager to the biggest empty lot and leaves existing posts alone', () => {
    const base = setup();
    // Both scriveners have the same rarity and stats; put the non-local first to expose matching.
    const s: GameState = { ...base, characters: { chen_daishu: { level: 1, xp: 0, stars: 1 }, coco: base.characters.coco! } };
    expect(managerGain(s, HOME, 'coco')).toBeGreaterThan(managerGain(s, HOME, 'chen_daishu'));
    const filled = fillPosts(s);
    expect(filled.lots[HOME]!.manager).toBe('coco');
    expect(filled.lots.w1!.manager).toBe('chen_daishu');
    const posted = managed(s, HOME, 'chen_daishu');
    expect(fillPosts(posted).lots[HOME]!.manager).toBe('chen_daishu');
    expect(fillPosts(posted).lots.w1!.manager).toBe('coco');
  });
});

describe('Today’s fortune', () => {
  it.each<[Rarity, number, number]>([['N', 0.1, 1.25], ['R', 0.7, 1.5], ['SR', 0.95, 1.75], ['SSR', 0.995, 2]])('sets %s from a free stick and keeps it through paid visits', (rarity, roll, rate) => {
    const free = draw(setup(), 'temple', () => roll, NOW);
    if (!free.ok) throw new Error(free.reason);
    expect(free.result.free).toBe(true);
    expect(free.result.gains[0]!.rarity).toBe(rarity);
    expect(free.state.draws.fortune).toEqual({ day: dayKey(NOW), rarity });
    expect(fortuneToday(free.state, NOW)).toBe(rarity);
    expect(FORTUNE_EVENT_RATE[rarity]).toBe(rate);
    expect(fortuneEventRate(free.state, NOW)).toBe(rate);
    const funded = { ...free.state, currencies: { ...free.state.currencies, incense: 100 } };
    const paid = draw(funded, 'temple', () => (rarity === 'SSR' ? 0.1 : 0.995), NOW);
    if (!paid.ok) throw new Error(paid.reason);
    expect(paid.result.free).toBe(false);
    expect(paid.state.draws.fortune).toEqual(free.state.draws.fortune);
    expect(fortuneToday(paid.state, TOMORROW)).toBeNull();
    expect(fortuneEventRate(paid.state, TOMORROW)).toBe(1);
    const normalDelay = nextEventDelay(setup(), () => 0.5, NOW);
    expect(nextEventDelay(free.state, () => 0.5, NOW)).toBeCloseTo(normalDelay / FORTUNE_EVENT_RATE[rarity]);
    expect(nextEventDelay(free.state, () => 0.5, TOMORROW)).toBe(normalDelay);
    const tomorrow = draw(paid.state, 'temple', () => 0.1, TOMORROW);
    if (!tomorrow.ok) throw new Error(tomorrow.reason);
    expect(tomorrow.result.free).toBe(true);
    expect(tomorrow.state.draws.fortune).toEqual({ day: dayKey(TOMORROW), rarity: 'N' });
  });

  it('keeps the original stick’s fortune after a successful moon-block upgrade', () => {
    const free = draw(setup(), 'temple', () => 0.1, NOW);
    if (!free.ok) throw new Error(free.reason);
    const upgraded = throwForUpgrade(free.state, free.result.gains[0]!, () => 0.1, NOW);
    expect(upgraded.upgraded?.rarity).toBe('R');
    expect(upgraded.state.draws.fortune).toEqual({ day: dayKey(NOW), rarity: 'N' });
    expect(fortuneEventRate(upgraded.state, NOW)).toBe(1.25);
  });

  it('applies fortune when scheduling the next event, not to an existing countdown', () => {
    const s = setup();
    const lucky = { ...s, draws: { ...s.draws, fortune: { day: dayKey(NOW), rarity: 'SSR' as const } } };
    expect(tickEvents({ ...lucky, eventIn: 100 }, 1, () => 0.5, NOW).eventIn).toBe(99);
    const spawned = tickEvents({ ...lucky, eventIn: 0 }, 1, () => 0.5, NOW);
    expect(spawned.event).not.toBeNull();
    expect(spawned.eventIn).toBeCloseTo(nextEventDelay(s, () => 0.5, NOW) / 2);
  });

  it('loads an older save with no fortune as null', () => {
    const s = setup();
    const { fortune: _fortune, ...draws } = s.draws;
    const loaded = migrate({ ...s, draws }, NOW);
    expect(loaded).not.toBeNull();
    expect(loaded!.draws.fortune).toBeNull();
    expect(fortuneEventRate(loaded!, NOW)).toBe(1);
  });
});
