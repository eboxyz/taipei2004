import { useState } from 'react';
import { ROLES } from '../../game/content/characters';
import { ZODIAC, ZODIAC_BY_ID } from '../../game/content/zodiac';
import { canDraw, COST, featuredOn, LOTTERY_BALLS, LOTTERY_PITY, TEMPLE_PITY } from '../../game/gacha';
import { CHARACTERS } from '../../game/content/characters';
import { AREAS } from '../../game/content/areas';
import { FIGHTS } from '../../game/content/fights';
import { REMATCH_COOLDOWN_MS, SHAKEDOWN_SCRATCH_EVERY } from '../../game/constants';
import { isFirstWin, rematchCooldown } from '../../game/turf';
import type { AreaId, DrawKind, Zodiac } from '../../game/types';
import { track } from '../analytics';
import { Sheet } from '../components/bits';
import { update } from '../engine';
import { useGame, useNow } from '../store';
import { gameNow } from '../time';
import { costLabel, DrawStage, MACHINE_INFO } from './DrawStage';

const MACHINES: { kind: DrawKind; text: string; bg: string }[] = [
  { kind: 'scratch', text: 'Scratch the silver off with your finger. Mostly N and R, with a tiny jackpot.', bg: 'linear-gradient(135deg, #e9e2d6, #c9ccd6)' },
  { kind: 'temple', text: 'Shake until a stick falls, then throw the moon blocks: three "yes" throws (聖筊) in a row upgrade your card.', bg: 'linear-gradient(135deg, #ffb39b, #e8382f)' },
  { kind: 'lottery', text: 'Three balls per ticket, at least one SR or better. A featured card rotates every week.', bg: 'linear-gradient(135deg, #fff6c8, #d4a72c)' },
];

const roleNames = (z: Zodiac) =>
  ZODIAC_BY_ID[z].roles.map((r) => `${ROLES[r].name.toLowerCase()}s ${ROLES[r].nameZh}`).join(' and ');

export function ZodiacPicker({ onClose }: { onClose: () => void }) {
  const s = useGame();
  return (
    <Sheet onClose={onClose}>
      <h2>
        Your zodiac <span className="zh">生肖</span>
      </h2>
      <p style={{ margin: '4px 0 10px', fontSize: 13, fontWeight: 600, opacity: 0.75 }}>
        Your sign makes two roles turn up a little more often in every draw. Rarity odds never change. You can switch any time from here.
      </p>
      <div className="zodiac-grid">
        {ZODIAC.map((z) => (
          <button
            key={z.id}
            className="zodiac"
            aria-pressed={s.zodiac === z.id}
            onClick={() => {
              update((st) => ({ ...st, zodiac: z.id }));
              onClose();
            }}
          >
            <span className="zodiac-glyph">{z.zh}</span>
            <b>{z.name}</b>
            <small>{z.roles.map((r) => ROLES[r].name).join(' · ')}</small>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** Where each draw currency comes from. Starts folded; remembers if you open it. */
function ResourceGuide({ onOpenArea }: { onOpenArea: (area: AreaId) => void }) {
  const s = useGame();
  const now = gameNow();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('taipei2004.resourceGuide') === 'open';
    } catch {
      return false;
    }
  });
  const rematch = Object.values(FIGHTS).find((f) => !isFirstWin(s, f) && rematchCooldown(s, f.id, now) === 0);
  return (
    <details
      className="resource-guide"
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setOpen(next);
        try {
          localStorage.setItem('taipei2004.resourceGuide', next ? 'open' : 'closed');
        } catch {
          /* optional preference */
        }
      }}
    >
      <summary>
        <span>Resource guide</span>
        <small>Where to earn & spend</small>
      </summary>
      <div className="resource-guide-body">
        <p className="resource-guide-daily">
          <strong>One free Temple draw every day.</strong> Its stick also sets the day's luck for street events.{' '}
          {!s.zodiac ? 'Pick your zodiac first to get started.' : canDraw(s, 'temple', now).free ? 'Today’s is ready.' : 'You’ve used today’s; more cost incense money.'}
        </p>
        {rematch && (
          <div className="resource-actions">
            <button
              className="btn secondary small"
              onClick={() => {
                track('resource_guide_action', { action: 'rematch' });
                onOpenArea(rematch.area);
              }}
            >
              Rewarded rematch: {AREAS[rematch.area].name}
            </button>
          </div>
        )}
        <dl className="resource-guide-list">
          <div>
            <dt>
              <span aria-hidden="true">刮</span> Scratch cards <small>{COST.scratch.amount} per scratch draw</small>
            </dt>
            <dd>
              Tap scratch-card street events on the map, repel {SHAKEDOWN_SCRATCH_EVERY} shakedowns, or win a Turf War rematch. Each fight pays rematch rewards
              once every {REMATCH_COOLDOWN_MS / 60_000} minutes.
            </dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true">香</span> Incense money <small>{COST.temple.amount} per Temple draw</small>
            </dt>
            <dd>Beat each lieutenant or boss for the first time in a run. Later, extra copies of cards already at ★5 become incense money.</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true">樂</span> Lottery tickets <small>{COST.lottery.amount} ticket draws {LOTTERY_BALLS} cards</small>
            </dt>
            <dd>First boss wins each run, commissions, completing a collection page in Crew, and cashing out in Office.</dd>
          </div>
        </dl>
        <p className="resource-guide-other">
          <strong>Cash:</strong> own and upgrade lots for steady income. <strong>XP:</strong> Turf War fights and repelled shakedowns. <strong>Face:</strong> cash
          out in Office for permanent upgrades.
        </p>
        <p className="resource-guide-foot">Draw currencies, cards and stars carry over when you cash out.</p>
      </div>
    </details>
  );
}

