import { describe, expect, it } from 'vitest';
import { createBattle, fire, runBattle, stepBattle } from './battle';
import { FIGHTS } from './content/fights';
import { ALL_LOTS } from './content/areas';
import { upgradeCountFor } from './economy';
import { initialState, migrate } from './state';
import { autoFillSquad, battleInputFor, bestSquad, buildYourSide, canFill, effectiveSquad, resolveFight, setSquadSlot } from './turf';
import type { GameState } from './types';

function crew(levels: Record<string, number>, slots = 3): GameState {
  const s = initialState(0);
  const characters = { ...s.characters };
  for (const [id, level] of Object.entries(levels)) characters[id] = { level, xp: 0, stars: 1 };
  return { ...s, characters, meta: { ...s.meta, squadSlots: slots } };
}

describe('battle simulation', () => {
  it('is deterministic for a seed', () => {
    const input = battleInputFor(crew({}), 'wanhua_lt1', 'night');
    const a = runBattle(input, 42);
    const b = runBattle(input, 42);
    expect(a.outcome).toBe(b.outcome);
    expect(a.t).toBeCloseTo(b.t);
  });

  it('always ends, at the latest when time runs out', () => {
    for (const id of Object.keys(FIGHTS)) {
      const r = runBattle(battleInputFor(crew({}), id, 'day'), 7);
      expect(r.t).toBeLessThanOrEqual(FIGHTS[id]!.timeLimit + 0.1);
    }
  });

  it('starters can win the first fight; a strong crew wins the boss', () => {
    expect(runBattle(battleInputFor(crew({ hai_shu: 2, a_di: 2, a_cai: 2 }), 'wanhua_lt1', 'night'), 3).outcome).toBe('win');
    const strong = crew({ hai_shu: 8, a_di: 8, a_cai: 8, a_biao: 6, gui_yi: 6 }, 5);
    expect(runBattle(battleInputFor(strong, 'wanhua_boss', 'day'), 3).outcome).toBe('win');
  });

  it('an empty squad loses', () => {
    const s = { ...crew({}), squadAuto: false, squad: Array(7).fill(null) };
    const input = battleInputFor(s, 'wanhua_lt1', 'day');
    expect(input.you).toHaveLength(0);
    expect(runBattle(input, 1).outcome).toBe('lose');
  });

  it('Kun-bo calls in troupe runners', () => {
    const b = createBattle(battleInputFor(crew({}), 'wanhua_boss', 'day'), 5);
    const start = b.units.length;
    let spawned = 0;
    while (!b.outcome && b.t < 30) for (const e of stepBattle(b, 0.05)) if (e.kind === 'spawn') spawned++;
    expect(spawned).toBeGreaterThan(0);
    expect(b.units.length).toBe(start + spawned);
  });

  it('with Auto off, skills wait for a tap', () => {
    const b = createBattle(battleInputFor(crew({}), 'wanhua_lt1', 'day'), 9, false);
    while (!b.outcome && !b.units.some((u) => u.side === 'you' && u.charge >= 1)) stepBattle(b, 0.05);
    const ready = b.units.find((u) => u.side === 'you' && u.charge >= 1)!;
    stepBattle(b, 0.05);
    expect(ready.charge).toBe(1);
    expect(fire(b, ready.uid)).toBe(true);
    expect(ready.charge).toBe(0);
  });
});

