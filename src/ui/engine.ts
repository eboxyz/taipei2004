import type { ActionResult } from '../game/actions';
import { applyOffline, type AwaySummary } from '../game/offline';
import { clearLocal, loadLocal, saveLocal } from '../game/save';
import { initialState } from '../game/state';
import { tick } from '../game/tick';
import type { GameEvent, GameState } from '../game/types';
import { store } from './store';
import { trackProgress } from './analytics';
import { advance, gameNow, getSpeed, persistClock } from './time';

const TICK_MS = 100;
const SAVE_MS = 10_000;
/** Gaps longer than this (tab asleep, phone locked) count as offline time. */
const OFFLINE_AFTER_S = 20;
/** Only show the away summary for absences at least this long. */
const SUMMARY_AFTER_S = 60;

export interface EngineHooks {
  onEvents: (events: GameEvent[]) => void;
  onAway: (summary: AwaySummary) => void;
}

let hooks: EngineHooks | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
/** Real (wall-clock) ms of the last tick. Game time comes from gameNow(). */
let lastTick = 0;
let lastSave = 0;

function catchUp(now: number) {
  const s = store.get();
  const gap = (now - s.lastSeen) / 1000;
  if (gap < OFFLINE_AFTER_S) return;
  const { state, summary } = applyOffline(s, gap, now);
  store.set(state);
  if (gap >= SUMMARY_AFTER_S) hooks?.onAway(summary);
}

function step() {
  const real = Date.now();
  const realDt = (real - lastTick) / 1000;
  lastTick = real;
  if (realDt > OFFLINE_AFTER_S) {
    catchUp(gameNow());
  } else if (realDt > 0) {
    advance(realDt * 1000);
    const r = tick(store.get(), realDt * getSpeed(), gameNow());
    store.set(r.state);
    if (r.events.length) hooks?.onEvents(r.events);
  }
  if (real - lastSave > SAVE_MS) save();
}

const saveHealthListeners = new Set<() => void>();
let saveHealth = { lastSuccess: 0, failed: false };
export function getSaveHealth() { return saveHealth; }
export function subscribeSaveHealth(fn: () => void) {
  saveHealthListeners.add(fn); return () => { saveHealthListeners.delete(fn); };
}

export function save() {
  lastSave = Date.now();
  const ok = saveLocal(store.get());
  saveHealth = { lastSuccess: ok ? Date.now() : saveHealth.lastSuccess, failed: !ok };
  for (const fn of saveHealthListeners) fn();
  persistClock();
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    save();
  } else {
    lastTick = Date.now();
    catchUp(gameNow());
  }
}

/** Loads the save (or a fresh game) into the store. Call once before the first render. */
export function bootState() {
  const now = gameNow();
  store.set(loadLocal(now) ?? initialState(now));
}

/** Starts ticking and autosaving; applies any offline time since the save was written. */
export function startEngine(h: EngineHooks) {
  hooks = h;
  catchUp(gameNow());
  lastTick = Date.now();
  lastSave = Date.now();
  if (timer) clearInterval(timer);
  timer = setInterval(step, TICK_MS);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', save);
  if (import.meta.env.DEV) {
    // Dev helpers: taipei2004.skip(3 * 3600) pretends you were away for 3 hours; state()/set() read and replace the state.
    (window as unknown as { taipei2004: unknown }).taipei2004 = { skip: debugSkip, state: () => store.get(), set: (next: GameState) => store.set(next) };
  }
  return () => {
    if (timer) clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', save);
  };
}

/** Dev only: pretend you were away for `seconds` (shows the away message). */
export function debugSkip(seconds: number) {
  const t = gameNow();
  store.set({ ...store.get(), lastSeen: t - seconds * 1000 });
  lastTick = Date.now();
  catchUp(t);
}

/** Applies a player action; returns the failure reason, if any. */
export function act(fn: (s: GameState) => ActionResult): string | null {
  const r = fn(store.get());
  if (!r.ok) return r.reason;
  trackProgress(store.get(), r.state);
  store.set(r.state);
  return null;
}

/** Applies a change that can't fail (settings, squad edits). */
export function update(fn: (s: GameState) => GameState) {
  const before = store.get();
  const after = fn(before);
  trackProgress(before, after);
  store.set(after);
}

export function replaceState(next: GameState) {
  store.set({ ...next, lastSeen: gameNow() });
  lastTick = Date.now();
  save();
}

export function resetGame() {
  clearLocal();
  replaceState(initialState(gameNow()));
}
