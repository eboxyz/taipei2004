/** Explicit, opt-in events through PostHog's documented ingestion API. No replay or autocapture. */
import { useSyncExternalStore } from 'react';
import type { GameState } from '../game/types';

const CHOICE = 'taipei2004.analytics';
const ID = 'taipei2004.analyticsId';
const TOKEN = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN as string | undefined;
const HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
const listeners = new Set<() => void>();
let enabled = false;
try { enabled = localStorage.getItem(CHOICE) === 'yes'; } catch { /* default off */ }
let distinctId: string | null = null;
let activeStarted = 0;
let activeMs = 0;
let sent = 0;
let errors = 0;
export function trackingEnabled() { return enabled; }
export function useTracking() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, trackingEnabled);
}
export function track(event: string, properties: Record<string, string | number | boolean> = {}) {
  if (!enabled || !import.meta.env.PROD || !TOKEN || !HOST || sent >= 500) return;
  try {
    if (!distinctId) {
      distinctId = localStorage.getItem(ID) || crypto.randomUUID();
      localStorage.setItem(ID, distinctId);
    }
    sent++;
    void fetch(`${HOST}/i/v0/e/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ token: TOKEN, event, properties: {
        ...properties, distinct_id: distinctId, $process_person_profile: false,
        $geoip_disable: true, $ip: null, environment: 'production',
        build: __BUILD_ID__, active_seconds: Math.round((activeMs + (activeStarted ? performance.now() - activeStarted : 0)) / 1000),
      } }),
    }).catch(() => { /* analytics must never interrupt play */ });
  } catch { /* storage or network unavailable */ }
}
export function setTracking(next: boolean) {
  const changed = enabled !== next;
  enabled = next;
  try {
    localStorage.setItem(CHOICE, next ? 'yes' : 'no');
    if (!next) localStorage.removeItem(ID);
  } catch { /* choice still applies to this page */ }
  if (!next) distinctId = null;
  for (const fn of listeners) fn();
  if (next && changed) {
    activeMs = 0; activeStarted = document.hidden ? 0 : performance.now();
    track('session_started');
  }
}
export function initAnalytics() {
  activeStarted = document.hidden ? 0 : performance.now();
  track('session_started');
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (activeStarted) activeMs += performance.now() - activeStarted;
      activeStarted = 0;
      track('session_paused');
    } else { activeStarted = performance.now(); track('session_resumed'); }
  });
  // Send error category and source location only, never messages, URLs or save data.
  window.addEventListener('error', (e) => {
    if (errors++ < 10) track('browser_error', { category: 'uncaught_error', line: e.lineno, column: e.colno });
  });
  window.addEventListener('unhandledrejection', () => {
    if (errors++ < 10) track('browser_error', { category: 'unhandled_rejection' });
  });
}
/** Ignore imports, resets and cash-outs when deciding whether a purchase happened. */
export function trackProgress(before: GameState, after: GameState) {
  if (after.meta.runs !== before.meta.runs) {
    if (after.meta.runs === before.meta.runs + 1) track('cash_out', { run: after.meta.runs, face_earned: after.meta.faceTotal - before.meta.faceTotal });
    return;
  }
  if (after.stats.lotsBought > before.stats.lotsBought && before.stats.lotsBought === 0) track('first_property_bought');
  for (const id of Object.keys(after.areas) as Array<keyof GameState['areas']>) {
    if (after.areas[id].boss && !before.areas[id].boss) track('district_claimed', { area: id, run: after.meta.runs });
  }
}
