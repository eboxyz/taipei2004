import { useState, useSyncExternalStore, type JSX, type ReactNode } from 'react';
import { CHARACTERS } from '../../game/content/characters';
import { clockLabel, phaseAt, secondsToNextPhase } from '../../game/clock';
import { incomePerSec, safeCapacity } from '../../game/economy';
import { collectSafe } from '../../game/actions';
import { formatDuration, formatMoney } from '../../game/format';
import type { AwaySummary } from '../../game/offline';
import { act } from '../engine';
import { useGame, useNow } from '../store';
import { DEBUG, DEBUG_SPEEDS, getSpeed, setSpeed, subscribeSpeed } from '../time';
import { Money, MoonIcon, SunIcon } from './bits';

export type Tab = 'map' | 'crew' | 'draws' | 'office';

export function useDebugSpeed() {
  return useSyncExternalStore(subscribeSpeed, getSpeed);
}

/** Dev builds only: tap to cycle game speed 1× → 2× → 4× → 10×. */
function DebugSpeedPill() {
  const speed = useDebugSpeed();
  const next = DEBUG_SPEEDS[(DEBUG_SPEEDS.indexOf(speed) + 1) % DEBUG_SPEEDS.length]!;
  return (
    <button className="debug-pill" data-fast={speed > 1} onClick={() => setSpeed(next)} aria-label={`Debug game speed ${speed}×. Tap for ${next}×.`}>
      <span>DEV</span>
      {speed}×
    </button>
  );
}

export function TopBar() {
  const s = useGame();
  const now = useNow(1000);
  const phase = phaseAt(now);
  const rate = incomePerSec(s, phase);
  const toNext = secondsToNextPhase(now);
  return (
    <header className="topbar">
      <div className="cash">
        <div className="cash-value">
          <Money value={s.cash} />
        </div>
        <div className="cash-rate">
          +<Money value={rate} />/s
        </div>
      </div>
      {DEBUG && <DebugSpeedPill />}
      <div className="clock" data-phase={phase} aria-label={`${phase}, ${clockLabel(now)}`}>
        {phase === 'day' ? <SunIcon /> : <MoonIcon />}
        <span>{clockLabel(now)}</span>
        <span className="next">{phase === 'day' ? 'dusk' : 'dawn'} {Math.ceil(toNext / 60)}m</span>
      </div>
    </header>
  );
}

const TAB_ICONS: Record<Tab, JSX.Element> = {
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M3 12h18" />
      <path d="M12 3v18" opacity="0.5" />
      <circle cx="7" cy="12" r="2.4" fill="currentColor" />
      <circle cx="12" cy="12" r="2.4" fill="var(--night-2)" />
      <circle cx="17" cy="12" r="2.4" fill="currentColor" />
    </svg>
  ),
  crew: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.8 16.5c.8-1.8 5.6-1.8 6.4 0" />
      <path d="M14 10h4M14 13.5h3" strokeLinecap="round" />
    </svg>
  ),
  draws: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M7 9h10l-1.5 11h-7z" />
      <path d="M9 9 7.5 3M12 9V2.5M15 9l1.5-6" strokeLinecap="round" />
    </svg>
  ),
  office: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2" strokeLinecap="round" />
      <path d="M10 21v-5h4v5" />
    </svg>
  ),
};

const TAB_LABELS: Record<Tab, [string, string]> = {
  map: ['Map', '地圖'],
  crew: ['Crew', '人馬'],
  draws: ['Draws', '抽籤'],
  office: ['Office', '辦公室'],
};

export function TabBar({ tab, onTab, dots, center }: { tab: Tab; onTab: (t: Tab) => void; dots: Partial<Record<Tab, boolean>>; center: ReactNode }) {
  const button = (t: Tab) => (
    <button key={t} className="tab" aria-current={tab === t ? 'page' : undefined} onClick={() => onTab(t)}>
      {dots[t] && <span className="dot" />}
      {TAB_ICONS[t]}
      <span>{TAB_LABELS[t][0]}</span>
      <span className="tab-zh">{TAB_LABELS[t][1]}</span>
    </button>
  );
  return (
    <nav className="tabbar">
      {button('map')}
      {button('crew')}
      <div className="tab-center">{center}</div>
      {button('draws')}
      {button('office')}
    </nav>
  );
}

