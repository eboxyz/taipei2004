import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let storage: Map<string, string>;
let documentTarget: EventTarget & { visibilityState: string; hidden: boolean };
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-16T10:00:00Z'));
  storage = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  documentTarget = Object.assign(new EventTarget(), { visibilityState: 'visible', hidden: false });
  vi.stubGlobal('document', documentTarget); vi.stubGlobal('window', new EventTarget());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('save health and phone resume', () => {
  it('exposes a storage failure and clears it after a successful save', async () => {
    const engine = await import('./engine'); engine.bootState();
    const goodSet = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('storage full'); };
    engine.save(); expect(engine.getSaveHealth()).toEqual({ failed: true, lastSuccess: 0 });
    localStorage.setItem = goodSet;
    engine.save(); expect(engine.getSaveHealth().failed).toBe(false);
    expect(engine.getSaveHealth().lastSuccess).toBe(Date.now());
    expect(storage.has('taipei2004.save')).toBe(true);
  });

  it('applies a phone absence once, saves it, and reloads without duplicating income', async () => {
    const engine = await import('./engine');
    const { store } = await import('./store');
    const { buyLot } = await import('../game/actions');
    const { ALL_LOTS } = await import('../game/content/areas');
    const { incomePerSec } = await import('../game/economy');
    engine.bootState();
    const lot = Object.values(ALL_LOTS).find((l) => l.area === 'wanhua' && !l.lock)!;
    const purchase = buyLot(store.get(), lot.id); expect(purchase.ok).toBe(true);
    if (!purchase.ok) throw new Error(purchase.reason);
    store.set(purchase.state);
    const rate = incomePerSec(store.get(), 'average'); expect(rate).toBeGreaterThan(0);
    const away = vi.fn(); const stop = engine.startEngine({ onEvents: () => {}, onAway: away });
    documentTarget.visibilityState = 'hidden'; documentTarget.hidden = true;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    const safe = store.get().safe;
    // A suspended browser does not execute the interval during this gap.
    vi.setSystemTime(Date.now() + 120_000);
    documentTarget.visibilityState = 'visible'; documentTarget.hidden = false;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(store.get().safe - safe).toBeCloseTo(rate * 120);
    const resumed = store.get().safe;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(store.get().safe).toBe(resumed); expect(away).toHaveBeenCalledTimes(1);
    engine.save(); stop(); engine.bootState();
    const stopAgain = engine.startEngine({ onEvents: () => {}, onAway: away });
    expect(store.get().safe).toBe(resumed); expect(away).toHaveBeenCalledTimes(1);
    stopAgain();
  });
});
