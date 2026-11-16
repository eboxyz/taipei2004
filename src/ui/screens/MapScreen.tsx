import { AREAS, FACTIONS } from '../../game/content/areas';
import { phaseAt } from '../../game/clock';
import { isAreaOpen, marketShare } from '../../game/economy';
import { formatPercent } from '../../game/format';
import type { AreaId, GameState } from '../../game/types';
import { store, useGame, useNow } from '../store';
import { CHARACTERS } from '../../game/content/characters';
import { claimEvent, EVENT_INFO, type EventReward } from '../../game/events';
import { formatMoney } from '../../game/format';
import { update } from '../engine';
import { gameNow } from '../time';

interface Node {
  id: AreaId;
  x: number;
  y: number;
  label: 'above' | 'below' | 'right';
}

const NODES: Node[] = [
  { id: 'wanhua', x: 66, y: 250, label: 'below' },
  { id: 'ximending', x: 128, y: 250, label: 'above' },
  { id: 'zhongshan', x: 190, y: 140, label: 'right' },
  { id: 'east', x: 290, y: 250, label: 'below' },
  { id: 'xinyi', x: 356, y: 250, label: 'below' },
];

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

export function MapScreen({ onOpenArea, onLocked }: { onOpenArea: (id: AreaId) => void; onLocked: (msg: string) => void }) {
  const s = useGame();
  const now = useNow(5000);
  const phase = phaseAt(now);
  const night = phase === 'night';
  const ink = night ? '#f6f2ff' : '#1e1b2e';
  const sub = night ? 'rgba(246,242,255,0.6)' : 'rgba(30,27,46,0.6)';
  const floors = towerFloors(s);

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

            {/* Bannan line (blue), west to east */}
            <path d="M 0 250 L 400 250" stroke="#0070BD" strokeWidth="9" strokeLinecap="round" />

            {/* Taipei Main junction */}
            <rect x="180" y="240" width="20" height="20" rx="6" fill={night ? '#1a1240' : '#fff'} stroke={ink} strokeWidth="3" />
            <text x="200" y="278" fontSize="10" fontWeight="800" fill={sub} textAnchor="middle">
              台北車站
            </text>

            {/* Taipei 101 rising over Xinyi */}
            <Tower x={356} baseY={226} floors={floors} night={night} />

            {/* Street event */}
            {s.event &&
              (() => {
                const n = NODES.find((x) => x.id === s.event!.area);
                if (!n) return null;
                const info = EVENT_INFO[s.event.kind];
                const ex = n.x + (n.label === 'right' ? -30 : 24);
                const ey = n.y - 34;
                return (
                  <g
                    className="event-btn"
                    role="button"
                    tabIndex={0}
                    aria-label={`${info.name} at ${AREAS[n.id].name}. Tap to take it.`}
                    onClick={takeEvent}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && takeEvent()}
                  >
                    <circle cx={ex} cy={ey} r="22" fill="transparent" />
                    <circle cx={ex} cy={ey} r="15" fill={s.event.xiaoxiao ? '#FFD34D' : '#FF3EA5'} stroke={ink} strokeWidth="3">
                      <animate attributeName="r" values="14;17;14" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                    <text x={ex} y={ey + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#1e1b2e" fontFamily="'Noto Serif TC', serif">
                      {s.event.xiaoxiao ? '笑' : info.glyph}
                    </text>
                    <path d={`M${ex - 4} ${ey + 14} L${ex} ${ey + 22} L${ex + 4} ${ey + 14}`} fill={ink} />
                  </g>
                );
              })()}

            {/* Area stations */}
            {NODES.map((n) => {
              const area = AREAS[n.id];
              const open = isAreaOpen(s, n.id);
              const share = marketShare(s, n.id);
              const color = FACTIONS[area.rival].colors[0];
              const lx = n.label === 'right' ? n.x + 24 : n.x;
              const ly = n.label === 'above' ? n.y - 44 : n.label === 'below' ? n.y + 36 : n.y - 6;
              const anchor = n.label === 'right' ? 'start' : 'middle';
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
                  <text x={lx} y={ly} textAnchor={anchor} fontSize="13" fontWeight="900" fill={open ? ink : sub} fontFamily="Inter, sans-serif">
                    {area.name}
                  </text>
                  <text x={lx} y={ly + 15} textAnchor={anchor} fontSize="12" fontWeight="900" fill={open ? color : sub} fontFamily="'Noto Sans TC', sans-serif">
                    {area.nameZh}
                    {open ? ` · ${formatPercent(share)}` : ''}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="map-hint">
          {s.event ? 'Something is happening at a station! Tap the bubble before it moves on.' : 'Tap an open station to buy lots there. Each area belongs to a gang boss until you take it.'}
        </p>
      </div>
    </div>
  );
}
