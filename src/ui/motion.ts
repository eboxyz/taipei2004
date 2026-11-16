type Acceleration = { x: number | null; y: number | null; z: number | null };
type MotionSample = { acceleration: Acceleration | null; accelerationIncludingGravity: Acceleration | null };

function vector(a: Acceleration | null): [number, number, number] | null {
  if (!a) return null;
  const values = [a.x, a.y, a.z];
  if (!values.some((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  return values.map((v) => typeof v === 'number' && Number.isFinite(v) ? v : 0) as [number, number, number];
}

/** One detector per draw. Acceleration is in m/s²; ignore gravity and sensor noise. */
export function createShakeDetector() {
  let base: [number, number, number] | null = null;
  let source: 'linear' | 'gravity' | null = null;
  let nextShake = -Infinity;
  let armed = true;
  return (sample: MotionSample, now: number): { live: boolean; shake: boolean } => {
    const linear = vector(sample.acceleration);
    const raw = linear ?? vector(sample.accelerationIncludingGravity);
    if (!raw) return { live: false, shake: false };
    const nextSource = linear ? 'linear' : 'gravity';
    if (source !== nextSource) {
      source = nextSource;
      base = raw;
      armed = true;
      return { live: true, shake: false };
    }
    let jolt = Math.hypot(...raw);
    if (source === 'gravity') {
      jolt = Math.hypot(...raw.map((v, i) => v - base![i]!));
      base = raw.map((v, i) => base![i]! + (v - base![i]!) * 0.1) as [number, number, number];
    }
    if (jolt < 3) armed = true;
    const shake = armed && jolt >= 6 && now >= nextShake;
    if (shake) {
      armed = false;
      nextShake = now + 250;
    }
    return { live: true, shake };
  };
}

export type MotionAccess = 'waiting' | 'insecure' | 'unavailable' | 'denied';

/** Call directly from a tap: iOS requires transient user activation for permission. */
export async function requestMotionAccess(env: {
  isSecureContext: boolean;
  DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
}): Promise<MotionAccess> {
  if (!env.isSecureContext) return 'insecure';
  if (!env.DeviceMotionEvent) return 'unavailable';
  try {
    const permission = await env.DeviceMotionEvent.requestPermission?.();
    return permission === undefined || permission === 'granted' ? 'waiting' : 'denied';
  } catch {
    return 'denied';
  }
}