describe('squad', () => {
  it('respects rows and commander ranks', () => {
    expect(canFill('hai_shu', 0)).toBe(true);
    expect(canFill('hai_shu', 2)).toBe(false); // bouncers stay up front
    expect(canFill('a_cai', 0)).toBe(false); // agents stay in the back
    expect(canFill('a_di', 0) && canFill('a_di', 3)).toBe(true); // runners go anywhere
    expect(canFill('a_biao', 5)).toBe(true); // SR can be Lt commander
    expect(canFill('a_biao', 6)).toBe(false);
    expect(canFill('kun_bo', 6)).toBe(true);
  });

  it('starts with the three starters', () => {
    expect(effectiveSquad(initialState(0)).filter(Boolean).sort()).toEqual(['a_cai', 'a_di', 'hai_shu']);
  });

  it('best squad promotes a commander when a bench card can take its place', () => {
    const s = crew({ a_biao: 1, gui_yi: 1, kun_bo: 1 }, 6);
    const squad = bestSquad(s);
    expect(squad.filter(Boolean)).toHaveLength(6);
    expect(squad[5]).toBeTruthy();
    for (let i = 0; i < 6; i++) expect(canFill(squad[i]!, i)).toBe(true);
  });

  it('hand edits turn auto off and swap places', () => {
    let s = crew({}, 4);
    s = setSquadSlot(s, 3, 'a_di');
    expect(s.squadAuto).toBe(false);
    expect(s.squad[3]).toBe('a_di');
    expect(s.squad.filter((x) => x === 'a_di')).toHaveLength(1);
    expect(autoFillSquad(s).squadAuto).toBe(true);
  });

  it('modifiers: night favours gangsters, Home Turf adds Grit', () => {
    const s = crew({});
    const fight = FIGHTS.wanhua_lt1!;
    const day = buildYourSide(s, fight, 'day');
    const night = buildYourSide(s, fight, 'night');
    const hai = (x: typeof day) => x.specs.find((u) => u.charId === 'hai_shu')!;
    expect(hai(night).muscle).toBeGreaterThan(hai(day).muscle);
    const guarded = { ...s, lots: { w1: { level: 1, invested: 0, security: 'hai_shu' } } };
    expect(hai(buildYourSide(guarded, fight, 'day')).grit).toBeGreaterThan(hai(day).grit);
  });
});

describe('fight results', () => {
  it('first win: leader joins, slot and lots unlock, incense paid', () => {
    const { state, result } = resolveFight(crew({}), 'wanhua_lt1', 'win');
    expect(result.first).toBe(true);
    expect(state.characters.a_biao).toBeDefined();
    expect(state.meta.squadSlots).toBe(4);
    expect(state.areas.wanhua.lt1).toBe(true);
    expect(result.lotsUnlocked).toContain('w7');
    expect(state.currencies.incense).toBe(10);
  });

  it('rematch pays a scratch card; losing only gives XP', () => {
    const won = resolveFight(crew({}), 'wanhua_lt1', 'win').state;
    const again = resolveFight(won, 'wanhua_lt1', 'win');
    expect(again.result.first).toBe(false);
    expect(again.state.currencies.scratch).toBe(1);
    expect(again.state.meta.squadSlots).toBe(4);

    const s = crew({});
    const lost = resolveFight(s, 'wanhua_lt1', 'lose').state;
    expect(lost.cash).toBe(s.cash);
    expect(lost.areas.wanhua.lt1).toBe(false);
    expect(lost.characters.hai_shu!.xp).toBeGreaterThan(0);
    expect(lost.stats.fightsLost).toBe(1);
  });

  it('claiming Wanhua opens the commander slot', () => {
    const { state, result } = resolveFight(crew({}, 5), 'wanhua_boss', 'win');
    expect(result.claimed).toBe(true);
    expect(state.areas.wanhua.boss).toBe(true);
    expect(state.meta.squadSlots).toBe(6);
    expect(state.currencies.lottery).toBe(1);
    expect(state.characters.kun_bo).toBeDefined();
  });
});

describe('buy modes and saves', () => {
  it('Next buys up to the next ×2 milestone', () => {
    const s = initialState(0);
    const lot = ALL_LOTS.w1!;
    expect(upgradeCountFor(s, lot, 1, 'next')).toBe(9);
    expect(upgradeCountFor(s, lot, 10, 'next')).toBe(15);
    expect(upgradeCountFor(s, lot, 100, 'next')).toBe(10);
    expect(upgradeCountFor(s, lot, 7, 10)).toBe(10);
  });

  it('a version 1 save loads with a squad, currencies and buy mode', () => {
    const v1 = { ...initialState(0), version: 1 } as Partial<GameState>;
    delete v1.squad;
    delete v1.currencies;
    v1.settings = { numberFormat: 'kmb' } as GameState['settings'];
    v1.meta = { safeHours: 4, face: 0 } as GameState['meta'];
    const s = migrate(JSON.parse(JSON.stringify(v1)), 0)!;
    expect(s.squad).toHaveLength(7);
    expect(s.currencies.incense).toBe(0);
    expect(s.settings.numberFormat).toBe('kmb');
    expect(s.settings.buyMode).toBe(1);
    expect(s.meta.squadSlots).toBe(3);
  });
});
