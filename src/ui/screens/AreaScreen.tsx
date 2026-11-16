import { canChallenge } from '../../game/turf';
import { useState } from 'react';
import { assignStaff, buyLot, upgradeLot } from '../../game/actions';
import { ALL_LOTS, AREAS, FACTIONS } from '../../game/content/areas';
import { CATEGORIES } from '../../game/content/categories';
import { CHARACTERS, ROLES } from '../../game/content/characters';
import { classOf, statsOf } from '../../game/characters';
import { gameHour, phaseAt } from '../../game/clock';
import { perk } from '../../game/perks';
import { hotCategory } from '../../game/tick';
import { LOCAL_GUARD_WEIGHT, LOCAL_MANAGER_MULT, SHARE_THRESHOLDS } from '../../game/constants';
import { fightFor } from '../../game/content/fights';
import {
  buyPrice,
  incomeBreakdown,
  incomeOf,
  isLocal,
  isLotLocked,
  lotIncome,
  marketShare,
  lotOwnership,
  nextMilestone,
  upgradeCost,
  upgradeCostN,
  upgradeCountFor,
} from '../../game/economy';
import { formatMoney, formatPercent } from '../../game/format';
import { bestBuy, mostlyIndex, type Buy } from '../../game/income';
import { ordersScope } from '../../game/auto';
import { IncomeSources } from '../components/Income';
import { lotsLeftToBuy, slotAdvice } from '../../game/staffing';
import type { AreaId, BuyMode, FightKey, GameState, LotDef, Phase } from '../../game/types';
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
  const ownership = lotOwnership(s, area);
  const prog = s.areas[area];
  const chips: { key: FightKey; at: number; who: string; done: boolean; title: string }[] = [
    { key: 'lt1' as const, at: SHARE_THRESHOLDS.lt1, who: def.lt1Id, done: prog.lt1, title: 'Lieutenant' },
    { key: 'lt2' as const, at: SHARE_THRESHOLDS.lt2, who: def.lt2Id, done: prog.lt2, title: 'Lieutenant' },
    { key: 'boss' as const, at: SHARE_THRESHOLDS.boss, who: def.bossId, done: prog.boss, title: 'Boss' },
  ];
  return (
    <section className="share" aria-label="District progress">
      <div className="share-top">
        <span className="label">
          Properties owned in {def.name} <span className="zh">{FACTIONS[def.rival].crest}</span>
        </span>
        <span className="value">{ownership.owned}/{ownership.total} · {formatPercent(ownership.fraction)}</span>
      </div>
      <div className="share-bar" role="progressbar" aria-label="Properties owned" aria-valuemin={0} aria-valuemax={ownership.total} aria-valuenow={ownership.owned}>
        <div className="share-fill" style={{ width: `${ownership.fraction * 100}%` }} />
      </div>
      <details className="influence-details">
        <summary>Market influence: {formatPercent(share)}</summary>
        <p>Buying and upgrading lots grows your influence against {FACTIONS[def.rival].name}. This is separate from the number of properties you own. The next rivals require 25%, 50% and 75% influence; A-Biao only needs your first property.</p>
        <div className="share-bar" aria-label="Market influence">
          <div className="share-fill" style={{ width: `${Math.min(100, share * 100)}%` }} />
          {chips.filter((c) => !(area === 'wanhua' && c.key === 'lt1')).map((c) => <div key={c.key} className="share-tick" style={{ left: `${c.at * 100}%` }} />)}
        </div>
      </details>
      <div className="fights">
        {chips.map((c) => {
          const fight = fightFor(area, c.key);
          const opening = fight?.id === 'wanhua_lt1';
          const ready = !c.done && !!fight && canChallenge(s, fight);
          const name = CHARACTERS[c.who]?.name ?? '???';
          const tap = () => {
            if (!c.done && !ready) return onToast(opening ? `Buy your first Wanhua property to challenge ${name}.` : `Reach ${Math.round(c.at * 100)}% market influence to challenge ${name}.`);
            if (!fight) return onToast(`${def.name}'s Turf Wars arrive in a later build (milestone 4).`);
            onFight(fight.id);
          };
          return (
            <button key={c.key} className="fight-chip" data-state={c.done ? 'done' : ready ? 'ready' : 'locked'} onClick={tap}>
              <b>{c.done ? '✓ Rematch' : ready ? 'FIGHT!' : opening ? 'First property' : `${Math.round(c.at * 100)}% influence`}</b>
              {c.title} · {name}
            </button>
          );
        })}
      </div>
      {area === 'wanhua' && !prog.lt1 && (
        <p className="map-hint">
          {AREAS.wanhua.lots.some((l) => s.lots[l.id])
            ? 'A-Biao is ready for you. Tap FIGHT! Your starter squad can take him, and losing costs nothing.'
            : 'Buy your first property, then challenge A-Biao. Your starter squad is ready to try; losing costs nothing.'}
        </p>
      )}
      {prog.boss && <p className="claimed-note">Claimed 🏮 Income ×2 here, lots you don't own yet cost 25% less, and no more shakedowns.</p>}
    </section>
  );
}

