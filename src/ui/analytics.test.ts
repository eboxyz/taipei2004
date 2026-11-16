import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('PROD', true);
  vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', 'phc_test');
  vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');
  vi.stubGlobal('__BUILD_ID__', 'test-build');
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('optional game tracking', () => {
  it('sends nothing until enabled, uses a browser ID, and stops after withdrawal', async () => {
    const a = await import('./analytics'); a.initAnalytics(); a.track('battle_finished');
    expect(fetch).not.toHaveBeenCalled();
    a.setTracking(true); a.track('battle_finished', { outcome: 'win' });
    expect(fetch).toHaveBeenCalledTimes(2);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[1]![1]!.body as string);
    expect(body.event).toBe('battle_finished'); expect(body.token).toBe('phc_test');
    expect(body.properties.$geoip_disable).toBe(true); expect(body.properties.$ip).toBe(null);
    expect(body.properties.$process_person_profile).toBe(false);
    expect(body.properties.distinct_id).toBeTruthy();
    a.setTracking(false); a.track('draw_purchased'); expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not send development traffic and ignores network failures', async () => {
    vi.stubEnv('PROD', false);
    const a = await import('./analytics'); a.setTracking(true); a.track('test');
    expect(fetch).not.toHaveBeenCalled();
    vi.stubEnv('PROD', true); vi.mocked(fetch).mockRejectedValue(new Error('blocked'));
    expect(() => a.track('test')).not.toThrow(); await Promise.resolve();
  });

  it('caps event volume and omits error messages and URL details', async () => {
    const a = await import('./analytics'); a.initAnalytics(); a.setTracking(true);
    window.dispatchEvent(new Event('unhandledrejection'));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[1]![1]!.body as string);
    expect(body.event).toBe('browser_error'); expect(body.properties.message).toBeUndefined();
    for (let i = 0; i < 600; i++) a.track('test');
    expect(fetch).toHaveBeenCalledTimes(500);
  });
});
