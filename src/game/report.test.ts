import { describe, expect, it } from 'vitest';
import { runBattle } from './battle';
import { battleReport, ODDS_RUNS, oddsWord, practiceWins } from './report';
import { initialState } from './state';
import { battleInputFor, fillSquad } from './turf';
import type { GameState } from './types';

function crew(levels: Record<string, number>, slots: number): GameState {
  const s = initialState(0);
  const characters = { ...s.characters };
  for (const [id, level] of Object.entries(levels)) characters[id] = { level, xp: 0, stars: 1 };
  return fillSquad({ ...s, characters, meta: { ...s.meta, squadSlots: slots } }, 'balanced');
}

describe('odds', () => {
  it('turns win rates into words', () => {
    expect(oddsWord(0.9)).toBe('likely');
    expect(oddsWord(0.5)).toBe('even');
    expect(oddsWord(0.1)).toBe('long');
  });

  it('gives the same answer for the same squad', () => {
    const input = battleInputFor(crew({ hai_shu: 2, a_di: 2, a_cai: 2 }, 3), 'wanhua_lt1', 'day');
    const a = practiceWins(input, 0, ODDS_RUNS);
    expect(practiceWins(input, 0, ODDS_RUNS)).toBe(a);
    // Running it in slices adds up to the same total.
    expect(practiceWins(input, 0, 8) + practiceWins(input, 8, ODDS_RUNS)).toBe(a);
  });

  it('a much stronger squad gets better odds', () => {
    const weak = battleInputFor(crew({ hai_shu: 1, a_di: 1, a_cai: 1 }, 3), 'wanhua_boss', 'day');
    const strong = battleInputFor(crew({ hai_shu: 12, a_di: 12, a_cai: 12, a_biao: 10, gui_yi: 10 }, 5), 'wanhua_boss', 'day');
    expect(practiceWins(strong, 0, ODDS_RUNS)).toBeGreaterThan(practiceWins(weak, 0, ODDS_RUNS));
  });
});

describe('after-fight report', () => {
  it('describes a win', () => {
    const input = battleInputFor(crew({ hai_shu: 12, a_di: 12, a_cai: 12 }, 3), 'wanhua_lt1', 'night');
    const { outcome, battle } = runBattle(input, 1);
    expect(outcome).toBe('win');
    expect(battleReport(battle)).toMatch(/^Won /);
  });

  it('describes a loss without blaming anything that did not happen', () => {
    const input = battleInputFor(crew({ hai_shu: 1, a_di: 1, a_cai: 1 }, 3), 'wanhua_boss', 'day');
    const { outcome, battle } = runBattle(input, 1);
    expect(outcome).toBe('lose');
    const line = battleReport(battle);
    expect(line).toMatch(/front row fell|went down|Time ran out/);
    // Miaokou's boss calls in runners; the line only mentions them if 3+ actually arrived.
    const runners = battle.units.filter((u) => u.side === 'them' && u.spec.slot < 0).length;
    expect(line.includes('troupe runners')).toBe(runners >= 3);
  });
});