export function DrawsScreen({ onOpenArea }: { onOpenArea: (area: AreaId) => void }) {
  const s = useGame();
  useNow(1000);
  const [open, setOpen] = useState<DrawKind | null>(null);
  const [zodiac, setZodiac] = useState(false);
  const now = gameNow();
  const wallet = [
    { glyph: '刮', name: 'Scratch cards', value: s.currencies.scratch },
    { glyph: '香', name: 'Incense money 香油錢', value: s.currencies.incense },
    { glyph: '樂', name: 'Lottery tickets', value: s.currencies.lottery },
  ];
  const tap = (kind: DrawKind) => (s.zodiac ? setOpen(kind) : setZodiac(true));
  const status = (kind: DrawKind): string => {
    if (kind === 'temple') {
      const left = TEMPLE_PITY - s.draws.templePity;
      return `SR or better within ${left} draw${left === 1 ? '' : 's'}`;
    }
    if (kind === 'lottery') {
      const left = LOTTERY_PITY - s.draws.lotteryPity;
      return `Featured: ${CHARACTERS[featuredOn(now)]!.name} · SSR within ${left} ticket${left === 1 ? '' : 's'}`;
    }
    return `${s.draws.count.scratch} scratched so far`;
  };
  return (
    <div className="page">
      <div className="page-title">
        <h1>DRAWS</h1>
        <span className="zh">抽籤</span>
      </div>
      <section className="wallet" aria-label="Draw currencies">
        {wallet.map((w) => (
          <div key={w.name} className="wallet-item">
            <span className="wallet-glyph">{w.glyph}</span>
            <b>{w.value}</b>
            <small>{w.name}</small>
          </div>
        ))}
      </section>
      <button className="zodiac-line" onClick={() => setZodiac(true)}>
        {s.zodiac ? (
          <>
            <span className="zodiac-glyph">{ZODIAC_BY_ID[s.zodiac].zh}</span>
            <span>
              <b>Year of the {ZODIAC_BY_ID[s.zodiac].name}</b>
              <small>More {roleNames(s.zodiac)} in your draws · change</small>
            </span>
          </>
        ) : (
          <>
            <span className="zodiac-glyph">?</span>
            <span>
              <b>Pick your zodiac 生肖</b>
              <small>Choose your sign before your first draw</small>
            </span>
          </>
        )}
      </button>
      <div className="machines">
        {MACHINES.map((m) => {
          const info = MACHINE_INFO[m.kind];
          const check = canDraw(s, m.kind, now);
          return (
            <button key={m.kind} className="machine" style={{ background: m.bg }} onClick={() => tap(m.kind)}>
              {check.free ? <span className="soon free">FREE TODAY</span> : check.ok && <span className="soon ready">READY</span>}
              <div className="glyph">{info.glyph}</div>
              <div>
                <h2>
                  {info.name}
                  <span className="zh">{info.zh}</span>
                </h2>
                <p>{m.text}</p>
                <p className="machine-meta">
                  {costLabel(m.kind)} · {status(m.kind)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <ResourceGuide onOpenArea={onOpenArea} />
      <p className="map-hint">You keep cards, stars and currencies forever, even after cashing out. Odds are listed inside each machine.</p>
      {open && <DrawStage kind={open} onClose={() => setOpen(null)} />}
      {zodiac && <ZodiacPicker onClose={() => setZodiac(false)} />}
    </div>
  );
}
