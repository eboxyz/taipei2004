/** This year's headline (three front pages after a cash-out) and the run's commissions. */
import { createPortal } from 'react-dom';
import { commissionStatus, COMMISSIONS } from '../../game/commissions';
import { HEADLINES } from '../../game/content/headlines';
import { headlineRule, pickHeadline } from '../../game/headlines';
import type { Headline } from '../../game/types';
import { track } from '../analytics';
import { update } from '../engine';
import { store, useGame, useNow } from '../store';
import { gameNow } from '../time';

/** A tabloid front page: the big 漢字 headline, a line of flavor and the run's rule. */
export function FrontPage({ h, compact = false }: { h: Headline; compact?: boolean }) {
  const def = HEADLINES[h.id];
  return (
    <article className="front-page" data-compact={compact}>
      <div className="fp-masthead" aria-hidden>
        <span className="zh">號外</span>
        <span>EXTRA</span>
      </div>
      <h3 className="fp-head zh">{def.nameZh}</h3>
      <p className="fp-name">{def.name}</p>
      {!compact && <p className="fp-deck">{def.deck}</p>}
      <p className="fp-rule">{headlineRule(h)}</p>
      {!compact && <p className="fp-suits">Good for: {def.suits}</p>}
    </article>
  );
}

/** Three front pages; picking one sets this run's headline. Shown until a pick is made. */
export function HeadlinePicker() {
  const s = useGame();
  if (s.run.offers.length === 0) return null;
  const pick = (i: number) => {
    const h = store.get().run.offers[i];
    if (!h) return;
    update((st) => pickHeadline(st, i));
    track('headline_picked', { headline: h.id, run: store.get().meta.runs });
  };
  return createPortal(
    <div className="headline-picker" role="dialog" aria-modal="true" aria-label="Pick this year's headline">
      <div className="hp-inner">
        <h2>
          This year's headline <span className="zh">今年頭條</span>
        </h2>
        <p>Pick one front page. It shapes this whole run.</p>
        <div className="hp-pages">
          {s.run.offers.map((h, i) => (
            <button key={h.id} className="fp-pick" onClick={() => pick(i)} aria-label={`${HEADLINES[h.id].name}: ${headlineRule(h)}`}>
              <FrontPage h={h} />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.querySelector('.phone') ?? document.body,
  );
}

/** Office: this run's headline and its three commissions. */
export function ThisYearPanel() {
  const s = useGame();
  useNow(1000);
  const now = gameNow();
  const { headline, offers, commissions } = s.run;
  return (
    <section className="panel this-year">
      <h2>
        This year <span className="zh">今年</span>
      </h2>
      {headline ? (
        <FrontPage h={headline} compact />
      ) : (
        <p>{offers.length > 0 ? 'Three front pages are waiting for you to pick one.' : 'No headline this run. Cash out to pick one for the next.'}</p>
      )}
      {commissions.length > 0 && (
        <>
          <h3>
            Commissions <span className="zh">委託</span>
          </h3>
          <p>Optional goals for this run. Each pays 1 lottery ticket 樂透 the moment it's done.</p>
          <ul className="commissions">
            {commissions.map((c) => {
              const st = commissionStatus(s, c, now);
              return (
                <li key={c.id} data-state={c.done ? 'done' : st.missed ? 'missed' : 'open'}>
                  <span className="cm-text">{COMMISSIONS[c.id].text}</span>
                  <b className="cm-num">{c.done ? '✓ Done' : st.missed ? 'Missed' : `${Math.floor(st.have)}/${st.need}`}</b>
                  {!c.done && !st.missed && (
                    <span className="cm-bar" aria-hidden>
                      <i style={{ width: `${(st.have / st.need) * 100}%` }} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
