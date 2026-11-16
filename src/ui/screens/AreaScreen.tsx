import { useState } from 'react';
import { assignStaff, buyLot, upgradeLot } from '../../game/actions';
import { ALL_LOTS, AREAS, FACTIONS } from '../../game/content/areas';
import { CATEGORIES } from '../../game/content/categories';
import { CHARACTERS, MANAGER_PERKS, ROLES } from '../../game/content/characters';
import { classOf, statsOf } from '../../game/characters';
import { phaseAt } from '../../game/clock';
import { SHARE_THRESHOLDS } from '../../game/constants';
import { fightFor } from '../../game/content/fights';
import {
  buyPrice,
  isLotLocked,
  lotIncome,
  marketShare,
  nextMilestone,
  postOf,
  upgradeCost,
  upgradeCostN,
  upgradeCountFor,
} from '../../game/economy';
import { formatPercent } from '../../game/format';
import type { AreaId, BuyMode, FightKey, LotDef, Phase } from '../../game/types';
import { artUrl } from '../art';
import { LedIcon, Money, PhaseTag, Portrait, Sheet, useHoldRepeat } from '../components/bits';
import { act, update } from '../engine';
import { store, useGame, useNow } from '../store';
import { TurfWar } from './TurfWar';

const SIGNS: Record<string, string[]> = {
  wanhua: ['茶', '藥', '麵', '旅'],
};