const TWIST: Partial<Record<AreaId, string>> = {
  xindian: 'Commuter district: income ×2 while you’re away.',
  ximending: 'Fast money: cheaper lots that pay for themselves sooner.',
  zhongshan: '🌙 Night town: every business here earns ×2 at night (lots elsewhere get ×1.5).',
  xinyi: 'The most expensive land in the city, and the last boss.',
};

function AreaTwist({ area }: { area: AreaId }) {
  const s = useGame();
  const now = useNow(1000);
  const hot = area === 'east' ? CATEGORIES[s.hot ?? hotCategory(now)] : null;
  const minsLeft = Math.ceil(24 - gameHour(now));
  return (
    <>
      {hot ? (
        <p className="twist hot">
          🔥 Hot right now: <b>{hot.name}s</b> earn ×2. The trend changes in {minsLeft} min.
        </p>
      ) : (
        TWIST[area] && <p className="twist">{TWIST[area]}</p>
      )}
      {perk.standingOrders(s) && s.auto.orders && ordersScope(s).area === area && (
        <p className="twist orders-focus">Standing Orders 自動加碼 are focused here until the next rival's fight is ready.</p>
      )}
    </>
  );
}

/** The Best buy line on a lot card: what to buy and what it adds. */
function BestBuyNote({ best }: { best: Buy }) {
  return (
    <div className="best-buy">
      <b>Best buy</b>
      <span>
        {best.kind === 'upgrade' ? `Lv ${best.toLevel}: ` : ''}+<Money value={best.gain} />
        /s for <Money value={best.cost} />
      </span>
      {mostlyIndex(best) && <small>Mostly through the price index: every ×2 and new lot lifts all your income.</small>}
    </div>
  );
}

