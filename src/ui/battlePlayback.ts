import { stepBattle, type Battle, type BattleEvent } from '../game/battle';

const STEP = 0.05;

/** Advance by elapsed wall time, independent of rendering or throttled timer cadence. */
export function createBattlePlayback(battle: Battle, startedAt: number) {
  let last = startedAt;
  let accumulated = 0;
  return (now: number, speed: number, onEvents: (events: BattleEvent[]) => void = () => {}) => {
    if (!Number.isFinite(now) || !Number.isFinite(speed) || speed <= 0) return;
    accumulated += Math.max(0, now - last) / 1000 * speed;
    last = Math.max(last, now);
    while (accumulated + 1e-9 >= STEP && !battle.outcome) {
      accumulated -= STEP;
      onEvents(stepBattle(battle, STEP));
    }
  };
}