export function SafeButton() {
  const s = useGame();
  const [bursts, setBursts] = useState<{ id: number; text: string }[]>([]);
  const cap = safeCapacity(s);
  const fill = cap > 0 ? Math.min(1, s.safe / cap) : 0;
  const auto = s.run.accountant;
  const full = !auto && cap > 0 && fill >= 0.999;
  const r = 40;
  const circ = 2 * Math.PI * r;

  const onTap = () => {
    const amount = s.safe;
    const err = act(collectSafe);
    if (!err) {
      const id = Date.now();
      setBursts((b) => [...b, { id, text: '+' + formatMoney(amount, s.settings.numberFormat) }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);
      navigator.vibrate?.(12);
    }
  };

  return (
    <>
      <button className="safe-btn" data-full={full} data-auto={auto} onClick={onTap} aria-label={`Safe ${Math.round(fill * 100)}% full. Tap to collect.`}>
        <svg className="ring" viewBox="0 0 88 88" aria-hidden>
          <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(30,27,46,0.15)" strokeWidth="6" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={full ? 'var(--red)' : 'var(--orange)'}
            strokeWidth="6"
            strokeDasharray={`${circ * fill} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="safe-label">
          <b>{auto ? 'AUTO' : 'SAFE'}</b>
          <span>{auto ? 'collecting' : s.safe > 0 ? formatMoney(s.safe, s.settings.numberFormat) : `${Math.round(fill * 100)}%`}</span>
        </span>
      </button>
      {bursts.map((b) => (
        <span key={b.id} className="coin-burst" style={{ left: -40, right: -40, bottom: 76, textAlign: 'center' }}>
          {b.text}
        </span>
      ))}
    </>
  );
}

export interface Toast {
  id: number;
  text: string;
  tone?: 'good' | 'warn';
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast" data-tone={t.tone}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function AwayModal({ summary, onClose }: { summary: AwaySummary; onClose: () => void }) {
  const s = useGame();
  const fmt = s.settings.numberFormat;
  const collect = () => {
    act(collectSafe);
    onClose();
  };
  const top = new Map<string, number>();
  for (const e of summary.levelUps) if (e.kind === 'level-up') top.set(e.charId, Math.max(top.get(e.charId) ?? 0, e.level));
  const ups = [...top].map(([id, level]) => `${CHARACTERS[id]?.name ?? id} Lv${level}`);
  return (
    <>
      <div className="scrim" />
      <div className="phone-modal" role="dialog" aria-modal="true" aria-label="While you were away">
        <div className="speaker" />
        <div className="phone-screen">
          <div className="from">
            <span>✉ OFFICE</span>
            <span>{formatDuration(summary.seconds)} ago</span>
          </div>
          <p>Boss, while you were out the safe took in {formatMoney(summary.earned, fmt)}.</p>
          {summary.safeFull && <p>The safe filled up. It holds {summary.safeHours}h of income, so check in sooner to keep it earning.</p>}
          {summary.repelled > 0 && (
            <p>
              Security ran off {summary.repelled} shakedown{summary.repelled > 1 ? 's' : ''}: +{formatMoney(summary.bonus, fmt)}
              {summary.scratch > 0 ? `, and found ${summary.scratch} scratch card${summary.scratch > 1 ? 's' : ''}` : ''}.
            </p>
          )}
          {ups.length > 0 && <p>Level up: {ups.join(', ')}.</p>}
        </div>
        <button className="btn" onClick={collect}>
          Collect {formatMoney(s.safe, fmt)}
        </button>
      </div>
    </>
  );
}
