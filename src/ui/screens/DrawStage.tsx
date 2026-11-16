import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BINDER_PAGES } from '../../game/content/binder';
import { FACTIONS } from '../../game/content/areas';
import { CHARACTERS, ROLES } from '../../game/content/characters';
import { ZODIAC_BY_ID } from '../../game/content/zodiac';
import {
  BLOCK_EN,
  BLOCK_ZH,
  BLOCKS_NEEDED,
  canDraw,
  COST,
  draw,
  featuredOn,
  LOTTERY_BALLS,
  LOTTERY_PITY,
  oddsFor,
  poolFor,
  STICK_GRADE_EN,
  TEMPLE_PITY,
  throwForUpgrade,
  type Block,
  type CardGain,
  type DrawResult,
} from '../../game/gacha';
import type { DrawKind, FactionId, Rarity } from '../../game/types';
import { Portrait, Stars } from '../components/bits';
import { update } from '../engine';
import { store, useGame } from '../store';
import { gameNow } from '../time';
import { track } from '../analytics';
import { createShakeDetector, requestMotionAccess, type MotionAccess } from '../motion';

export const MACHINE_INFO: Record<DrawKind, { name: string; short: string; zh: string; glyph: string; currency: string }> = {
  scratch: { name: 'Scratch Card', short: 'Scratch', zh: '刮刮樂', glyph: '刮', currency: 'scratch card' },
  temple: { name: 'Temple Fortune Sticks', short: 'Temple', zh: '求籤', glyph: '籤', currency: 'incense money' },
  lottery: { name: 'Lottery', short: 'Lottery', zh: '樂透', glyph: '樂', currency: 'lottery ticket' },
};

export function costLabel(kind: DrawKind): string {
  const { amount } = COST[kind];
  const info = MACHINE_INFO[kind];
  return `${amount} ${info.currency}${amount > 1 && kind !== 'temple' ? 's' : ''}`;
}

const RARITY_ORDER: Rarity[] = ['SSR', 'SR', 'R', 'N'];

/** Runs a draw against the live state. */
function doDraw(kind: DrawKind): DrawResult | null {
  const r = draw(store.get(), kind, Math.random, gameNow());
  if (!r.ok) return null;
  update(() => r.state);
  track('draw_purchased', { machine: kind, free: r.result.free, cards: r.result.gains.length });
  navigator.vibrate?.(15);
  return r.result;
}

/* ---------- Pieces ---------- */

