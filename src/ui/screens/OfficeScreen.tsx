import { useState } from 'react';
import { canHireAccountant, hireAccountant } from '../../game/actions';
import { ACCOUNTANT_COST, ACCOUNTANT_UNLOCK_LOTS } from '../../game/constants';
import { netWorth, safeHours } from '../../game/economy';
import { exportSave, importSave } from '../../game/save';
import { Money } from '../components/bits';
import { act, replaceState, resetGame } from '../engine';
import { store, useGame } from '../store';
import { towerFloors } from './MapScreen';
import { gameNow } from '../time';

export function OfficeScreen({ onToast }: { onToast: (text: string, tone?: 'good' | 'warn') => void }) {
  const s = useGame();
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

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

      <section className="panel">
        <h2>Cash out 金盆洗手</h2>
        <p>Wash your hands in the golden basin, retire, and come back stronger. Arrives in a later build (milestone 4).</p>
      </section>

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

      <p className="map-hint" style={{ textAlign: 'center' }}>
        Taipei 2004 台北2004 · milestone 2 build
      </p>
    </div>
  );
}
