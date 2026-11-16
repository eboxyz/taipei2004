/**
 * The game's clock. In production it is just Date.now(). In dev builds a debug speed
 * (2×, 4×, 10×) makes game time run faster than real time by building up an offset,
 * which is kept in localStorage so the day/night clock stays consistent across reloads.
 */

export const DEBUG = import.meta.env.DEV;
export const DEBUG_SPEEDS = [1, 2, 4, 10] as const;
export type DebugSpeed = (typeof DEBUG_SPEEDS)[number];

const KEY = 'taipei2004.debugClock';

let speed: DebugSpeed = 1;
let offset = 0;
const listeners = new Set<() => void>();

if (DEBUG) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { speed?: number; offset?: number } | null;
    if (raw && DEBUG_SPEEDS.includes(raw.speed as DebugSpeed)) speed = raw.speed as DebugSpeed;
    if (raw && typeof raw.offset === 'number' && Number.isFinite(raw.offset)) offset = raw.offset;
  } catch {
    /* storage unavailable: run at 1× */
  }
}

function persist() {
  if (!DEBUG) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ speed, offset }));
  } catch {
    /* ignore */
  }
}

/** Current game time in ms. */
export function gameNow(): number {
  return Date.now() + offset;
}

export function getSpeed(): DebugSpeed {
  return speed;
}

export function setSpeed(next: DebugSpeed) {
  speed = next;
  persist();
  for (const l of listeners) l();
}

export function subscribeSpeed(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Called by the engine each tick: real time passed, so game time passes `speed` times as fast. */
export function advance(realMs: number) {
  if (speed === 1) return;
  offset += realMs * (speed - 1);
}

/** Saved alongside the game so a reload keeps the sped-up clock. */
export function persistClock() {
  persist();
}
