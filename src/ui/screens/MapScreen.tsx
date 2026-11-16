import { useState } from 'react';
import { ALL_LOTS, AREA_ORDER, AREAS, FACTIONS } from '../../game/content/areas';
import { phaseAt } from '../../game/clock';
import { buyPrice, isAreaOpen, isLotLocked, marketShare } from '../../game/economy';
import { formatPercent } from '../../game/format';
import type { AreaId, GameState } from '../../game/types';
import { store, useGame, useNow } from '../store';
import { CHARACTERS } from '../../game/content/characters';
import { claimEvent, EVENT_INFO, type EventReward } from '../../game/events';
import { formatMoney } from '../../game/format';
import { update } from '../engine';
import { gameNow } from '../time';
import { FIGHTS } from '../../game/content/fights';
import { canChallenge, isFirstWin, rematchCooldown } from '../../game/turf';
import { collectSafe } from '../../game/actions';
import { act } from '../engine';
import { classOf } from '../../game/characters';
import { postOf } from '../../game/economy';
import { track } from '../analytics';
import { artUrl } from '../art';
import { LOTTERY_BALLS, COST, canDraw } from '../../game/gacha';
import { REMATCH_COOLDOWN_MS, SHAKEDOWN_SCRATCH_EVERY } from '../../game/constants';

interface Node {
  id: AreaId;
  x: number;
  y: number;
  label: 'above' | 'below' | 'right';
  /** Horizontal shift of an above/below label, to leave room for the event bubble. */
  labelDx?: number;
  /** Where this station's street-event bubble sits: clear of labels, lines and the map edge. */
  bubble: [number, number];
}

// Longshan Temple really is southwest of Ximen, so the blue line bends down-left to reach Wanhua.
const NODES: Node[] = [
  { id: 'wanhua', x: 48, y: 292, label: 'right', bubble: [46, 244] },
  { id: 'ximending', x: 118, y: 250, label: 'above', labelDx: -18, bubble: [168, 206] },
  { id: 'zhongshan', x: 190, y: 116, label: 'right', bubble: [146, 96] },
  { id: 'east', x: 278, y: 250, label: 'above', labelDx: -24, bubble: [276, 298] },
  { id: 'xinyi', x: 356, y: 250, label: 'below', bubble: [320, 204] },
];

/** Codex map stickers in the empty corners: center and the box they fit inside. Missing art is skipped. */
const DECOR: { id: string; x: number; y: number; w: number; h: number }[] = [
  { id: 'palace_hotel', x: 82, y: 42, w: 64, h: 56 },
  { id: 'airplane', x: 282, y: 40, w: 76, h: 46 },
  { id: 'dragon_boat', x: 20, y: 150, w: 30, h: 56 },
  { id: 'street_cat', x: 80, y: 150, w: 44, h: 46 },
  { id: 'tiaotong_lanterns', x: 236, y: 162, w: 44, h: 48 },
  { id: 'red_house', x: 160, y: 314, w: 38, h: 38 },
  { id: 'night_market', x: 100, y: 352, w: 58, h: 49 },
  { id: 'betel_nut_stand', x: 225, y: 330, w: 40, h: 42 },
  { id: 'scooters', x: 124, y: 408, w: 48, h: 43 },
  { id: 'campus_palms', x: 262, y: 422, w: 40, h: 41 },
  { id: 'elephant_mountain', x: 352, y: 360, w: 60, h: 60 },
  { id: 'garbage_truck', x: 36, y: 438, w: 58, h: 40 },
];

/** A speech-bubble tail on a circle of radius r at (bx, by), pointing at (sx, sy). */
function bubbleTail(bx: number, by: number, r: number, sx: number, sy: number): string {
  const len = Math.hypot(sx - bx, sy - by) || 1;
  const ux = (sx - bx) / len;
  const uy = (sy - by) / len;
  const base = (side: number) => `${bx + ux * (r - 2) - uy * 5 * side} ${by + uy * (r - 2) + ux * 5 * side}`;
  return `M${base(1)} L${bx + ux * (r + 9)} ${by + uy * (r + 9)} L${base(-1)} Z`;
}

