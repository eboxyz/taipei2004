import { describe, expect, it } from 'vitest';
import { createBattle, runBattle } from '../game/battle';
import { battleInputFor } from '../game/turf';
import { initialState, migrate } from '../game/state';
import { createBattlePlayback } from './battlePlayback';

const input = () => battleInputFor(initialState(0), 'wanhua_lt1', 'day');

describe('battle playback without focus', () => {
  it('advances two simulated seconds per real second at the default speed', () => {
    const battle = createBattle(input(), 42, true);
    const advance = createBattlePlayback(battle, 1000);
    advance(2000, initialState(0).settings.battleSpeed);
    expect(battle.t).toBeCloseTo(2);
  });

  it('produces the same result with regular frames or one background catch-up', () => {
    const smooth = createBattle(input(), 123, true);
    const hidden = createBattle(input(), 123, true);
    const frames = createBattlePlayback(smooth, 0);
    const catchUp = createBattlePlayback(hidden, 0);
    for (let t = 16; t < 60_000; t += 16) frames(t, 8);
    frames(60_000, 8); catchUp(60_000, 8);
    expect(hidden.outcome).toBeTruthy();
    expect(hidden.t).toBe(smooth.t);
    expect(hidden.outcome).toBe(smooth.outcome);
    expect(hidden.units).toEqual(smooth.units);
    expect(hidden.events).toEqual(smooth.events);
    expect(hidden.outcome).toBe(runBattle(input(), 123).outcome);
  });

  it('does not process another result after completion and handles speed changes', () => {
    const battle = createBattle(input(), 42, true);
    const advance = createBattlePlayback(battle, 0);
    advance(1000, 1); expect(battle.t).toBeCloseTo(1);
    advance(2000, 8); expect(battle.t).toBeCloseTo(9);
    advance(60_000, 8);
    let events = 0; const time = battle.t;
    advance(120_000, 8, () => events++);
    expect(events).toBe(0); expect(battle.t).toBe(time);
  });

  it('migrates old defaults once and preserves a later deliberate slower setting', () => {
    const fresh = initialState(0);
    expect(fresh.settings.battleSpeed).toBe(2);
    const old = { ...fresh, version: 6, settings: { ...fresh.settings, battleSpeed: 8 } };
    expect(migrate(old, 0)!.settings.battleSpeed).toBe(2);
    expect(migrate({ ...fresh, settings: { ...fresh.settings, battleSpeed: 1 } }, 0)!.settings.battleSpeed).toBe(1);
    expect(migrate({ ...fresh, settings: { ...fresh.settings, battleSpeed: 8 } }, 0)!.settings.battleSpeed).toBe(8);
  });
});
