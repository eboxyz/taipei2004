/**
 * The Turf War stage: an isometric street diorama. Rivals stand up-right, your crew down-left.
 * Each fighter is its PixelLab sprite when one exists (art/SPRITES.md), otherwise its card
 * standing on a base. Presentation only: positions come from the units, motion from event times.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Unit } from '../../game/battle';
import { FACTIONS } from '../../game/content/areas';
import type { AreaId } from '../../game/types';
import { artUrl } from '../art';
import { Portrait } from '../components/bits';
import './iso.css';

/** Logical stage size. Everything is laid out in these units and scaled to the stage's width. */
const W = 390;
const H = 440;
/** 2:1 iso tiles on an 8×8 grid, top corner of tile (0, 0) at (CX, TOP). */
const TW = 56;
const TH = 28;
const GRID = 8;
const CX = 195;
const TOP = 140;

/** Which grid row (j) each battle row stands on. Rivals at the far (up-right) end. */
const ROW_J: Record<'you' | 'them', Record<'front' | 'back' | 'cmd', number>> = {
  them: { cmd: 0, back: 1.2, front: 2.4 },
  you: { front: 4.6, back: 5.8, cmd: 7 },
};

const LUNGE_MS = 280;
const HIT_MS = 260;
const KO_MS = 320;
const DROP_MS = 320;

export interface StageAnim {
  lunge: number;
  hit: number;
  ko?: number;
  /** Who the last attack was aimed at, so the attacker dashes toward them. */
  target?: number;
  /** Who the last hit came from, so the knock-back points away from them. */
  from?: number | null;
  /** When a called-in runner arrived, so it drops in. */
  spawn?: number;
}

export interface StageFloat {
  id: number;
  uid: number;
  text: string;
  kind: 'dmg' | 'crit' | 'heal' | 'shield' | 'status';
  born: number;
}

interface Pt {
  x: number;
  y: number;
}

/** Logical px → a length that scales with the stage (the stage is a size container). */
const cq = (px: number) => `${((px * 100) / W).toFixed(3)}cqw`;

const still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const tile = (i: number, j: number): Pt => ({ x: CX + (i - j) * (TW / 2), y: TOP + TH / 2 + (i + j) * (TH / 2) });

/** Grid positions (i) across a row for n fighters, centred, wider when runners crowd in. */
function rowSlots(n: number): number[] {
  if (n <= 0) return [];
  const gap = n <= 3 ? 1.7 : Math.min(1.7, 6 / (n - 1));
  const start = 3.5 - (gap * (n - 1)) / 2;
  return Array.from({ length: n }, (_, k) => start + k * gap);
}

interface FloorPalette {
  a: string;
  b: string;
  lane: string;
  edgeL: string;
  edgeR: string;
}

/** Each district's paving: two tones, a centre lane, and the slab's two visible edges. */
const FLOOR: Record<AreaId, FloorPalette> = {
  wanhua: { a: '#cfc5b2', b: '#bcb19c', lane: '#a8463a', edgeL: '#8f8676', edgeR: '#a49a88' },
  ximending: { a: '#7a7684', b: '#6a6675', lane: '#e8e4ee', edgeL: '#4a4756', edgeR: '#5a5766' },
  zhongshan: { a: '#b9a48a', b: '#a8937a', lane: '#3d3566', edgeL: '#7a6650', edgeR: '#8c7860' },
  east: { a: '#e6e1ea', b: '#d6d0dc', lane: '#f2a7c3', edgeL: '#a59fb0', edgeR: '#bab4c4' },
  xinyi: { a: '#c4cad3', b: '#b1b8c3', lane: '#4f6d8f', edgeL: '#7d8594', edgeR: '#9098a6' },
  xindian: { a: '#bfd3c4', b: '#abc2b1', lane: '#e6b422', edgeL: '#7f9787', edgeR: '#93ab9b' },
};