function LotCard({ lot, mode, phase, best, onOpen, onMilestone }: { lot: LotDef; mode: BuyMode; phase: Phase; best?: Buy; onOpen: () => void; onMilestone: (m: string) => void }) {
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

  if (isXiaoxiao && locked) {
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
        <div className="lock-note">{s.meta.chapterClears > 0 ? "Clear Xindian’s lieutenants" : "Not for sale"}</div>
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
    // What it would earn right now at Lv 1, with every bonus that already applies.
    const income = incomeOf(incomeBreakdown(s, lot, phase, 1));
    return (
      <div className="lot" data-state="unowned" data-best={!!best}>
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
          {best && <BestBuyNote best={best} />}
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
    <div className="lot" data-state="owned" data-best={!!best} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
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
        {best && <BestBuyNote best={best} />}
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

/** A Manager's role perk, said for this lot specifically. */
function perkNote(s: GameState, lot: LotDef, charId: string): string | null {
  const role = CHARACTERS[charId]?.role;
  const area = AREAS[lot.area].name;
  if (role === 'dianzhang') return '+25% extra income here';
  if (role === 'daishu') return 'Upgrades on this lot 10% cheaper';
  if (role === 'kuaiji') return 'Safe holds 1 more hour, on any lot';
  if (role === 'fangzhong') {
    const left = lotsLeftToBuy(s, lot.area);
    return left > 0 ? `Lots in ${area} 5% cheaper (${left} left to buy)` : `Nothing left to buy in ${area}, so no discount`;
  }
  return null;
}

function StaffPicker({ lot, slot }: { lot: LotDef; slot: 'manager' | 'security' }) {
  const s = useGame();
  const fmt = (n: number) => formatMoney(n, s.settings.numberFormat);
  const need = slot === 'manager' ? 'agent' : 'gangster';
  if (!Object.keys(s.characters).some((id) => classOf(id) === need))
    return <p className="empty-note">No {need === 'agent' ? 'agents' : 'gangsters'} in your crew yet.</p>;
  const { options, tip } = slotAdvice(s, lot.id, slot, fmt);
  const threat = AREAS[lot.area].threat;
  const occupant = options.find((o) => o.current);
  return (
    <>
      <p className="staff-tip">
        <b>Tip</b> {tip}
      </p>
      <div className="pick-list">
        {options.map((o) => {
          const def = CHARACTERS[o.charId]!;
          const st = statsOf(o.charId, s.characters[o.charId]);
          const from = o.leaves ? ALL_LOTS[o.leaves]?.name ?? o.leaves : null;
          let value: string;
          let detail: string[];
          if (slot === 'manager') {
            value = o.current ? 'Here now' : `${o.net >= 0 ? '+' : '−'}${fmt(Math.abs(o.net))}/s`;
            // Spell out the whole trade, so the net number on the right adds up.
            detail = o.current
              ? [`Adds ${fmt(o.gainHere)}/s here`]
              : [
                  `+${fmt(o.gainHere)}/s here${occupant ? ` instead of ${CHARACTERS[occupant.charId]?.name}'s +${fmt(occupant.gainHere)}/s` : ''}`,
                  ...(from ? [`−${fmt(o.lossThere)}/s at ${from}`] : []),
                ];
            const note = perkNote(s, lot, o.charId);
            if (note) detail.push(note);
            if (isLocal(o.charId, lot.area)) detail.push(`Local: +${Math.round((LOCAL_MANAGER_MULT - 1) * 100)}% here`);
          } else {
            value = `M${st.muscle}`;
            detail = [o.strong ? `Strong enough (needs ${threat})` : `Too weak (needs ${threat})`];
            if (isLocal(o.charId, lot.area)) detail.push(`Local: counts ×${LOCAL_GUARD_WEIGHT} for Home Turf`);
            if (from) detail.push(o.leavesUnguarded ? `Would leave ${from} unguarded` : `Guarding ${from}`);
            if (o.current) detail.unshift('Here now');
          }
          return (
            <button
              key={o.charId}
              className="pick"
              aria-pressed={o.current}
              data-worse={slot === 'manager' && !o.current && o.net < 0}
              onClick={() => act((st2) => assignStaff(st2, lot.id, slot, o.current ? null : o.charId))}
            >
              <Portrait id={o.charId} face />
              <span>
                <span className="who">
                  {def.name} <span className="zh">{def.nameZh}</span>
                  {o.best && <span className="best-fit">Best fit</span>}
                </span>
                <br />
                <span className="what">
                  {[def.role ? ROLES[def.role].name : '', ...detail].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="num">{value}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function LotSheet({ lotId, onClose }: { lotId: string; onClose: () => void }) {
  const s = useGame();
  const lot = ALL_LOTS[lotId]!;
  const ls = s.lots[lotId];
  if (!ls) return null;
  const cat = CATEGORIES[lot.category]!;
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
            {cat.name} {cat.nameZh} · {lot.area === 'zhongshan' ? 'earns ×2 at night' : `earns ×1.5 by ${cat.tag}`}
          </div>
        </div>
      </div>
      <h3>Income</h3>
      <IncomeSources lot={lot} />
      <dl className="kv" style={{ marginTop: 8 }}>
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

export function AreaScreen({
  area,
  fightId,
  onBack,
  onToast,
}: {
  area: AreaId;
  /** Open straight onto this fight's prep screen (from the map's FIGHT! button). */
  fightId?: string | null;
  onBack: () => void;
  onToast: (text: string, tone?: 'good' | 'warn') => void;
}) {
  const def = AREAS[area];
  const now = useNow(1000);
  const phase = phaseAt(now);
  const s = useGame();
  const mode = s.settings.buyMode;
  const best = bestBuy(s, def.lots);
  const setMode = (buyMode: BuyMode) => update((st) => ({ ...st, settings: { ...st.settings, buyMode } }));
  const [open, setOpen] = useState<string | null>(null);
  const [fight, setFight] = useState<string | null>(fightId ?? null);
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
        <AreaTwist area={area} />
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
            <LotCard
              key={lot.id}
              lot={lot}
              mode={mode}
              phase={phase}
              best={best?.lotId === lot.id ? best : undefined}
              onOpen={() => setOpen(lot.id)}
              onMilestone={(m) => onToast(m, 'good')}
            />
          ))}
        </div>
        <p className="map-hint">
          Best buy marks what adds the most income per NT$ here, day and night averaged. Tap a lot you own to post a Manager and Security, or press and
          hold UP to keep upgrading.
        </p>
      </div>
      {open && <LotSheet lotId={open} onClose={() => setOpen(null)} />}
      {fight && <TurfWar fightId={fight} onClose={() => setFight(null)} />}
    </div>
  );
}

