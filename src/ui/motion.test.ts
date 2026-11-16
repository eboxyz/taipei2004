import { describe, expect, it } from 'vitest';
import { createShakeDetector, requestMotionAccess } from './motion';

const gravity = (x = 0) => ({ acceleration: null, accelerationIncludingGravity: { x, y: 0, z: 9.81 } });
const linear = (x = 0) => ({ acceleration: { x, y: 0, z: 0 }, accelerationIncludingGravity: { x: null, y: null, z: null } });

describe('temple phone motion', () => {
  it('does not count a stationary phone or ordinary sensor noise', () => {
    const detect = createShakeDetector();
    for (let i = 0; i < 100; i++) expect(detect(gravity(Math.sin(i) * 0.2), i * 20).shake).toBe(false);
  });

  it('counts four ordinary jolts without requiring more than 1g', () => {
    const detect = createShakeDetector();
    detect(gravity(), 0);
    let shakes = 0;
    for (let i = 1; i <= 4; i++) {
      detect(gravity(), i * 400 - 50);
      if (detect(gravity(i % 2 ? 8 : -8), i * 400).shake) shakes++;
    }
    expect(shakes).toBe(4);
  });

  it('uses valid acceleration when the gravity object contains only null axes', () => {
    const detect = createShakeDetector();
    expect(detect(linear(), 0).live).toBe(true);
    expect(detect(linear(8), 300).shake).toBe(true);
  });

  it('does not count a sustained acceleration as repeated shakes', () => {
    const detect = createShakeDetector();
    detect(linear(), 0);
    expect(detect(linear(8), 300).shake).toBe(true);
    expect(detect(linear(8), 600).shake).toBe(false);
    detect(linear(), 650);
    expect(detect(linear(-8), 900).shake).toBe(true);
  });

  it('ignores missing data and resets when the sensor source changes', () => {
    const detect = createShakeDetector();
    expect(detect({ acceleration: null, accelerationIncludingGravity: null }, 0)).toEqual({ live: false, shake: false });
    detect(gravity(), 10);
    expect(detect(linear(9), 300).shake).toBe(false);
  });

  it('reports HTTPS, unavailable sensors, denied and granted permission separately', async () => {
    expect(await requestMotionAccess({ isSecureContext: false })).toBe('insecure');
    expect(await requestMotionAccess({ isSecureContext: true })).toBe('unavailable');
    const env = (permission: string) => ({ isSecureContext: true, DeviceMotionEvent: { requestPermission: async () => permission } });
    expect(await requestMotionAccess(env('denied'))).toBe('denied');
    expect(await requestMotionAccess(env('granted'))).toBe('waiting');
    expect(await requestMotionAccess({ isSecureContext: true, DeviceMotionEvent: {} })).toBe('waiting');
    expect(await requestMotionAccess({ isSecureContext: true, DeviceMotionEvent: { requestPermission: async () => { throw new Error('blocked'); } } })).toBe('denied');
  });
});