/** The floor as stepped 2px strips, so its edges stair-step like pixel art. Same shape for every district. */
const FLOOR_PATHS = (() => {
  let a = '';
  let b = '';
  let lane = '';
  let edgeL = '';
  let edgeR = '';
  const half = TW / 2;
  const strips = TH / 2;
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const { x: tx, y: ty } = tile(i, j);
      let d = '';
      for (let s = 0; s < strips; s++) {
        const hw = s < strips / 2 ? (s + 1) * 4 : (strips - s) * 4;
        const y0 = ty - TH / 2 + s * 2;
        d += `M${tx - hw} ${y0}H${tx + hw}V${y0 + 2}H${tx - hw}Z`;
      }
      if (i === 3 || i === 4) lane += d;
      else if ((i + j) % 2 === 0) a += d;
      else b += d;
      if (j === GRID - 1) {
        for (let x = tx - half; x < tx; x += 4) {
          const y = Math.round((ty + (x + 2 - (tx - half)) / 2) / 2) * 2;
          edgeL += `M${x} ${y}H${x + 4}V${y + 12}H${x}Z`;
        }
      }
      if (i === GRID - 1) {
        for (let x = tx; x < tx + half; x += 4) {
          const y = Math.round((ty + TH / 2 - (x + 2 - tx) / 2) / 2) * 2;
          edgeR += `M${x} ${y}H${x + 4}V${y + 12}H${x}Z`;
        }
      }
    }
  }
  return { a, b, lane, edgeL, edgeR };
})();

export function IsoStage({
  units,
  anim,
  floats,
  now,
  manual,
  area,
  night,
  onTap,
  hint,
}: {
  units: Unit[];
  anim: Map<number, StageAnim>;
  floats: StageFloat[];
  now: number;
  manual: boolean;
  area: AreaId;
  night: boolean;
  onTap: (u: Unit) => void;
  hint?: ReactNode;
}) {
  const pos = new Map<number, Pt>();
  for (const side of ['them', 'you'] as const) {
    for (const row of ['cmd', 'back', 'front'] as const) {
      const list = units.filter((u) => u.side === side && u.row === row).sort((p, q) => p.spec.slot - q.spec.slot);
      const slots = rowSlots(list.length);
      list.forEach((u, k) => pos.set(u.uid, tile(slots[k]!, ROW_J[side][row])));
    }
  }
  const pal = FLOOR[area];
  const backdrop = artUrl('areas_px', `${area}_${night ? 'night' : 'day'}`);
  // The pixel street fills the screen above the plaza, and the paving runs on below it.
  const sceneStyle = { ['--ground' as string]: night ? '#2a2148' : pal.edgeL } as CSSProperties;
  return (
    <div className="iso-wrap" data-night={night} style={sceneStyle}>
      <div className="iso-sky" aria-hidden>
        {backdrop && <img className="iso-skyimg" src={backdrop} alt="" draggable={false} />}
      </div>
      <div className="iso-stage" data-night={night}>
        <svg className="iso-floor" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" aria-hidden>
          <path d={FLOOR_PATHS.edgeL} fill={pal.edgeL} />
          <path d={FLOOR_PATHS.edgeR} fill={pal.edgeR} />
          <path d={FLOOR_PATHS.a} fill={pal.a} />
          <path d={FLOOR_PATHS.b} fill={pal.b} />
          <path d={FLOOR_PATHS.lane} fill={pal.lane} />
        </svg>
        {units.map((u) => {
          const a = anim.get(u.uid);
          return (
            <IsoUnit
              key={u.uid}
              u={u}
              p={pos.get(u.uid)!}
              target={a?.target !== undefined ? pos.get(a.target) : undefined}
              from={a?.from != null ? pos.get(a.from) : undefined}
              a={a}
              floats={floats.filter((f) => f.uid === u.uid)}
              now={now}
              manual={manual}
              onTap={() => onTap(u)}
            />
          );
        })}
        {hint && <div className="iso-hint">{hint}</div>}
      </div>
    </div>
  );
}

