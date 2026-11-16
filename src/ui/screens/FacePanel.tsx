import { useState } from 'react';
import { track } from '../analytics';
import { AREAS } from '../../game/content/areas';
import { BRANCHES, FACE_UPGRADES, type Branch } from '../../game/content/face';
import { buyFaceUpgrade, canCashOut, cashOut, cashOutPreview, faceCost, firstWins } from '../../game/face';
import { formatMoney, formatNumber } from '../../game/format';
import { faceLevel, perk } from '../../game/perks';
import { Money } from '../components/bits';
import { CashOutCeremony } from '../components/Ceremony';
import { HeadlinePicker } from '../components/RunNews';
import { act, replaceState, update } from '../engine';
import { store, useGame } from '../store';
import { gameNow } from '../time';

const RESETS = 'Cash, lots, upgrades, area control, the price index and the safe';
const STAYS = 'Cards, stars, levels, binder, draw currencies, guarantees, Face, squad slots and automation';

export function CashOutPanel() {
  const s = useGame();
  const [confirm, setConfirm] = useState(false);
  const [ceremony, setCeremony] = useState<number | null>(null);
  if (!canCashOut(s)) {
    return (
      <section className="panel">
        <h2>Cash out 金盆洗手</h2>
        <p>Wash your hands in the golden basin, retire, and come back stronger. Claim Wanhua first.</p>
      </section>
    );
  }
  const p = cashOutPreview(s);
  const fmt = s.settings.numberFormat;
  return (
    <section className="panel cashout" data-glow={p.goodTime}>
      <h2>Cash out 金盆洗手</h2>
      <p>
        Retire with your Face 面子, then start a new run. Face buys permanent upgrades below. You also get a lottery ticket.
      </p>
      <ul className="face-parts">
        <li>
          <span>Best net worth this run ({formatMoney(s.bestNetWorth, fmt)})</span>
          <b>+{p.fromWorth}</b>
        </li>
        <li>
          <span>Areas claimed this run ({s.run.claims})</span>
          <b>+{p.fromClaims}</b>
        </li>
        {p.fromUnderdog > 0 && (
          <li>
            <span>Underdog wins ({s.run.underdog})</span>
            <b>+{p.fromUnderdog}</b>
          </li>
        )}
        {p.fromRearmed > 0 && (
          <li>
            <span>Rearmed Rivals: first wins ({firstWins(s)})</span>
            <b>+{p.fromRearmed}</b>
          </li>
        )}
      </ul>
      <p className="face-next">
        Next Face at a net worth of <Money value={p.nextWorth} />.
        {p.goodTime ? ' This would raise your Face by half or more. A good time to retire.' : ''}
      </p>
      {confirm ? (
        <div className="cashout-confirm">
          <p>
            <b>Resets:</b> {RESETS}.
            <br />
            <b>Stays:</b> {STAYS}.
          </p>
          <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
            <button
              className="btn"
              onClick={() => {
                const r = cashOut(store.get(), gameNow());
                track('cash_out', { run: r.state.meta.runs, face_earned: r.face });
                replaceState(r.state);
                setConfirm(false);
                setCeremony(r.face);
              }}
            >
              Wash my hands: +{p.face} Face
            </button>
            <button className="btn secondary" onClick={() => setConfirm(false)}>
              Not yet
            </button>
          </div>
        </div>
      ) : (
        <button className="btn cashout-btn" disabled={p.face <= 0} onClick={() => setConfirm(true)}>
          Cash out now: +{p.face} Face
        </button>
      )}
      {/* After the ceremony, the new run's three front pages (they wait here until one is picked). */}
      {ceremony !== null ? <CashOutCeremony face={ceremony} onClose={() => setCeremony(null)} /> : <HeadlinePicker />}
    </section>
  );
}

export function FaceTree({ onToast }: { onToast: (text: string, tone?: 'good' | 'warn') => void }) {
  const s = useGame();
  const [branch, setBranch] = useState<Branch>('business');
  if (s.meta.faceTotal <= 0 && s.meta.face <= 0) {
    return (
      <section className="panel">
        <h2>Face upgrades 面子</h2>
        <p>Cash out once to earn Face. It buys permanent upgrades: more income, a bigger safe, automation, a stronger army and better luck.</p>
      </section>
    );
  }
  const b = BRANCHES.find((x) => x.id === branch)!;
  return (
    <section className="panel face-tree">
      <div className="face-head">
        <h2>Face upgrades 面子</h2>
        <span className="face-balance">
          <span className="zh">面</span> {formatNumber(s.meta.face, s.settings.numberFormat)}
        </span>
      </div>
      <div className="seg branch-seg" role="group" aria-label="Upgrade branch">
        {BRANCHES.map((x) => (
          <button key={x.id} aria-pressed={x.id === branch} onClick={() => setBranch(x.id)}>
            {x.name}
            <span className="zh">{x.zh}</span>
          </button>
        ))}
      </div>
      <p className="branch-blurb">{b.blurb}</p>
      <div className="face-list">
        {FACE_UPGRADES.filter((u) => u.branch === branch).map((u) => {
          const level = faceLevel(s, u.id);
          const maxed = level >= u.max;
          const cost = maxed ? 0 : faceCost(u.id, level);
          return (
            <div key={u.id} className="face-up" data-maxed={maxed}>
              <div>
                <b>
                  {u.name} <span className="zh">{u.zh}</span>
                </b>
                {(u.max > 1 || level > 0) && <span className="face-level">{u.max > 1 ? `Lv ${level}/${u.max}` : 'Owned'}</span>}
                <p>
                  {level > 0 && u.max > 1 ? (
                    <>
                      Now: {u.effect(level)}
                      {!maxed && (
                        <>
                          <br />
                          Next: {u.effect(level + 1)}
                        </>
                      )}
                    </>
                  ) : (
                    u.effect(Math.max(1, level))
                  )}
                </p>
              </div>
              <button
                className="btn small"
                disabled={maxed || s.meta.face < cost}
                onClick={() => {
                  const err = act((st) => buyFaceUpgrade(st, u.id));
                  if (err) onToast(err, 'warn');
                }}
              >
                {maxed ? 'Max' : `面 ${formatNumber(cost, s.settings.numberFormat)}`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AutomationPanel() {
  const s = useGame();
  const any = perk.autoBuy(s) || perk.autoStaff(s) || perk.autoUpgrade(s);
  if (!any) return null;
  const toggle = (key: 'buy' | 'staff') => update((st) => ({ ...st, auto: { ...st.auto, [key]: !st.auto[key] } }));
  return (
    <section className="panel">
      <h2>Automation 自動化</h2>
      <p>Runs while the game is open. Switch each one on or off any time.</p>
      {perk.autoBuy(s) && (
        <label className="switch-row">
          <span>
            <b>Land Scout</b> buys the cheapest open lot when you can afford it
          </span>
          <input type="checkbox" checked={s.auto.buy} onChange={() => toggle('buy')} />
        </label>
      )}
      {perk.autoStaff(s) && (
        <label className="switch-row">
          <span>
            <b>Duty Roster</b> fills empty slots with free crew: best managers on your biggest earners, guards just strong enough for their area
          </span>
          <input type="checkbox" checked={s.auto.staff} onChange={() => toggle('staff')} />
        </label>
      )}
      {perk.autoUpgrade(s) && (
        <p style={{ marginTop: 8 }}>
          <b>Standing Orders</b> are switched on per area, from each area's screen. On now:{' '}
          {s.auto.upgrade.length ? s.auto.upgrade.map((a) => AREAS[a].name).join(', ') : 'none'}.
        </p>
      )}
    </section>
  );
}