export function OddsTable({ kind }: { kind: DrawKind }) {
  const now = gameNow();
  const odds = oddsFor(useGame(), kind);
  return (
    <details className="odds">
      <summary>Odds and who's inside</summary>
      <table>
        <tbody>
          {RARITY_ORDER.filter((r) => odds[r] > 0).map((r) => (
            <tr key={r}>
              <th data-rarity={r}>{r}</th>
              <td className="pct">{(odds[r] * 100).toFixed(1).replace(/\.0$/, '')}%</td>
              <td>{poolFor(kind, r, now).map((id) => CHARACTERS[id]!.name).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {kind === 'temple' &&
          `Every ${TEMPLE_PITY}th draw is SR or better. Moon blocks: three "yes" throws (聖筊) in a row (12.5%) upgrade the card one rarity; anything else keeps it.`}
        {kind === 'lottery' &&
          `Each ticket draws ${LOTTERY_BALLS} cards, at least one SR or better. An SSR is guaranteed by the ${LOTTERY_PITY}th ticket. The featured card is half of its rarity's chance.`}
        {kind === 'scratch' && 'One card per scratch card.'} Your zodiac makes its two roles a little more likely within each rarity; rarity odds never change.
      </p>
    </details>
  );
}

function gainLine(g: CardGain): string {
  if (g.isNew) return 'NEW!';
  if (g.starsAfter > g.starsBefore) return `★${g.starsBefore} → ★${g.starsAfter}`;
  return `★5 already · +${g.incense} incense`;
}

export function RevealCard({ gain, delay = 0, small = false }: { gain: CardGain; delay?: number; small?: boolean }) {
  const def = CHARACTERS[gain.charId]!;
  return (
    <div className="reveal" data-rarity={gain.rarity} data-small={small} style={{ animationDelay: `${delay}ms` }}>
      {(gain.rarity === 'SSR' || gain.rarity === 'SR') && <div className="reveal-rays" aria-hidden />}
      <div className="card" data-rarity={gain.rarity} data-stars={gain.starsAfter}>
        <Portrait id={gain.charId} />
        <div className="card-body">
          <div className="card-name">
            {def.name}
            <span className="zh">{def.nameZh}</span>
          </div>
          <div className="card-role">
            <span>{def.role ? `${ROLES[def.role].name} ${ROLES[def.role].nameZh}` : ''}</span>
            <span className="rarity-badge">{gain.rarity}</span>
          </div>
          <Stars n={gain.starsAfter} />
        </div>
      </div>
      <div className="reveal-tag" data-new={gain.isNew}>
        {gainLine(gain)}
      </div>
      {!small && (
        <p className="reveal-skill">
          <b>{def.skill.name}:</b> {def.skill.text}
        </p>
      )}
    </div>
  );
}

function PagesDone({ pages }: { pages: FactionId[] }) {
  if (pages.length === 0) return null;
  return (
    <>
      {pages.map((f) => (
        <div key={f} className="page-done">
          <b>Binder page complete: {FACTIONS[f].name}</b> {FACTIONS[f].crest}
          <span>
            {BINDER_PAGES.find((p) => p.faction === f)?.text}, forever. +1 lottery ticket.
          </span>
        </div>
      ))}
    </>
  );
}

function DrawButton({ kind, label, onDraw }: { kind: DrawKind; label: string; onDraw: () => void }) {
  const s = useGame();
  const check = canDraw(s, kind, gameNow());
  const { currency, amount } = COST[kind];
  return (
    <button className="btn draw-btn" disabled={!check.ok} onClick={onDraw}>
      {label}
      <small>
        {check.free ? 'Free visit today' : check.ok ? `${costLabel(kind)} · you have ${s.currencies[currency]}` : `Needs ${amount} ${MACHINE_INFO[kind].currency}`}
      </small>
    </button>
  );
}

/* ---------- Scratch card 刮刮樂 ---------- */

function ScratchLayer({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const [gone, setGone] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const c = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, '#d9d9e0');
    g.addColorStop(0.5, '#f4f4f8');
    g.addColorStop(1, '#a9a9b8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(30,27,46,0.18)';
    ctx.font = `900 ${28 * dpr}px "Noto Serif TC", serif`;
    for (let y = 30 * dpr; y < c.height; y += 52 * dpr)
      for (let x = ((y / (52 * dpr)) % 2) * 26 * dpr; x < c.width; x += 64 * dpr) ctx.fillText('刮', x, y);
    ctx.fillStyle = 'rgba(30,27,46,0.55)';
    ctx.font = `800 ${14 * dpr}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH WITH YOUR FINGER', c.width / 2, c.height / 2);
  }, []);

  const cleared = () => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    let total = 0;
    const step = Math.max(4, Math.floor(c.width / 40));
    for (let y = 0; y < c.height; y += step)
      for (let x = 0; x < c.width; x += step) {
        total++;
        if (data[(y * c.width + x) * 4 + 3]! < 40) clear++;
      }
    return clear / total;
  };

  const reveal = () => {
    if (gone) return;
    setGone(true);
    setTimeout(() => doneRef.current(), 350);
  };

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gone || (e.pointerType === 'mouse' && e.buttons !== 1)) return;
    const c = ref.current!;
    const rect = c.getBoundingClientRect();
    const dpr = c.width / rect.width;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    const ctx = c.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 44 * dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const from = last.current ?? { x, y };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    last.current = { x, y };
    if (++moves.current % 8 === 0 && cleared() > 0.5) reveal();
  };

  return (
    <>
      <canvas
        ref={ref}
        className="scratch-layer"
        data-gone={gone}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = null;
          scratch(e);
        }}
        onPointerMove={scratch}
        onPointerUp={() => (last.current = null)}
        aria-label="Silver scratch layer"
      />
      {!gone && (
        <button className="link-btn scratch-skip" onClick={reveal}>
          Reveal all
        </button>
      )}
    </>
  );
}

function ScratchMachine() {
  const [result, setResult] = useState<DrawResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const start = () => {
    const r = doDraw('scratch');
    if (r) {
      setResult(r);
      setRevealed(false);
    }
  };
  if (!result) {
    return (
      <div className="machine-stage">
        <div className="ticket idle">
          <div className="ticket-head">
            刮刮樂 <span>SCRATCH &amp; WIN · 台北</span>
          </div>
          <div className="ticket-window">
            <span className="ticket-glyph">刮</span>
          </div>
          <div className="ticket-foot">No. {String(store.get().draws.count.scratch + 1).padStart(6, '0')}</div>
        </div>
        <DrawButton kind="scratch" label="Scratch a card" onDraw={start} />
        <OddsTable kind="scratch" />
      </div>
    );
  }
  const gain = result.gains[0]!;
  return (
    <div className="machine-stage">
      <div className="ticket" hidden={revealed}>
        <div className="ticket-head">
          刮刮樂 <span>SCRATCH &amp; WIN · 台北</span>
        </div>
        <div className="ticket-window" data-rarity={gain.rarity}>
          <div className="ticket-prize" aria-hidden={!revealed}>
            <Portrait id={gain.charId} />
            <b data-rarity={gain.rarity}>{gain.rarity}</b>
          </div>
          <ScratchLayer key={result.gains[0]!.charId + store.get().draws.count.scratch} onDone={() => setRevealed(true)} />
        </div>
        <div className="ticket-foot">No. {String(store.get().draws.count.scratch).padStart(6, '0')}</div>
      </div>
      {revealed && (
        <>
          <RevealCard gain={gain} />
          <PagesDone pages={result.binderPages} />
          <DrawButton kind="scratch" label="Scratch another" onDraw={start} />
        </>
      )}
    </div>
  );
}

/* ---------- Temple 求籤 + moon blocks 擲筊 ---------- */

const SHAKES_NEEDED = 4;

function MoonBlock({ face, flip }: { face: 'flat' | 'round'; flip?: boolean }) {
  return (
    <svg viewBox="0 0 60 34" className="moon-block" data-face={face} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <path d="M2 32 Q30 -18 58 32 Z" fill={face === 'flat' ? '#f2a49b' : '#c8261d'} stroke="#1e1b2e" strokeWidth="3" strokeLinejoin="round" />
      {face === 'round' && <path d="M14 22 Q30 0 46 22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />}
    </svg>
  );
}

function BlockPair({ block }: { block: Block }) {
  const faces: ['flat' | 'round', 'flat' | 'round'] = block === 'sheng' ? ['flat', 'round'] : block === 'xiao' ? ['flat', 'flat'] : ['round', 'round'];
  return (
    <div className="block-pair" data-block={block}>
      <div className="blocks">
        <MoonBlock face={faces[0]} />
        <MoonBlock face={faces[1]} flip />
      </div>
      <b>{BLOCK_ZH[block]}</b>
      <small>{BLOCK_EN[block]}</small>
    </div>
  );
}

function TempleMachine() {
  const [result, setResult] = useState<DrawResult | null>(null);
  const [meter, setMeter] = useState(0);
  const [stage, setStage] = useState<'idle' | 'shaking' | 'fallen' | 'card'>('idle');
  const [blocks, setBlocks] = useState<{ throws: Block[]; shown: number; upgraded: CardGain | null; pages: FactionId[] } | null>(null);
  const [wiggle, setWiggle] = useState(0);
  const lastDir = useRef(0);
  const lastY = useRef<number | null>(null);

  const meterRef = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);
  const bump = (method: 'shake' | 'swipe' | 'tap' = 'tap') => {
    if (stage !== 'shaking' || meterRef.current >= SHAKES_NEEDED) return;
    setWiggle((w) => w + 1);
    navigator.vibrate?.(8);
    const next = ++meterRef.current;
    setMeter(next);
    if (next >= SHAKES_NEEDED) {
      track('temple_revealed', { method });
      setStage('fallen');
      revealTimer.current = setTimeout(() => setStage('card'), 1400);
    }
  };
  const bumpRef = useRef(bump);
  bumpRef.current = bump;

  const [motionStatus, setMotionStatus] = useState<MotionAccess | 'live' | 'silent'>('waiting');
  const [motionAttempt, setMotionAttempt] = useState(0);
  const motionLive = motionStatus === 'live';
  useEffect(() => {
    if (stage !== 'shaking') return;
    const detect = createShakeDetector();
    let connected = false;
    const onMotion = (event: DeviceMotionEvent) => {
      const sample = detect(event, performance.now());
      if (!sample.live) return;
      if (!connected) { connected = true; track('motion_connected'); }
      setMotionStatus('live');
      if (sample.shake) bumpRef.current('shake');
    };
    const timeout = window.setTimeout(() => {
      setMotionStatus((status) => status === 'waiting' ? 'silent' : status);
    }, 3000);
    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('devicemotion', onMotion);
    };
  }, [stage, motionAttempt]);

  const enableMotion = async () => {
    // Invoke permission synchronously from the button tap, before any await.
    const access = await requestMotionAccess({
      isSecureContext: window.isSecureContext,
      DeviceMotionEvent: (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent,
    });
    setMotionStatus(access);
    track('motion_access', { status: access });
    setMotionAttempt((n) => n + 1);
  };

  const start = async () => {
    await enableMotion();
    const r = doDraw('temple');
    if (!r) return;
    setResult(r);
    setBlocks(null);
    setMeter(0);
    meterRef.current = 0;
    lastY.current = null;
    lastDir.current = 0;
    setStage('shaking');
  };

  const onMove = (e: React.PointerEvent) => {
    if (stage !== 'shaking' || e.buttons === 0) return;
    const y = e.clientY;
    if (lastY.current !== null) {
      const dir = Math.sign(y - lastY.current);
      if (dir !== 0 && dir !== lastDir.current && Math.abs(y - lastY.current) > 2) {
        if (lastDir.current !== 0) bump('swipe');
        lastDir.current = dir;
      }
    }
    lastY.current = y;
  };

  const throwBlocksNow = () => {
    if (!result) return;
    const gain = result.gains[0]!;
    const r = throwForUpgrade(store.get(), gain, Math.random, gameNow());
    update(() => r.state);
    setBlocks({ throws: r.throws, shown: 0, upgraded: r.upgraded, pages: r.binderPages });
  };

  useEffect(() => {
    if (!blocks || blocks.shown >= blocks.throws.length) return;
    const t = setTimeout(() => {
      setBlocks((b) => (b ? { ...b, shown: b.shown + 1 } : b));
      navigator.vibrate?.(10);
    }, 900);
    return () => clearTimeout(t);
  }, [blocks]);

  const gain = result?.gains[0];
  const blocksDone = blocks && blocks.shown >= blocks.throws.length;
  const canUpgrade = gain && gain.rarity !== 'SSR';

  return (
    <div className="machine-stage">
      {(stage === 'idle' || stage === 'shaking' || stage === 'fallen') && (
        <div
          className="temple"
          data-stage={stage}
          role={stage === 'shaking' ? 'button' : undefined}
          tabIndex={stage === 'shaking' ? 0 : -1}
          aria-label={stage === 'shaking' ? `Shake the stick cup: swipe up and down or tap${motionLive ? ', or shake your phone' : ''}` : undefined}
          onPointerMove={onMove}
          onPointerUp={() => (lastY.current = null)}
          onClick={() => bump()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && bump()}
        >
          <div className="incense" aria-hidden>
            <i />
            <i />
            <i />
          </div>
          <div className="cup" key={wiggle} data-wiggle={wiggle > 0} aria-hidden>
            <div className="sticks">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} style={{ left: `${10 + i * 9}%`, height: `${60 + ((i * 37) % 30)}px` }} />
              ))}
            </div>
            <div className="cup-body">籤</div>
          </div>
          {stage === 'fallen' && result?.stick && (
            <div className="fallen-stick" aria-hidden>
              <span>第{result.stick.number}籤</span>
            </div>
          )}
          {stage === 'shaking' && (
            <div className="shake-meter" aria-hidden>
              {Array.from({ length: SHAKES_NEEDED }, (_, i) => (
                <i key={i} data-on={i < meter} />
              ))}
            </div>
          )}
        </div>
      )}
      {stage === 'idle' && (
        <>
          <DrawButton kind="temple" label="Shake the stick cup" onDraw={start} />
          <OddsTable kind="temple" />
        </>
      )}
      {stage === 'shaking' && (
        <div className="temple-motion-status" role="status">
          <p className="stage-hint">
            {motionStatus === 'live' ? 'Motion is connected. Gently shake your phone, swipe up and down on the cup, or tap it.'
              : motionStatus === 'insecure' ? 'Phone shaking needs a secure HTTPS page. You can still swipe up and down on the cup, or tap it.'
              : motionStatus === 'denied' ? 'Motion access is off. Allow motion to shake your phone, or swipe up and down on the cup, or tap it.'
              : motionStatus === 'unavailable' ? 'This browser does not offer phone motion here. Swipe up and down on the cup, or tap it.'
              : motionStatus === 'silent' ? 'No motion data is arriving. Try enabling phone shaking again, or swipe up and down on the cup, or tap it.'
              : 'Waiting for phone motion. Gently shake your phone, or swipe up and down on the cup, or tap it.'}
          </p>
          {(motionStatus === 'denied' || motionStatus === 'silent') && (
            <button className="btn secondary" onClick={enableMotion}>Enable phone shaking</button>
          )}
        </div>
      )}
      {stage === 'fallen' && result?.stick && (
        <div className="slip">
          <span>第 {result.stick.number} 籤</span>
          <b>{result.stick.grade}</b>
          <small>{STICK_GRADE_EN[result.stick.grade]} fortune</small>
        </div>
      )}
      {stage === 'card' && gain && result && (
        <>
          <div className="slip small">
            <span>第 {result.stick!.number} 籤</span>
            <b>{result.stick!.grade}</b>
            {result.free && <small>Free daily visit</small>}
            {result.pity && <small>Guaranteed SR+</small>}
          </div>
          {blocks?.upgraded && blocksDone ? (
            <>
              <div className="upgrade-banner">Three yeses 三聖筊! The gods agree: your card goes up a rarity.</div>
              <RevealCard gain={blocks.upgraded} />
            </>
          ) : (
            <RevealCard gain={gain} />
          )}
          <PagesDone pages={[...result.binderPages, ...(blocksDone ? blocks!.pages : [])]} />
          {canUpgrade && !blocks && (
            <div className="blocks-offer">
              <p>
                Throw the moon blocks 擲筊? Three "yes" throws (聖筊) in a row upgrade this card one rarity. Anything else keeps it, so it can't make
                things worse.
              </p>
              <button className="btn" onClick={throwBlocksNow}>
                Throw the blocks 擲筊
              </button>
            </div>
          )}
          {blocks && (
            <div className="throws">
              {Array.from({ length: BLOCKS_NEEDED }, (_, i) =>
                i < blocks.shown ? (
                  <BlockPair key={i} block={blocks.throws[i]!} />
                ) : i === blocks.shown && i < blocks.throws.length ? (
                  <div key={i} className="block-pair tossing">
                    <div className="blocks">
                      <MoonBlock face="round" />
                      <MoonBlock face="flat" flip />
                    </div>
                  </div>
                ) : (
                  <div key={i} className="block-pair empty" />
                ),
              )}
            </div>
          )}
          {blocksDone && !blocks!.upgraded && <p className="stage-hint">The gods have spoken. You keep the card.</p>}
          {(!canUpgrade || blocksDone) && <DrawButton kind="temple" label="Draw again" onDraw={start} />}
        </>
      )}
    </div>
  );
}

/* ---------- Lottery 樂透 ---------- */

const BALL_COLORS: Record<Rarity, string> = { N: '#c9ccd6', R: '#5ec8f2', SR: '#ff3ea5', SSR: '#ffd34d' };

function LotteryMachine() {
  const [result, setResult] = useState<DrawResult | null>(null);
  const [dropped, setDropped] = useState(0);
  const now = gameNow();
  const feat = CHARACTERS[featuredOn(now)]!;
  const start = () => {
    const r = doDraw('lottery');
    if (!r) return;
    setResult(r);
    setDropped(0);
  };
  useEffect(() => {
    if (!result || dropped >= result.gains.length) return;
    const t = setTimeout(() => setDropped((d) => d + 1), dropped === 0 ? 1500 : 800);
    return () => clearTimeout(t);
  }, [result, dropped]);
  const rolling = result && dropped < result.gains.length;

  return (
    <div className="machine-stage">
      <div className="featured">
        <Portrait id={feat.id} face />
        <div>
          <small>FEATURED THIS WEEK</small>
          <b>
            {feat.name} <span className="zh">{feat.nameZh}</span>
          </b>
          <span>
            {feat.rarity} · half of all {feat.rarity} lottery draws
          </span>
        </div>
      </div>
      <div className="drum" data-rolling={!!rolling}>
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ background: Object.values(BALL_COLORS)[i % 4], animationDelay: `${(i * 137) % 900}ms`, left: `${12 + ((i * 53) % 72)}%` }}>
            {(i * 7) % 49 + 1}
          </i>
        ))}
      </div>
      {result && (
        <div className="balls-out">
          {result.gains.map((g, i) => (
            <span key={i} className="ball-out" data-on={i < dropped} style={{ background: i < dropped ? BALL_COLORS[g.rarity] : undefined }}>
              {i < dropped ? g.rarity : '?'}
            </span>
          ))}
        </div>
      )}
      {result && !rolling && (
        <div className="reveal-row">
          {result.gains.map((g, i) => (
            <RevealCard key={i} gain={g} small delay={i * 150} />
          ))}
        </div>
      )}
      {result && !rolling && <PagesDone pages={result.binderPages} />}
      {!rolling && <DrawButton kind="lottery" label={result ? 'Another ticket' : 'Spin the drum'} onDraw={start} />}
      {!result && <OddsTable kind="lottery" />}
    </div>
  );
}

/* ---------- Shell ---------- */

export function DrawStage({ kind, onClose }: { kind: DrawKind; onClose: () => void }) {
  const s = useGame();
  const info = MACHINE_INFO[kind];
  const host = document.querySelector('.phone') ?? document.body;
  const body: Record<DrawKind, ReactNode> = {
    scratch: <ScratchMachine />,
    temple: <TempleMachine />,
    lottery: <LotteryMachine />,
  };
  return createPortal(
    <div className="turf draw-stage" data-kind={kind} role="dialog" aria-modal="true" aria-label={info.name}>
      <header className="turf-head">
        <button className="back-btn" onClick={onClose}>
          ← Draws
        </button>
        <div className="turf-title">
          {info.short.toUpperCase()} <span className="zh">{info.zh}</span>
        </div>
      </header>
      <div className="turf-scroll">
        <div className="wallet-strip">
          <span>刮 {s.currencies.scratch}</span>
          <span>香 {s.currencies.incense}</span>
          <span>樂 {s.currencies.lottery}</span>
          {s.zodiac && (
            <span className="wallet-zodiac">
              {ZODIAC_BY_ID[s.zodiac].zh} {ZODIAC_BY_ID[s.zodiac].name}
            </span>
          )}
        </div>
        {body[kind]}
      </div>
    </div>,
    host,
  );
}
