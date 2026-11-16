import { useEffect, useState } from 'react';
import type { BattleInput } from '../game/battle';
import { ODDS_RUNS, practiceWins } from '../game/report';

/** Win rates by battle input, so a squad is only simulated once per session. */
const cache = new Map<string, number>();
const SLICE = 4;

/**
 * Win rate from practice runs of this exact battle, or null while it's still being worked out.
 * Runs a few battles per slice so a slow phone never stutters.
 */
export function useWinRate(input: BattleInput | null): number | null {
  const key = input ? JSON.stringify(input) : '';
  const [rate, setRate] = useState<number | null>(() => cache.get(key) ?? null);
  useEffect(() => {
    if (!input) {
      setRate(null);
      return;
    }
    const known = cache.get(key);
    if (known !== undefined) {
      setRate(known);
      return;
    }
    setRate(null);
    let done = 0;
    let wins = 0;
    let timer = 0;
    const step = () => {
      const to = Math.min(ODDS_RUNS, done + SLICE);
      wins += practiceWins(input, done, to);
      done = to;
      if (done < ODDS_RUNS) {
        timer = window.setTimeout(step, 0);
        return;
      }
      cache.set(key, wins / ODDS_RUNS);
      setRate(wins / ODDS_RUNS);
    };
    timer = window.setTimeout(step, 0);
    return () => window.clearTimeout(timer);
    // `key` captures everything about `input` that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return rate;
}
