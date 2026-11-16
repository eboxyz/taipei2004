export type NumberFormat = 'cjk' | 'kmb';

const CJK_UNITS: [number, string][] = [
  [1e16, '京'],
  [1e12, '兆'],
  [1e8, '億'],
  [1e4, '萬'],
];

const KMB_UNITS: [number, string][] = [
  [1e15, 'Q'],
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

function trim(v: number): string {
  const digits = v < 10 ? 2 : v < 100 ? 1 : 0;
  return v.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/** Formats a number with 萬/億/兆/京 or K/M/B/T/Q, then scientific notation. */
export function formatNumber(n: number, fmt: NumberFormat = 'cjk'): string {
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  const units = fmt === 'cjk' ? CJK_UNITS : KMB_UNITS;
  const top = units[0]![0];
  if (a >= top * 1e4) return sign + a.toExponential(2).replace('e+', 'e');
  for (let i = 0; i < units.length; i++) {
    const [size, label] = units[i]!;
    if (a < size) continue;
    const v = a / size;
    // 9999.6萬 would round to 10000萬; show it as 1億 instead.
    const rollover = fmt === 'cjk' ? 1e4 : 1e3;
    const bigger = units[i - 1];
    if (Math.round(v) >= rollover && bigger) return sign + trim(a / bigger[0]) + bigger[1];
    return sign + trim(v) + label;
  }
  return sign + Math.floor(a).toLocaleString('en-US');
}

export function formatMoney(n: number, fmt: NumberFormat = 'cjk'): string {
  return 'NT$' + formatNumber(n, fmt);
}

/** A multiplier: ×1.25, ×12.5, ×3,200. */
export function formatMult(x: number): string {
  return '×' + (x >= 100 ? Math.round(x).toLocaleString('en-US') : trim(x));
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function formatPercent(x: number): string {
  // Never round up to 100%: it should only appear when it's really complete.
  if (x < 1 && x >= 0.995) return '99%';
  return `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
}
