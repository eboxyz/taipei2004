import { describe, expect, it } from 'vitest';
import { createBattle, fire, runBattle, stepBattle } from './battle';
import { FIGHTS } from './content/fights';
import { CHARACTERS } from './content/characters';
import { ALL_LOTS } from './content/areas';
import { upgradeCountFor } from './economy';
import { initialState, migrate } from './state';
import { canChallenge, battleInputFor, bestSquad, buildYourSide, canFill, effectiveSquad, fillSquad, resolveFight, retireAutoSquad, setSquadSlot } from './turf';
import { deserialize, serialize } from './save';
import type { GameState, SquadStyle } from './types';

function crew(levels: Record<string, number>, slots = 3): GameState {
  const s = initialState(0);
  const characters = { ...s.characters };
  for (const [id, level] of Object.entries(levels)) characters[id] = { level, xp: 0, stars: 1 };
  // Tests field the All-around fill, as a player would after one tap.
  return fillSquad({ ...s, characters, meta: { ...s.meta, squadSlots: slots } }, 'balanced');
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
    const s = { ...crew({}), squad: Array(7).fill(null) };
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

  it('hand edits swap places and stick', () => {
    let s = crew({}, 4);
    s = setSquadSlot(s, 3, 'a_di');
    expect(s.squad[3]).toBe('a_di');
    expect(s.squad.filter((x) => x === 'a_di')).toHaveLength(1);
  });

  it('offensive and defensive fills pick different front rows and commanders', () => {
    const s = crew({ hai_shu: 5, a_shun: 5, lao_liu: 5, a_hao: 5, a_biao: 5, a_jian: 5, a_di: 5, a_cai: 5 }, 6);
    const off = fillSquad(s, 'offense').squad;
    const def = fillSquad(s, 'defense').squad;
    expect(off.slice(0, 2)).toContain('a_shun'); // enforcer up front
    expect(def.slice(0, 2)).toContain('hai_shu'); // bouncer up front
    expect(off.slice(0, 2)).toContain('a_biao'); // keep the hit-all fighter attacking
    expect(off[5]).toBe('a_jian'); // use a legal bench card instead of stealing a fighter
    expect(def.slice(0, 2)).toContain('a_jian'); // the bouncer tanks in the army
    expect(def[5]).toBe('a_biao'); // the benched enforcer gives a damage aura
    for (const squad of [off, def]) for (let i = 0; i < 6; i++) expect(canFill(squad[i]!, i)).toBe(true);
  });

  it('keeps the best army fighters out of command when legal bench commanders exist', () => {
    const levels = Object.fromEntries(Object.keys(CHARACTERS).map((id) => [id, 12]));
    const state = crew(levels, 7);
    for (const style of ['offense', 'defense', 'balanced'] as SquadStyle[]) {
      const army = bestSquad({ ...state, meta: { ...state.meta, squadSlots: 5 } }, style).slice(0, 5);
      const squad = bestSquad(state, style);
      expect(squad.slice(0, 5)).toEqual(army);
      expect(squad[5]).toBeTruthy();
      expect(squad[6]).toBeTruthy();
      for (const id of squad.slice(5)) expect(army).not.toContain(id);
    }
  });

  it('reserves the only benched SSR for boss command before choosing an SR lieutenant', () => {
    const state = crew({ hai_shu: 30, a_biao: 30, gui_yi: 30, xiao_zhen: 30, a_cai: 30, kun_bo: 1, coco: 1 }, 7);
    for (const style of ['offense', 'defense', 'balanced'] as SquadStyle[]) {
      const squad = bestSquad(state, style);
      expect(squad[6]).toBe('kun_bo');
      expect(squad[5]).toBe('coco');
    }
  });

  it('promotes the least valuable legal fighter only when there is no bench commander', () => {
    const state = crew({ a_biao: 20, gui_yi: 1, intern: 1 }, 6);
    for (const style of ['offense', 'defense', 'balanced'] as SquadStyle[]) {
      const squad = bestSquad(state, style);
      expect(squad[5]).toBe('gui_yi');
      expect(squad.slice(0, 2)).toContain('a_biao');
      expect(squad.filter(Boolean)).toHaveLength(6);
    }
  });

  it('all fills use unique owned cards in legal unlocked slots, including sparse collections', () => {
    const collections = [{}, { a_biao: 2, gui_yi: 1, kun_bo: 1 }, Object.fromEntries(Object.keys(CHARACTERS).map((id) => [id, 10]))];
    for (const levels of collections) for (let slots = 3; slots <= 7; slots++) {
      const state = crew(levels, slots);
      for (const style of ['offense', 'defense', 'balanced'] as SquadStyle[]) {
        const squad = fillSquad(state, style).squad;
        expect(new Set(squad.filter(Boolean)).size).toBe(squad.filter(Boolean).length);
        squad.forEach((id, slot) => {
          if (!id) return;
          expect(slot).toBeLessThan(slots);
          expect(state.characters[id]).toBeDefined();
          expect(canFill(id, slot)).toBe(true);
        });
      }
    }
  });

  it('a fill happens once: new cards never join on their own', () => {
    const s = crew({}, 4);
    const later = { ...s, characters: { ...s.characters, a_jie: { level: 30, xp: 0, stars: 5 } } };
    expect(effectiveSquad(later)).toEqual(effectiveSquad(s));
  });

  it('an old auto-fill save keeps the squad auto-fill would field, as a fixed squad', () => {
    const s = crew({ a_biao: 3, gui_yi: 3 }, 5);
    const old = { ...s, squad: ['hai_shu', null, null, null, null, null, null], squadAuto: true };
    const loaded = deserialize(serialize(old), 0)!;
    expect(loaded.squadAuto).toBeUndefined();
    expect(loaded.squad).toEqual(bestSquad(s, 'balanced'));
    expect(retireAutoSquad(loaded)).toBe(loaded);
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

describe('opening A-Biao encounter', () => {
  it('unlocks on the first Wanhua property without unlocking later rivals', () => {
    const fresh = initialState(0);
    expect(canChallenge(fresh, FIGHTS.wanhua_lt1!)).toBe(false);
    const first = { ...fresh, lots: { w1: { level: 1, invested: ALL_LOTS.w1!.price } } };
    expect(canChallenge(first, FIGHTS.wanhua_lt1!)).toBe(true);
    expect(canChallenge(first, FIGHTS.wanhua_lt2!)).toBe(false);
    expect(canChallenge(first, FIGHTS.wanhua_boss!)).toBe(false);
    expect(canChallenge(first, FIGHTS.ximending_lt1!)).toBe(false);
    const win = resolveFight(first, 'wanhua_lt1', 'win', 0);
    expect(win.result.incense).toBe(10);
    expect(win.state.characters.a_biao).toBeTruthy();
    expect(win.state.meta.squadSlots).toBe(4);
    expect(win.result.underdog).toBe(false);
  });
});