function Banner({ area, phase }: { area: AreaId; phase: Phase }) {
  const def = AREAS[area];
  const url = artUrl('areas', `${area}_${phase}`);
  const signColors = ['#E8382F', '#2BB673', '#FFC93C', '#FF3EA5'];
  return (
    <div className="banner">
      {url ? (
        <img src={url} alt="" />
      ) : (
        <div className="banner-placeholder" data-phase={phase}>
          <div className="banner-signs" style={{ justifyContent: 'flex-end', paddingRight: 18 }}>
            {(SIGNS[area] ?? ['店', '旅']).map((ch, i) => (
              <span key={ch} style={{ background: phase === 'day' ? signColors[i % 4] : 'rgba(18,12,46,0.6)', color: phase === 'night' ? signColors[i % 4] : undefined }}>
                {ch}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="banner-title">
        <h1>{def.name.toUpperCase()}</h1>
        <span className="zh">{def.nameZh}</span>
      </div>
    </div>
  );
}

function ShareCard({ area, onFight, onToast }: { area: AreaId; onFight: (fightId: string) => void; onToast: (msg: string) => void }) {
  const s = useGame();
  const def = AREAS[area];
  const share = marketShare(s, area);
  const prog = s.areas[area];
  const chips: { key: FightKey; at: number; who: string; done: boolean; title: string }[] = [
    { key: 'lt1' as const, at: SHARE_THRESHOLDS.lt1, who: def.lt1Id, done: prog.lt1, title: 'Lieutenant' },
    { key: 'lt2' as const, at: SHARE_THRESHOLDS.lt2, who: def.lt2Id, done: prog.lt2, title: 'Lieutenant' },
    { key: 'boss' as const, at: SHARE_THRESHOLDS.boss, who: def.bossId, done: prog.boss, title: 'Boss' },
  ];
  return (
    <section className="share" aria-label="Market share">
      <div className="share-top">
        <span className="label">
          Market share vs {FACTIONS[def.rival].name} <span className="zh">{FACTIONS[def.rival].crest}</span>
        </span>
        <span className="value">{formatPercent(share)}</span>
      </div>
      <div className="share-bar">
        <div className="share-fill" style={{ width: `${Math.min(100, share * 100)}%` }} />
        {chips.map((c) => (
          <div key={c.key} className="share-tick" style={{ left: `${c.at * 100}%` }} />
        ))}
      </div>
      <div className="fights">
        {chips.map((c) => {
          const ready = !c.done && share >= c.at;
          const name = CHARACTERS[c.who]?.name ?? '???';
          const fight = fightFor(area, c.key);
          const tap = () => {
            if (!c.done && !ready) return onToast(`Reach ${Math.round(c.at * 100)}% market share to challenge ${name}.`);
            if (!fight) return onToast(`${def.name}'s Turf Wars arrive in a later build (milestone 4).`);
            onFight(fight.id);
          };
          return (
            <button key={c.key} className="fight-chip" data-state={c.done ? 'done' : ready ? 'ready' : 'locked'} onClick={tap}>
              <b>{c.done ? '✓ Rematch' : ready ? 'FIGHT!' : `${Math.round(c.at * 100)}%`}</b>
              {c.title} · {name}
            </button>
          );
        })}
      </div>
      {prog.boss && <p className="claimed-note">Claimed 🏮 Income ×2 here, and no more shakedowns.</p>}
    </section>
  );
}

function LotCard({ lot, mode, phase, onOpen, onMilestone }: { lot: LotDef; mode: BuyMode; phase: Phase; onOpen: () => void; onMilestone: (m: string) => void }) {
  const s = useGame();
  const ls = s.lots[lot.id];
  const cat = CATEGORIES[lot.category]!;
  const locked = !ls && isLotLocked(s, lot);
  const isXiaoxiao = lot.lock === 'xiaoxiao';

  const upgrade = () => {
    // Read the freshest state so a held button never acts on a stale render.
    const st = store.get();
    const level = st.lots[lot.id]?.level ?? 1;
    const r = upgradeLot(st, lot.id, mode === 'max' ? 'max' : upgradeCountFor(st, lot, level, mode));
    if (!r.ok) return false;
    act(() => r);
    for (const m of r.milestones ?? []) onMilestone(`${lot.name} hit Lv ${m}: income ×2!`);
    return mode !== 'max';
  };
  const buy = () => {
    act((st) => buyLot(st, lot.id));
    return false; // never auto-repeat a purchase
  };
  const hold = useHoldRepeat(ls ? upgrade : buy);

  if (isXiaoxiao) {
    return (
      <div className="lot" data-state="xiaoxiao">
        <LedIcon category={lot.category} />
        <div className="lot-info">
          <div className="lot-name">
            {lot.name}
            <span className="zh">{lot.nameZh}</span>
          </div>
          <div className="lot-meta">Always happy to help the neighborhood! 😊</div>
        </div>
        <div className="lock-note">Not for sale</div>
      </div>
    );
  }

  if (locked) {
    const who = lot.lock === 'lt1' ? AREAS[lot.area].lt1Id : AREAS[lot.area].lt2Id;
    return (
      <div className="lot" data-state="locked">
        <LedIcon category={lot.category} />
        <div className="lot-info">
          <div className="lot-name">
            {lot.name}
            <span className="zh">{lot.nameZh}</span>
          </div>
          <div className="lot-meta">
            <PhaseTag tag={cat.tag} />
            <span className="income">
              <Money value={lot.price} />
            </span>
          </div>
        </div>
        <div className="lock-note">Held by {CHARACTERS[who]?.name}. Beat them to buy.</div>
      </div>
    );
  }

  if (!ls) {
    const price = buyPrice(s, lot);
    const income = lot.income * (s.index / 100);
    return (
      <div className="lot" data-state="unowned">
        <LedIcon category={lot.category} />
        <div className="lot-info">
          <div className="lot-name">
            {lot.name}
            <span className="zh">{lot.nameZh}</span>
          </div>
          <div className="lot-meta">
            <PhaseTag tag={cat.tag} live={cat.tag === phase} />
            <span className="income">
              +<Money value={income} />
              /s
            </span>
          </div>
        </div>
        <button className="action-btn" data-kind="buy" disabled={s.cash < price} {...hold}>
          BUY
          <small>
            <Money value={price} />
          </small>
        </button>
      </div>
    );
  }

  const count = upgradeCountFor(s, lot, ls.level, mode);
  const cost = count > 0 ? upgradeCostN(s, lot, ls.level, count) : upgradeCost(s, lot, ls.level);
  const can = count > 0 && s.cash >= cost;
  const next = nextMilestone(ls.level);
  const prevM = [0, 10, 25, 50, 100].filter((m) => m <= ls.level).pop() ?? 0;
  const progress = next ? (ls.level - prevM) / (next - prevM) : 1;
  const mgr = ls.manager;
  const sec = ls.security;

  return (
    <div className="lot" data-state="owned" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <LedIcon category={lot.category} />
      <div className="lot-info">
        <div className="lot-name">
          {lot.name}
          <span className="zh">{lot.nameZh}</span>
        </div>
        <div className="lot-meta">
          <span>Lv {ls.level}</span>
          <PhaseTag tag={cat.tag} live={cat.tag === phase} />
          <span className="income">
            +<Money value={lotIncome(s, lot, phase)} />
            /s
          </span>
        </div>
        <div className="staff-slots">
          <span className="slot-chip" data-filled={!!mgr} title="Manager">
            {mgr ? <Portrait id={mgr} face style={{ width: '100%', height: '100%' }} /> : 'M'}
          </span>
          <span className="slot-chip" data-filled={!!sec} title="Security">
            {sec ? <Portrait id={sec} face style={{ width: '100%', height: '100%' }} /> : 'S'}
          </span>
        </div>
        {next && (
          <div className="lot-progress" aria-label={`Next milestone at level ${next}`}>
            <div style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
      <button className="action-btn" disabled={!can} {...hold}>
        {mode === 'next' ? `UP → Lv${ls.level + count}` : `UP ×${Math.max(count, 1)}`}
        <small>
          <Money value={cost} />
        </small>
      </button>
    </div>
  );
}

function StaffPicker({ lot, slot }: { lot: LotDef; slot: 'manager' | 'security' }) {
  const s = useGame();
  const ls = s.lots[lot.id]!;
  const current = ls[slot];
  const need = slot === 'manager' ? 'agent' : 'gangster';
  const crew = Object.keys(s.characters).filter((id) => classOf(id) === need);
  const threat = AREAS[lot.area].threat;
  if (crew.length === 0) return <p className="empty-note">No {need === 'agent' ? 'agents' : 'gangsters'} in your crew yet.</p>;
  return (
    <div className="pick-list">
      {crew.map((id) => {
        const def = CHARACTERS[id]!;
        const st = statsOf(id, s.characters[id]);
        const post = postOf(s, id);
        const here = current === id;
        const elsewhere = post && !here ? `Posted at ${ALL_LOTS[post.lotId]?.name ?? post.lotId}` : null;
        const what =
          slot === 'manager'
            ? `+${st.business}% income${def.role && MANAGER_PERKS[def.role] ? ` · ${MANAGER_PERKS[def.role]}` : ''}`
            : st.muscle >= threat
              ? `Strong enough for ${AREAS[lot.area].name} shakedowns`
              : `Needs Muscle ${threat} to win shakedown bonuses`;
        return (
          <button key={id} className="pick" aria-pressed={here} onClick={() => act((st2) => assignStaff(st2, lot.id, slot, here ? null : id))}>
            <Portrait id={id} face />
            <span>
              <span className="who">
                {def.name} <span className="zh">{def.nameZh}</span>
              </span>
              <br />
              <span className="what">
                {def.role ? ROLES[def.role].name : ''} · {what}
                {elsewhere ? ` · ${elsewhere}` : ''}
              </span>
            </span>
            <span className="num">{slot === 'manager' ? `B${st.business}` : `M${st.muscle}`}</span>
          </button>
        );
      })}
    </div>
  );
}

function LotSheet({ lotId, onClose }: { lotId: string; onClose: () => void }) {
  const s = useGame();
  const now = useNow(1000);
  const phase = phaseAt(now);
  const lot = ALL_LOTS[lotId]!;
  const ls = s.lots[lotId];
  if (!ls) return null;
  const cat = CATEGORIES[lot.category]!;
  const next = nextMilestone(ls.level);
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <LedIcon category={lot.category} size={64} />
        <div>
          <h2>
            {lot.name}
            <span className="zh">{lot.nameZh}</span>
          </h2>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7 }}>
            {cat.name} {cat.nameZh} · earns ×1.5 by {cat.tag}
          </div>
        </div>
      </div>
      <h3>Numbers</h3>
      <dl className="kv">
        <dt>Level</dt>
        <dd>{ls.level}</dd>
        <dt>Income right now</dt>
        <dd>
          <Money value={lotIncome(s, lot, phase)} />
          /s
        </dd>
        <dt>Next ×2 milestone</dt>
        <dd>{next ? `Lv ${next}` : 'All reached'}</dd>
        <dt>Total invested</dt>
        <dd>
          <Money value={ls.invested} />
        </dd>
      </dl>
      <h3>Manager (agents) · boosts income</h3>
      <StaffPicker lot={lot} slot="manager" />
      <h3>Security (gangsters) · wins shakedown bonuses</h3>
      <StaffPicker lot={lot} slot="security" />
    </Sheet>
  );
}

export function AreaScreen({ area, onBack, onToast }: { area: AreaId; onBack: () => void; onToast: (text: string, tone?: 'good' | 'warn') => void }) {
  const def = AREAS[area];
  const now = useNow(1000);
  const phase = phaseAt(now);
  const mode = useGame().settings.buyMode;
  const setMode = (buyMode: BuyMode) => update((st) => ({ ...st, settings: { ...st.settings, buyMode } }));
  const [open, setOpen] = useState<string | null>(null);
  const [fight, setFight] = useState<string | null>(null);
  if (def.lots.length === 0) {
    return (
      <div>
        <div className="area-head">
          <Banner area={area} phase={phase} />
          <button className="back-btn" onClick={onBack}>
            ← Map
          </button>
        </div>
        <div className="area-body">
          <p className="flavor">{def.flavor}</p>
          <section className="panel">
            <h2>Coming soon</h2>
            <p>
              {def.name}'s lots, rivals and Turf Wars arrive in a later build (milestone 4). For now, Wanhua is where the money is.
            </p>
          </section>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="area-head">
        <Banner area={area} phase={phase} />
        <button className="back-btn" onClick={onBack}>
          ← Map
        </button>
      </div>
      <div className="area-body">
        <p className="flavor">{def.flavor}</p>
        <ShareCard area={area} onFight={setFight} onToast={(m) => onToast(m)} />
        <div className="buy-toggle">
          <span className="label">Upgrade</span>
          <div className="seg" role="group" aria-label="Upgrade amount">
            {([1, 10, 'max', 'next'] as BuyMode[]).map((m) => (
              <button key={String(m)} aria-pressed={mode === m} onClick={() => setMode(m)} title={m === 'next' ? 'Upgrade to the next ×2 income milestone' : undefined}>
                {m === 'max' ? 'Max' : m === 'next' ? 'Next ×2' : `×${m}`}
              </button>
            ))}
          </div>
        </div>
        <div className="lots">
          {def.lots.map((lot) => (
            <LotCard key={lot.id} lot={lot} mode={mode} phase={phase} onOpen={() => setOpen(lot.id)} onMilestone={(m) => onToast(m, 'good')} />
          ))}
        </div>
        <p className="map-hint">Tip: tap a lot you own to post a Manager and Security. Press and hold UP to keep upgrading.</p>
      </div>
      {open && <LotSheet lotId={open} onClose={() => setOpen(null)} />}
      {fight && <TurfWar fightId={fight} onClose={() => setFight(null)} />}
    </div>
  );
}

