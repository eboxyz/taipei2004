import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES } from '../../game/content/categories';
import { CHARACTERS } from '../../game/content/characters';
import { FACTIONS } from '../../game/content/areas';
import { formatMoney, formatNumber } from '../../game/format';
import { artUrl } from '../art';
import { useGame } from '../store';

/* ---------- LED dot-matrix icon (fallback until PixelLab icons exist) ---------- */

const GENERIC_LED = [
  '............',
  '.##########.',
  '.#........#.',
  '.#.##..##.#.',
  '.#.##..##.#.',
  '.#........#.',
  '.#.##..##.#.',
  '.#.##..##.#.',
  '.#........#.',
  '.#...##...#.',
  '.#...##...#.',
  '.##########.',
];

export function LedIcon({ category, size = 56 }: { category: string; size?: number }) {
  const url = artUrl('lots', category === 'commuter_home' ? 'luxury_condo' : category);
  if (url) {
    // PixelLab icons are 32×32. Show them at the largest half-step scale that fits inside the border.
    const px = (Math.floor(((size - 4) / 32) * 2) / 2) * 32;
    return (
      <div className="led" style={{ width: size, height: size }}>
        <img src={url} alt="" width={px} height={px} draggable={false} />
      </div>
    );
  }
  const def = CATEGORIES[category];
  const rows = def?.led ?? GENERIC_LED;
  const color = def?.ledColor ?? '#2EF0FF';
  const n = rows.length;
  return (
    <div className="led" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox={`0 0 ${n} ${n}`} width={size - 12} height={size - 12}>
        <defs>
          <filter id={`glow-${category}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.35" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {rows.flatMap((row, y) =>
          [...row].map((ch, x) => (
            <circle
              key={`${x}-${y}`}
              cx={x + 0.5}
              cy={y + 0.5}
              r={0.38}
              fill={ch === '#' ? color : 'rgba(255,255,255,0.06)'}
              filter={ch === '#' ? `url(#glow-${category})` : undefined}
            />
          )),
        )}
      </svg>
    </div>
  );
}

/* ---------- Character portrait (art or placeholder) ---------- */

export function Portrait({ id, face = false, className = '', style }: { id: string; face?: boolean; className?: string; style?: CSSProperties }) {
  const def = CHARACTERS[id];
  const url = artUrl('characters', id);
  const [c1, c2] = def ? FACTIONS[def.faction].colors : ['#33276a', '#120c2e'];
  return (
    <div
      className={`portrait ${face ? 'face' : ''} ${className}`}
      style={{ ['--c1' as string]: c1, ['--c2' as string]: c2, ...style }}
    >
      {url ? (
        <img src={url} alt={def?.name ?? id} loading="lazy" draggable={false} />
      ) : (
        <div className="initials" style={{ fontSize: face ? 16 : 40 }}>
          {def?.nameZh.slice(-1) ?? '?'}
        </div>
      )}
    </div>
  );
}

/* ---------- Money with press-and-hold English value ---------- */

export function Money({ value, prefix = true, className }: { value: number; prefix?: boolean; className?: string }) {
  const fmt = useGame().settings.numberFormat;
  const [tip, setTip] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = prefix ? formatMoney(value, fmt) : formatNumber(value, fmt);
  const alt = fmt === 'cjk' ? formatNumber(value, 'kmb') : Math.round(value).toLocaleString('en-US');
  const start = () => {
    timer.current = setTimeout(() => setTip(true), 400);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    setTip(false);
  };
  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {text}
      {tip && (
        <span className="hold-tip" style={{ left: '50%', top: 0 }}>
          {prefix ? 'NT$' : ''}
          {alt}
        </span>
      )}
    </span>
  );
}

/* ---------- Hold-to-repeat button behaviour ---------- */

export function useHoldRepeat(action: () => boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionRef = useRef(action);
  actionRef.current = action;
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const start = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (!actionRef.current()) return;
    let delay = 380;
    const loop = () => {
      timer.current = setTimeout(() => {
        if (!actionRef.current()) return stop();
        delay = Math.max(60, delay * 0.8);
        loop();
      }, delay);
    };
    loop();
  };
  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        actionRef.current();
      }
    },
  };
}

/* ---------- Icons ---------- */

export function SunIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x="11" y="1" width="2" height="4" rx="1" fill="currentColor" transform={`rotate(${a} 12 12)`} />
      ))}
    </svg>
  );
}

export function MoonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="currentColor" />
    </svg>
  );
}

export function PhaseTag({ tag, live }: { tag: 'day' | 'night'; live?: boolean }) {
  return (
    <span className="tag" data-tag={tag} data-live={live ? 'true' : 'false'}>
      {tag === 'day' ? <SunIcon size={10} /> : <MoonIcon size={10} />}
      {tag}
    </span>
  );
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const host = document.querySelector('.phone') ?? document.body;
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </>,
    host,
  );
}

/* ---------- Stars ---------- */

export function Stars({ n, max = 5, className = '' }: { n: number; max?: number; className?: string }) {
  return (
    <span className={`stars ${className}`} aria-label={`${n} star${n === 1 ? '' : 's'} of ${max}`}>
      {'★'.repeat(n)}
      <span className="stars-off">{'★'.repeat(Math.max(0, max - n))}</span>
    </span>
  );
}
