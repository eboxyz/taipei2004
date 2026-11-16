import { useState } from 'react';
import { canHireAccountant, hireAccountant } from '../../game/actions';
import { ACCOUNTANT_COST, ACCOUNTANT_UNLOCK_LOTS } from '../../game/constants';
import { incomePerSec, isAreaOpen, netWorth, safeHours } from '../../game/economy';
import { optimizeStaff } from '../../game/staffing';
import { formatMoney } from '../../game/format';
import { exportSave, importSave } from '../../game/save';
import { Money } from '../components/bits';
import { act, debugSkip, replaceState, resetGame, update } from '../engine';
import { store, useGame } from '../store';
import { towerFloors } from './MapScreen';
import { DEBUG, gameNow } from '../time';
import { COST, dayKey, draw, type CardGain } from '../../game/gacha';
import { COLLECTIBLES, uniqueCards } from '../../game/binder';
import { CHARACTERS } from '../../game/content/characters';
import { AREA_ORDER, AREAS, FACTIONS } from '../../game/content/areas';
import { EVENT_LIFETIME_S } from '../../game/constants';
import type { EventKind } from '../../game/types';
import { AutomationPanel, CashOutPanel, FaceTree } from './FacePanel';
import { CashOutCeremony, Fireworks } from '../components/Ceremony';

/**
 * Dev only: ten real temple draws (same odds, pity and binder rewards) that don't spend
 * incense or use up today's free draw. Returns a summary for the toast.
 */
