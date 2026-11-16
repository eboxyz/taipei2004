/**
 * Turf War odds and after-fight reports.
 *
 * Odds come from practice runs of the exact squad with the real battle engine, because displayed
 * power can't see attack speed, skills or auras. Reports only state what actually happened.
 */
import { runBattle, type Battle, type BattleInput } from './battle';

/** Practice runs per estimate. Fixed seeds, so the same squad always gets the same answer. */
export const ODDS_RUNS = 20;
const ODDS_SEED = 9001;

export type OddsWord = 'likely' | 'even' | 'long';

export const ODDS_TEXT: Record<OddsWord, string> = {
  likely: 'Likely win',
  even: 'Even fight',
  long: 'Long shot',
};

export function oddsWord(rate: number): OddsWord {
  return rate >= 0.7 ? 'likely' : rate >= 0.35 ? 'even' : 'long';
}

/** Wins in practice runs [from, to), for running the estimate in small slices. */
export function practiceWins(input: BattleInput, from: number, to: number): number {
  let wins = 0;
  for (let i = from; i < to; i++) if (runBattle(input, ODDS_SEED + i).outcome === 'win') wins++;
  return wins;
}

function clock(t: number): string {
  const s = Math.max(0, Math.round(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** One line on how a finished battle went, from your side's point of view. */
export function battleReport(b: Battle): string {
  // Called-in troupe runners have slot -1; everyone else started the fight.
  const mine = b.units.filter((u) => u.side === 'you' && u.spec.slot >= 0);
  const theirs = b.units.filter((u) => u.side === 'them');
  const permits = b.sides.them.permitStacks;
  const runners = theirs.filter((u) => u.spec.slot < 0).length;
  const trick =
    permits >= 3
      ? ` They had stacked ${permits} permits (+${permits * 5}% stats).`
      : runners >= 3
        ? ` They called in ${runners} troupe runners.`
        : '';

  if (b.outcome === 'win') {
    const down = mine.filter((u) => !u.alive).length;
    if (b.t >= b.input.timeLimit * 0.85) return `Won at ${clock(b.t)}, just before time ran out.`;
    if (down === 0) return `Won in ${clock(b.t)} without losing anyone.`;
    return `Won in ${clock(b.t)}. ${down} of your crew went down.${trick}`;
  }

  if (b.t >= b.input.timeLimit) {
    const left = theirs.filter((u) => u.alive).length;
    return `Time ran out with ${left} of theirs still standing. More damage would finish it.${trick}`;
  }
  const front = mine.filter((u) => u.row === 'front' && !u.commander);
  if (front.length > 0 && front.every((u) => !u.alive)) {
    const fell = Math.max(...front.map((u) => u.koAt ?? b.t));
    return `Your front row fell at ${clock(fell)}, and the rest followed.${trick}`;
  }
  return `Your crew went down at ${clock(b.t)}.${trick}`;
}