function IsoUnit({
  u,
  p,
  target,
  from,
  a,
  floats,
  now,
  manual,
  onTap,
}: {
  u: Unit;
  p: Pt;
  target?: Pt;
  from?: Pt;
  a?: StageAnim;
  floats: StageFloat[];
  now: number;
  manual: boolean;
  onTap: () => void;
}) {
  const hp = Math.max(0, u.hp / u.maxHp);
  const sh = Math.min(1, u.shield / u.maxHp);
  const ready = manual && u.side === 'you' && u.alive && u.charge >= 1;
  const status = [u.stun > 0 && 'STUN', u.taunt > 0 && 'TAUNT', u.strip > 0 && 'EXPOSED', u.weak > 0 && 'WEAK', u.buff > 0 && 'POWER', u.haste > 0 && 'FAST'].find(Boolean);
  const sprite = artUrl('sprites', u.spec.charId);
  const them = u.side === 'them';

  // Motion, in logical px.
  let dx = 0;
  let dy = 0;
  const lunging = !!a && now - a.lunge < LUNGE_MS;
  if (lunging && !still) {
    const k = Math.sin((Math.PI * (now - a!.lunge)) / LUNGE_MS);
    if (target) {
      dx += (target.x - p.x) * 0.42 * k;
      dy += (target.y - p.y) * 0.42 * k;
    } else dy -= 8 * k; // a skill with no target: a hop
  }
  const hit = !!a && now - a.hit < HIT_MS;
  if (hit && !still) {
    const k = Math.sin((Math.PI * (now - a!.hit)) / HIT_MS) * 6;
    const vx = from ? p.x - from.x : them ? 1 : -1;
    const vy = from ? p.y - from.y : them ? -0.5 : 0.5;
    const len = Math.hypot(vx, vy) || 1;
    dx += (vx / len) * k;
    dy += (vy / len) * k;
  }
  if (a?.spawn !== undefined && now - a.spawn < DROP_MS && !still) dy -= (1 - (now - a.spawn) / DROP_MS) * 48;
  const bob = sprite && u.alive && !still ? (Math.floor(now / 500) + u.uid) % 2 : 0;
  const tip = u.alive ? 0 : a?.ko !== undefined ? Math.min(1, (now - a.ko) / KO_MS) : 1;

  const label = `${u.spec.name}, ${Math.ceil(u.hp)} of ${u.maxHp} health${ready ? ', skill ready' : ''}`;
  const figStyle: CSSProperties = { transform: `translate(${cq(dx)}, ${cq(dy - bob)})` };
  const tipStyle: CSSProperties = tip > 0 ? { transform: `perspective(${cq(220)}) rotateX(${tip * 80}deg)`, opacity: tip >= 1 ? 0.55 : 1 } : {};
  const tint = them && u.spec.grunt ? gangTint(u.spec.faction) : undefined;

  return (
    <button
      className="iso-unit"
      data-side={u.side}
      data-alive={u.alive}
      data-ready={ready}
      data-hit={hit}
      data-stun={u.stun > 0}
      onClick={onTap}
      tabIndex={ready ? 0 : -1}
      aria-label={label}
      style={{ left: cq(p.x), top: cq(p.y), zIndex: Math.round(p.y) + (lunging ? 400 : 0) }}
    >
      <span className="iso-shadow" />
      <span className="iso-base" />
      {sh > 0 && u.alive && <span className="iso-ring" />}
      <span className="iso-fig" style={figStyle}>
        {u.alive && (
          <span className="iso-bars">
            {u.commander && <span className="iso-crown">{u.spec.slot === 6 ? 'BOSS' : 'LT'}</span>}
            <span className="iso-hp">
              <i style={{ width: `${hp * 100}%` }} data-low={hp < 0.3} />
              {sh > 0 && <b style={{ width: `${sh * 100}%` }} />}
            </span>
            {!them && (
              <span className="iso-charge" data-full={u.charge >= 1}>
                <i style={{ width: `${u.charge * 100}%` }} />
              </span>
            )}
          </span>
        )}
        <span className="iso-tip" style={tipStyle}>
          {sprite ? (
            <span className="iso-sprite" data-flip={them}>
              <img src={sprite} alt="" draggable={false} />
              {tint && <span className="iso-tint" style={{ ['--tint' as string]: tint, ['--mask' as string]: `url(${sprite})` }} />}
            </span>
          ) : (
            <span className="iso-card">
              <Portrait id={u.spec.charId} face style={u.spec.grunt ? gruntColors(u.spec.faction) : undefined} />
            </span>
          )}
        </span>
        {status && u.alive && <span className="iso-status">{status}</span>}
        {hit && (
          <span className="iso-sparks" key={a!.hit} aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </span>
      {floats.map((f) => (
        <span key={f.id} className="iso-float" data-kind={f.kind}>
          {f.text}
        </span>
      ))}
    </button>
  );
}

/** A gang's colour for washing grunt sprites: its main colour, or its accent when the main one is near black. */
function gangTint(faction: string): string | undefined {
  const colors = FACTIONS[faction as keyof typeof FACTIONS]?.colors;
  if (!colors) return undefined;
  const [main, accent] = colors;
  const n = parseInt(main.slice(1), 16);
  const light = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return light < 50 ? accent : main;
}

function gruntColors(faction: string): CSSProperties {
  const [c1, c2] = FACTIONS[faction as keyof typeof FACTIONS]?.colors ?? ['#33276a', '#120c2e'];
  return { ['--c1' as string]: c1, ['--c2' as string]: c2 };
}
