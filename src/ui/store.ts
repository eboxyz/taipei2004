import { useSyncExternalStore } from 'react';
import type { GameState } from '../game/types';
import { gameNow } from './time';

type Listener = () => void;

let current: GameState | null = null;
const listeners = new Set<Listener>();

export const store = {
  get(): GameState {
    if (!current) throw new Error('Game state not initialised');
    return current;
  },
  set(next: GameState) {
    current = next;
    for (const l of listeners) l();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useGame(): GameState {
  return useSyncExternalStore(store.subscribe, store.get);
}

/** Re-renders on an interval so clocks and timers stay live between game ticks. */
export function useNow(intervalMs = 1000): number {
  return useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, intervalMs);
      return () => clearInterval(id);
    },
    () => Math.floor(gameNow() / intervalMs) * intervalMs,
  );
}