function devDrawTen(): string {
  const start = store.get();
  if (!start.zodiac) return 'Pick your zodiac on the Draws tab first.';
  const now = gameNow();
  let s = start;
  const gains: CardGain[] = [];
  const pages: string[] = [];
  for (let i = 0; i < 10; i++) {
    // Top up the cost and mark the free draw as used, so the real draw() charges nothing net.
    const funded = {
      ...s,
      currencies: { ...s.currencies, incense: s.currencies.incense + COST.temple.amount },
      draws: { ...s.draws, lastFreeTemple: dayKey(now) },
    };
    const r = draw(funded, 'temple', Math.random, now);
    if (!r.ok) return `Draw failed: ${r.reason}`;
    s = r.state;
    gains.push(...r.result.gains);
    pages.push(...r.result.binderPages.map((f) => FACTIONS[f].name));
  }
  s = { ...s, draws: { ...s.draws, lastFreeTemple: start.draws.lastFreeTemple } };
  update(() => s);
  const fresh = gains.filter((g) => g.isNew).map((g) => `${CHARACTERS[g.charId]?.name ?? g.charId} (${g.rarity})`);
  const tally = (['SSR', 'SR', 'R', 'N'] as const).map((r) => `${gains.filter((g) => g.rarity === r).length} ${r}`).join(' · ');
  return [
    `Draw ×10: ${tally}.`,
    fresh.length ? `New: ${fresh.join(', ')}.` : 'No new cards.',
    `Binder ${uniqueCards(s)}/${COLLECTIBLES.length}.`,
    pages.length ? `Page complete: ${pages.join(', ')}!` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Dev only: reassigns every post for the most income and the best guards. */
function devOptimizeStaff(): string {
  const before = store.get();
  const after = optimizeStaff(before);
  update(() => after);
  const fmt = (n: number) => formatMoney(n, before.settings.numberFormat);
  return `Staff optimized: ${fmt(incomePerSec(before, 'average'))}/s → ${fmt(incomePerSec(after, 'average'))}/s (day and night averaged).`;
}

/** Dev only: puts a street event at the next open station, cycling through them, to check bubble placement. */
function devStreetEvent(): string {
  const st = store.get();
  const open = AREA_ORDER.filter((a) => a !== 'xindian' && isAreaOpen(st, a));
  const next = open[(open.indexOf(st.event?.area ?? open[open.length - 1]!) + 1) % open.length]!;
  const kinds: EventKind[] = ['procession', 'recruit', 'scratch', 'tip'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
  update((s) => ({ ...s, event: { id: Date.now(), area: next, kind, xiaoxiao: false, expiresIn: EVENT_LIFETIME_S } }));
  return `Street event (${kind}) at ${AREAS[next].name}. Check the map.`;
}

export function OfficeScreen({ onToast }: { onToast: (text: string, tone?: 'good' | 'warn') => void }) {
  const s = useGame();
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [scene, setScene] = useState<'cashout' | 'fireworks' | null>(null);

  const setFormat = (numberFormat: 'cjk' | 'kmb') => store.set({ ...store.get(), settings: { ...store.get().settings, numberFormat } });

  const doExport = async () => {
    const text = exportSave(store.get());
    setExported(text);
    try {
      await navigator.clipboard.writeText(text);
      onToast('Save copied to clipboard.', 'good');
    } catch {
      onToast('Save string is below. Copy it somewhere safe.');
    }
  };

  const doImport = () => {
    const next = importSave(importText, gameNow());
    if (!next) return onToast("That save string didn't work.", 'warn');
    replaceState(next);
    setImportText('');
    onToast('Save loaded.', 'good');
  };

  return (
    <div className="page">
      <div className="page-title">
        <h1>OFFICE</h1>
        <span className="zh">辦公室</span>
      </div>

      <section className="panel">
        <h2>Bookkeeper 會計</h2>
        <p>Collects the safe for you while the game is open. Offline income still waits in the safe.</p>
        <div className="row">
          <span style={{ fontWeight: 800 }}>
            {s.run.accountant ? 'Hired ✓' : canHireAccountant(s) ? <Money value={ACCOUNTANT_COST} /> : `Own ${ACCOUNTANT_UNLOCK_LOTS} lots to unlock`}
          </span>
          {!s.run.accountant && (
            <button
              className="btn"
              disabled={!canHireAccountant(s) || s.cash < ACCOUNTANT_COST}
              onClick={() => {
                const err = act(hireAccountant);
                onToast(err ?? 'The bookkeeper is on it. Income now goes straight to your cash.', err ? 'warn' : 'good');
              }}
            >
              Hire
            </button>
          )}
        </div>
      </section>

      <CashOutPanel />
      <FaceTree onToast={onToast} />
      <AutomationPanel />

      <section className="panel">
        <h2>Ledger</h2>
        <dl className="kv">
          <dt>Housing price index 房價指數</dt>
          <dd>{s.index.toFixed(1)}</dd>
          <dt>Taipei 101</dt>
          <dd>{towerFloors(s)} / 101 floors</dd>
          <dt>Net worth</dt>
          <dd>
            <Money value={netWorth(s)} />
          </dd>
          <dt>Earned this run</dt>
          <dd>
            <Money value={s.runEarned} />
          </dd>
          <dt>Safe size</dt>
          <dd>{safeHours(s)} hours of income</dd>
          <dt>Shakedowns repelled</dt>
          <dd>{s.stats.shakedownsRepelled}</dd>
          <dt>Shakedown bonuses</dt>
          <dd>
            <Money value={s.stats.shakedownBonus} />
          </dd>
          <dt>Runs (cash-outs)</dt>
          <dd>{s.meta.runs}</dd>
          <dt>Face earned in total</dt>
          <dd>{s.meta.faceTotal}</dd>
          <dt>Turf Wars won / lost</dt>
          <dd>
            {s.stats.fightsWon} / {s.stats.fightsLost}
          </dd>
        </dl>
      </section>

      <section className="panel">
        <h2>Settings</h2>
        <p>Big numbers: Chinese units or K/M/B. Press and hold any amount to see the other style.</p>
        <div className="seg" role="group" aria-label="Number format">
          <button aria-pressed={s.settings.numberFormat === 'cjk'} onClick={() => setFormat('cjk')}>
            萬 / 億
          </button>
          <button aria-pressed={s.settings.numberFormat === 'kmb'} onClick={() => setFormat('kmb')}>
            K / M / B
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Save</h2>
        <p>Your game saves on this device automatically. Export a backup string, or paste one to load it.</p>
        <div className="row" style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={doExport}>
            Export
          </button>
          <button className="btn secondary" disabled={!importText.trim()} onClick={doImport}>
            Import
          </button>
        </div>
        {exported && <textarea className="save-box" readOnly value={exported} onFocus={(e) => e.currentTarget.select()} />}
        <textarea className="save-box" placeholder="Paste a save string here to import" value={importText} onChange={(e) => setImportText(e.target.value)} />
        {confirmReset ? (
          <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
            <button
              className="btn danger"
              onClick={() => {
                resetGame();
                setConfirmReset(false);
                onToast('Fresh start. Good luck, boss.');
              }}
            >
              Yes, wipe my save
            </button>
            <button className="btn secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn secondary" onClick={() => setConfirmReset(true)}>
            Start over…
          </button>
        )}
      </section>

      {DEBUG && (
        <section className="panel debug-panel">
          <h2>Dev tools</h2>
          <p>Only in dev builds. The DEV button in the top bar changes game speed.</p>
          <div className="row" style={{ justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn secondary small" onClick={() => debugSkip(3600)}>
              Away 1 h
            </button>
            <button className="btn secondary small" onClick={() => debugSkip(8 * 3600)}>
              Away 8 h
            </button>
            <button className="btn secondary small" onClick={() => update((st) => ({ ...st, meta: { ...st.meta, face: st.meta.face + 100, faceTotal: st.meta.faceTotal + 100 } }))}>
              +100 Face
            </button>
            <button className="btn secondary small" onClick={() => update((st) => ({ ...st, currencies: { scratch: st.currencies.scratch + 10, incense: st.currencies.incense + 100, lottery: st.currencies.lottery + 3 } }))}>
              +Draw currency
            </button>
            <button className="btn secondary small" onClick={() => onToast(devStreetEvent())}>
              Street event
            </button>
            <button className="btn secondary small" onClick={() => setScene('cashout')}>
              Cash-out scene
            </button>
            <button className="btn secondary small" onClick={() => setScene('fireworks')}>
              Fireworks scene
            </button>
            <button className="btn secondary small" onClick={() => onToast(devDrawTen())}>
              Draw ×10
            </button>
            <button className="btn secondary small" onClick={() => onToast(devOptimizeStaff())}>
              Optimize everyone
            </button>
          </div>
          {scene === 'cashout' && <CashOutCeremony face={1234} onClose={() => setScene(null)} />}
          {scene === 'fireworks' && <Fireworks full onClose={() => setScene(null)} />}
        </section>
      )}

      <p className="map-hint" style={{ textAlign: 'center' }}>
        Taipei 2004 台北2004 · milestone 4 build
      </p>
    </div>
  );
}