/** Relative luminance of a #rrggbb color (WCAG). */
function luminance(hex: string): number {
  const ch = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Station-sign tag colors: the gang's main color, with whichever text color reads best on it. */
function tagColors([bg, accent]: [string, string]): { bg: string; fg: string } {
  const ink = '#1e1b2e';
  if (contrast(bg, ink) > contrast(bg, '#ffffff')) return { bg, fg: ink };
  // On dark tags, use the gang's accent color when it's readable (Molong's green, Yuejian's silver).
  return { bg, fg: contrast(bg, accent) >= 4.5 ? accent : '#ffffff' };
}

/** Taipei 101 progress: floors built, driven by the price index. Only claiming Xinyi tops it out. */
export function towerFloors(s: GameState): number {
  if (s.areas.xinyi.boss) return 101;
  return Math.max(4, Math.min(100, Math.round((s.index - 100) * 0.6) + 4));
}

function Tower({ x, baseY, floors, night }: { x: number; baseY: number; floors: number; night: boolean }) {
  const segH = 13;
  const built = (floors / 101) * 8;
  const full = Math.floor(built);
  const segs = [];
  const fill = night ? '#7FD6E8' : '#5a8a7a';
  for (let i = 0; i < full; i++) {
    const y = baseY - 22 - (i + 1) * segH;
    segs.push(<path key={i} d={`M${x - 9} ${y + segH} L${x - 12} ${y} L${x + 12} ${y} L${x + 9} ${y + segH} Z`} fill={fill} stroke="#1e1b2e" strokeWidth="1.5" />);
  }
  const topY = baseY - 22 - full * segH;
  const done = floors >= 101;
  return (
    <g aria-hidden>
      <path d={`M${x - 14} ${baseY - 4} L${x - 10} ${baseY - 22} L${x + 10} ${baseY - 22} L${x + 14} ${baseY - 4} Z`} fill={fill} stroke="#1e1b2e" strokeWidth="1.5" />
      {segs}
      {done ? (
        <path d={`M${x} ${topY - 26} L${x} ${topY}`} stroke="#1e1b2e" strokeWidth="2" />
      ) : (
        <g stroke={night ? '#FFD34D' : '#1e1b2e'} strokeWidth="1.5" fill="none">
          <path d={`M${x + 4} ${topY} L${x + 4} ${topY - 22} M${x - 14} ${topY - 22} L${x + 18} ${topY - 22} M${x + 4} ${topY - 22} L${x + 18} ${topY - 14}`} />
        </g>
      )}
      {night && full > 0 && <circle cx={x} cy={topY} r="3" fill="#FF3EA5" opacity="0.9" />}
    </g>
  );
}

function eventText(r: EventReward, fmt: 'cjk' | 'kmb'): string {
  switch (r.event.kind) {
    case 'procession':
      return `A temple procession passes by, and the crowd spends big: +${formatMoney(r.cash ?? 0, fmt)}`;
    case 'scratch':
      return 'Someone dropped a scratch card 刮刮樂. Finders keepers: +1 scratch card';
    case 'recruit': {
      const c = r.card;
      const name = c ? CHARACTERS[c.charId]?.name : 'Someone';
      return c?.isNew ? `${name} walks in looking for work, and joins your crew!` : `${name} drops by again: ★${c?.starsAfter}`;
    }
    case 'tip':
      return r.event.xiaoxiao
        ? `A smiling Xiaoxiao agent shares a "friendly" tip 😊 Prices tick up: index +${(r.index ?? 0).toFixed(1)}`
        : `A broker tips you off about a deal. Prices tick up: index +${(r.index ?? 0).toFixed(1)}`;
  }
}

export function MapScreen({ onOpenArea, onOpenDraws, onOpenCrew, onLocked }: { onOpenArea: (id: AreaId) => void; onOpenDraws: () => void; onOpenCrew: () => void; onLocked: (msg: string) => void }) {
  const s = useGame();
  const now = useNow(5000);
  const phase = phaseAt(now);
  const night = phase === 'night';
  const ink = night ? '#f6f2ff' : '#1e1b2e';
  const sub = night ? 'rgba(246,242,255,0.6)' : 'rgba(30,27,46,0.6)';
  // A halo in the map's own background color keeps labels readable where they cross lines and rivers.
  const halo = { stroke: night ? '#1a1240' : '#f1ead9', strokeWidth: 3.5, strokeLinejoin: 'round' as const, paintOrder: 'stroke' };
  const floors = towerFloors(s);
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return localStorage.getItem('taipei2004.resourceGuide') !== 'closed'; } catch { return true; }
  });
  const [dismissed, setDismissed] = useState('');
  const rematch = Object.values(FIGHTS).find((f) => !isFirstWin(s, f) && rematchCooldown(s, f.id, now) === 0);
  const readyFight = Object.values(FIGHTS).find((f) => isFirstWin(s, f) && canChallenge(s, f));
  const nextLot = Object.values(ALL_LOTS).filter((lot) => !s.lots[lot.id] && isAreaOpen(s, lot.area) && !isLotLocked(s, lot)).sort((a, b) => buyPrice(s, a) - buyPrice(s, b))[0];
  const canStaff = Object.values(s.lots).some((lot) => !lot.manager) && Object.keys(s.characters).some((id) => classOf(id) === 'agent' && !postOf(s, id));
  const goal = readyFight ? { text: `Challenge ${CHARACTERS[readyFight.leader]?.name} in ${AREAS[readyFight.area].name}. Losing costs nothing.`, action: 'View Turf War', go: () => onOpenArea(readyFight.area) }
    : nextLot && s.cash >= buyPrice(s, nextLot) ? { text: `You can afford ${nextLot.name} in ${AREAS[nextLot.area].name}.`, action: 'View property', go: () => onOpenArea(nextLot.area) }
      : canStaff ? { text: 'You have an empty manager post and free crew. Compare their income bonuses in Crew.', action: 'View crew', go: onOpenCrew }
        : s.safe > 0 && !s.run.accountant ? { text: 'Income is waiting in your safe. Collect it to spend on properties.', action: 'Collect safe', go: () => { act(collectSafe); } }
          : nextLot ? { text: `Next property: ${nextLot.name}. Save ${formatMoney(Math.max(0, buyPrice(s, nextLot) - s.cash), s.settings.numberFormat)} more.`, action: 'View property', go: () => onOpenArea(nextLot.area) }
            : { text: `Keep upgrading lots to grow your market share in ${AREAS[AREA_ORDER.filter((id) => isAreaOpen(s, id) && !s.areas[id].boss).at(-1) ?? 'wanhua'].name}.`, action: 'View area', go: () => onOpenArea(AREA_ORDER.filter((id) => isAreaOpen(s, id) && !s.areas[id].boss).at(-1) ?? 'wanhua') };


  const goalKey = `${goal.action}:${readyFight?.id ?? nextLot?.id ?? ''}`;

  const ticker = [
    `★ 房價指數 HOUSING INDEX ${s.index.toFixed(1)} ▲`,
    `★ XIAOXIAO REALTY OPENS ITS 100TH BRANCH: "WE'RE ALWAYS SMILING!" 笑笑房屋`,
    `★ TAIPEI 101: ${floors} FLOORS AND RISING`,
    `★ LONGSHAN TEMPLE FESTIVAL THIS WEEKEND · 龍山寺`,
    `★ SCOOTER PARKING CRACKDOWN IN XIMENDING`,
    `★ LAND PRICES UP AGAIN, SAY BROKERS`,
  ].join('   ');

  const takeEvent = () => {
    const r = claimEvent(store.get(), Math.random, gameNow());
    if (!r) return;
    update(() => r.state);
    onLocked(eventText(r.reward, s.settings.numberFormat));
    navigator.vibrate?.(12);
  };

  const tapArea = (id: AreaId) => {
    if (isAreaOpen(s, id)) return onOpenArea(id);
    const order: AreaId[] = ['wanhua', 'ximending', 'zhongshan', 'east', 'xinyi'];
    const prev = order[order.indexOf(id) - 1];
    onLocked(`Claim ${prev ? AREAS[prev].name : 'the previous area'} to open ${AREAS[id].name}.`);
  };

  return (
    <div>
      <div className="ticker" aria-label="News ticker">
        <span className="ticker-track">{ticker}</span>
      </div>
      <div className="map-wrap">
        {dismissed !== goalKey && <section className="next-goal" aria-label="Next step">
          <div><strong>Next step</strong><p>{goal.text}</p></div>
          <div className="resource-actions"><button className="btn secondary small" onClick={() => { track('next_goal_opened', { action: goal.action }); goal.go(); }}>{goal.action}</button><button className="link-btn" onClick={() => setDismissed(goalKey)}>Dismiss</button></div>
        </section>}
        <div className="map-title">
          <h1>
            TAIPEI<span className="zh">台北</span>
          </h1>
          <span className="index">
            房價指數 <b>{s.index.toFixed(1)}</b>
          </span>
        </div>
        <div className="metro" data-phase={phase}>
          <svg viewBox="0 0 400 470" role="img" aria-label="Taipei metro map">
            {/* Rivers */}
            <path d="M 18 0 C 30 120, 8 220, 26 300 S 70 420, 150 470" fill="none" stroke={night ? '#2a4a8a' : '#a9d8ee'} strokeWidth="16" strokeLinecap="round" opacity="0.8" />
            <path d="M 150 470 C 220 430, 250 440, 330 470" fill="none" stroke={night ? '#2a4a8a' : '#a9d8ee'} strokeWidth="10" opacity="0.6" />

            {/* Decorative lines: Muzha (brown) and Zhonghe (orange) */}
            <path d="M 270 80 L 270 250 L 270 400" stroke="#C48C31" strokeWidth="6" strokeLinecap="round" opacity="0.35" fill="none" />
            <path d="M 200 360 L 165 420 L 150 470" stroke="#F8B61C" strokeWidth="6" strokeLinecap="round" opacity="0.35" fill="none" />

            {/* Tamsui line (red), north from Taipei Main */}
            <path d="M 190 250 L 190 20" stroke="#E3002C" strokeWidth="8" strokeLinecap="round" fill="none" />
            {/* Xindian line (green), south from Taipei Main, fading past Gongguan */}
            <defs>
              <linearGradient id="greenfade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#008659" stopOpacity="1" />
                <stop offset="0.65" stopColor="#008659" stopOpacity="0.9" />
                <stop offset="1" stopColor="#008659" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 190 250 L 190 330 C 190 360, 205 370, 215 395 L 222 470" stroke="url(#greenfade)" strokeWidth="8" strokeLinecap="round" fill="none" strokeDasharray="0" />
            <circle cx="215" cy="395" r="5" fill={night ? '#1a1240' : '#fff'} stroke="#008659" strokeWidth="3" />
            <text x="227" y="399" fontSize="10" fontWeight="700" fill={sub}>
              公館 Gongguan
            </text>
            <text x="226" y="452" fontSize="16" fontWeight="900" fill={sub}>
              ?
            </text>

            {/* Bannan line (blue), west to east, bending southwest past Ximen to Longshan Temple */}
            <path d="M -10 350 L 48 292 L 90 250 L 410 250" stroke="#0070BD" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {/* Taipei Main junction */}
            <rect x="180" y="240" width="20" height="20" rx="6" fill={night ? '#1a1240' : '#fff'} stroke={ink} strokeWidth="3" />
            <text x="200" y="278" fontSize="10" fontWeight="800" fill={sub} textAnchor="middle">
              台北車站
            </text>

            {/* Taipei 101 rising over Xinyi */}
            <Tower x={356} baseY={226} floors={floors} night={night} />

            {/* Decorations: stickers in the empty corners, under the stations and never tappable */}
            <g className="decor" aria-hidden>
              {DECOR.map((d) => {
                const url = artUrl('map', d.id);
                return url ? <image key={d.id} href={url} x={d.x - d.w / 2} y={d.y - d.h / 2} width={d.w} height={d.h} /> : null;
              })}
            </g>

            {/* Area stations */}
            {NODES.map((n) => {
              const area = AREAS[n.id];
              const open = isAreaOpen(s, n.id);
              const share = marketShare(s, n.id);
              const color = FACTIONS[area.rival].colors[0];
              const lx = n.label === 'right' ? n.x + 24 : n.x + (n.labelDx ?? 0);
              const ly = n.label === 'above' ? n.y - 46 : n.label === 'below' ? n.y + 34 : n.y - 6;
              const anchor = n.label === 'right' ? 'start' : 'middle';
              // Chinese name on a station-sign tag, then the market share. CJK glyphs are 1em wide.
              const tag = open ? tagColors(FACTIONS[area.rival].colors) : { bg: night ? '#2c2360' : '#e2dac8', fg: sub };
              const pct = open ? formatPercent(share) : '';
              const tagW = area.nameZh.length * 12 + 10;
              const pctW = pct ? pct.length * 7.4 + 5 : 0;
              const tx = anchor === 'middle' ? lx - (tagW + pctW) / 2 : lx;
              return (
                <g
                  key={n.id}
                  className="station-btn"
                  role="button"
                  tabIndex={0}
                  aria-label={`${area.name} ${open ? '' : '(locked)'}`}
                  onClick={() => tapArea(n.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && tapArea(n.id)}
                >
                  <circle cx={n.x} cy={n.y} r="26" fill="transparent" />
                  {open && (
                    <circle cx={n.x} cy={n.y} r="20" fill="none" stroke={color} strokeWidth="3" opacity="0.7">
                      <animate attributeName="r" values="16;24;16" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={n.x} cy={n.y} r="14" fill={open ? (night ? '#fff' : '#fff') : night ? '#3a3168' : '#cfc8bb'} stroke={ink} strokeWidth="3.5" />
                  {open ? (
                    <circle cx={n.x} cy={n.y} r="6" fill={color} />
                  ) : (
                    <g transform={`translate(${n.x - 5} ${n.y - 6})`} fill={ink} opacity="0.7">
                      <rect x="0" y="5" width="10" height="7" rx="1.5" />
                      <path d="M2 5V3.5a3 3 0 0 1 6 0V5" fill="none" stroke={ink} strokeWidth="1.6" />
                    </g>
                  )}
                  <text x={lx} y={ly} textAnchor={anchor} fontSize="13" fontWeight="900" fill={open ? ink : sub} fontFamily="Inter, sans-serif" {...halo}>
                    {area.name}
                  </text>
                  <rect x={tx} y={ly + 5} width={tagW} height={18} rx="4" fill={tag.bg} stroke={open ? ink : 'none'} strokeWidth="1.5" />
                  <text x={tx + tagW / 2} y={ly + 18.5} textAnchor="middle" fontSize="12" fontWeight="900" fill={tag.fg} fontFamily="'Noto Sans TC', sans-serif">
                    {area.nameZh}
                  </text>
                  {pct && (
                    <text x={tx + tagW + 5} y={ly + 18.5} fontSize="12" fontWeight="900" fill={ink} fontFamily="Inter, sans-serif" {...halo}>
                      {pct}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Street event: drawn last so it sits above stations and always wins the tap */}
            {s.event &&
              (() => {
                const n = NODES.find((x) => x.id === s.event!.area);
                if (!n) return null;
                const info = EVENT_INFO[s.event.kind];
                const [ex, ey] = n.bubble;
                // Xiaoxiao's tips keep the yellow 笑 bubble so they stay recognizable.
                const icon = s.event.xiaoxiao ? null : artUrl('events', s.event.kind);
                return (
                  <g
                    className="event-btn"
                    role="button"
                    tabIndex={0}
                    aria-label={`${info.name} at ${AREAS[n.id].name}. Tap to take it.`}
                    onClick={takeEvent}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && takeEvent()}
                  >
                    {/* About 44px on a phone */}
                    <circle cx={ex} cy={ey} r="27" fill="transparent" />
                    {icon ? (
                      <>
                        <path d={bubbleTail(ex, ey, 19, n.x, n.y)} fill="#FF3EA5" />
                        <circle cx={ex} cy={ey} r="19" fill="#120C2E" stroke="#FF3EA5" strokeWidth="3">
                          <animate attributeName="stroke-width" values="3;5.5;3" dur="1.2s" repeatCount="indefinite" />
                        </circle>
                        <image href={icon} x={ex - 15} y={ey - 15} width="30" height="30" style={{ imageRendering: 'pixelated' }} />
                      </>
                    ) : (
                      <>
                        <path d={bubbleTail(ex, ey, 16, n.x, n.y)} fill={ink} />
                        <circle cx={ex} cy={ey} r="15" fill={s.event.xiaoxiao ? '#FFD34D' : '#FF3EA5'} stroke={ink} strokeWidth="3">
                          <animate attributeName="r" values="14;17;14" dur="1.2s" repeatCount="indefinite" />
                        </circle>
                        <text x={ex} y={ey + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#1e1b2e" fontFamily="'Noto Serif TC', serif">
                          {s.event.xiaoxiao ? '笑' : info.glyph}
                        </text>
                      </>
                    )}
                  </g>
                );
              })()}
          </svg>
        </div>
        <p className="map-hint">
          {s.event ? 'Something is happening at a station! Tap the bubble before it moves on.' : 'Tap an open station to buy lots there. Each area belongs to a gang boss until you take it.'}
        </p>
        <details className="resource-guide" open={guideOpen} onToggle={(e) => {
          const open = e.currentTarget.open; setGuideOpen(open);
          try { localStorage.setItem('taipei2004.resourceGuide', open ? 'open' : 'closed'); } catch { /* optional preference */ }
        }}>
          <summary>
            <span>Resource guide</span>
            <small>Where to earn & spend</small>
          </summary>
          <div className="resource-guide-body">
            <p className="resource-guide-daily">
              <strong>One free Temple draw every day.</strong>{' '}
              {!s.zodiac ? 'Choose your zodiac in Draws to get started.'
                : canDraw(s, 'temple', now).free ? 'Your free visit is ready in Draws.'
                  : 'You’ve used today’s free visit. More draws cost incense money.'}
            </p>
            <div className="resource-actions">
              <button className="btn secondary small" onClick={() => { track('resource_guide_action', { action: 'draws' }); onOpenDraws(); }}>{canDraw(s, 'temple', now).free ? 'Visit free Temple' : 'Open Draws'}</button>
              {rematch && <button className="btn secondary small" onClick={() => { track('resource_guide_action', { action: 'rematch' }); onOpenArea(rematch.area); }}>Rewarded rematch: {AREAS[rematch.area].name}</button>}
            </div>
            <dl className="resource-guide-list">
              <div>
                <dt><span aria-hidden="true">刮</span> Scratch cards <small>{COST.scratch.amount} per scratch draw</small></dt>
                <dd>Tap scratch-card street events on this map, repel {SHAKEDOWN_SCRATCH_EVERY} shakedowns, or win a Turf War rematch. Each fight pays rematch rewards once every {REMATCH_COOLDOWN_MS / 60_000} minutes.</dd>
              </div>
              <div>
                <dt><span aria-hidden="true">香</span> Incense money <small>{COST.temple.amount} per Temple draw</small></dt>
                <dd>Beat each lieutenant or boss for the first time in a run. Later, extra copies of cards already at ★5 become incense money.</dd>
              </div>
              <div>
                <dt><span aria-hidden="true">樂</span> Lottery tickets <small>{COST.lottery.amount} ticket draws {LOTTERY_BALLS} cards</small></dt>
                <dd>First boss wins each run, completing a collection page in Crew, and cashing out in Office.</dd>
              </div>
            </dl>
            <p className="resource-guide-other"><strong>Cash:</strong> own and upgrade lots for steady income. <strong>XP:</strong> Turf War fights and repelled shakedowns. <strong>Face:</strong> cash out in Office for permanent upgrades.</p>
            <p className="resource-guide-foot">Draw currencies carry over when you cash out.</p>
          </div>
        </details>
      </div>
    </div>
  );
}
