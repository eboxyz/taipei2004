/** The four income sources, shown in the lot sheet and in Office. Display only: no numbers change here. */
import { AREAS } from '../../game/content/areas';
import { BINDER_STEP_INCOME } from '../../game/content/binder';
import { CATEGORIES } from '../../game/content/categories';
import { CHARACTERS } from '../../game/content/characters';
import { statsOf } from '../../game/characters';
import { phaseAt } from '../../game/clock';
import { LOCAL_MANAGER_MULT, MILESTONES, ZHONGSHAN_NIGHT_MULT } from '../../game/constants';
import { incomeBreakdown, incomeOf, incomePerSec, isLocal, nextMilestone } from '../../game/economy';
import { formatMult, formatPercent } from '../../game/format';
import { growth, incomeByArea, NEAR_MILESTONE, sourceFactors, SOURCES, type SourceId } from '../../game/income';
import type { GameState, LotDef, Phase } from '../../game/types';
import { useGame, useNow } from '../store';
import { Money } from './bits';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One short line per source on what makes up its multiplier for this lot right now. */
function sourceNotes(s: GameState, lot: LotDef, phase: Phase): Record<SourceId, string> {
  const b = incomeBreakdown(s, lot, phase);
  const cat = CATEGORIES[lot.category]!;
  const area = AREAS[lot.area];
  const reached = MILESTONES.filter((m) => b.level >= m).length;
  const next = nextMilestone(b.level);

  const best = lot.area === 'zhongshan' ? `×${ZHONGSHAN_NIGHT_MULT} at night` : `×1.5 by ${cat.tag}`;
  const time = [b.phase > 1 ? `${cat.tag === 'day' ? '☀ Day' : '🌙 Night'} business at its best` : `Off-hours (earns ${best})`];
  if (lot.area === 'east') time.push(b.hot > 1 ? 'Hot type ×2' : 'Not the hot type right now');
  time.push(b.claim > 1 ? 'Claimed ×2' : `Claim ${area.name} for ×2`);

  const mgr = s.lots[lot.id]?.manager;
  const def = mgr ? CHARACTERS[mgr] : undefined;
  const people = mgr && def
    ? `${def.name}, Business ${statsOf(mgr, s.characters[mgr]).business}${def.role === 'dianzhang' ? ', 店長 +25%' : ''}${
        isLocal(mgr, lot.area) ? `, local +${Math.round((LOCAL_MANAGER_MULT - 1) * 100)}%` : ''
      }`
    : 'No Manager yet. Post an agent below.';

  const rep = [`Price index ${s.index.toFixed(1)}`];
  if (b.goodName > 1) rep.unshift(`Good Name ${formatMult(b.goodName)}`);
  if (b.binder > 1) rep.push(`Binder ${formatMult(b.binder)}`);

  return {
    lot: `Lv ${b.level} · ${reached} of ${MILESTONES.length} ×2 milestones${next ? `, next at Lv ${next}` : ''}`,
    time: time.join(' · '),
    people,
    reputation: rep.join(' · '),
  };
}

/** Lot sheet: base rate × the four sources = income right now. */
export function IncomeSources({ lot }: { lot: LotDef }) {
  const s = useGame();
  const phase = phaseAt(useNow(1000));
  const b = incomeBreakdown(s, lot, phase);
  const factors = sourceFactors(b);
  const notes = sourceNotes(s, lot, phase);
  return (
    <div className="sources">
      <div className="source-row">
        <span>
          <b>Base rate</b>
          <small>At Lv 1 with no bonuses</small>
        </span>
        <b className="source-num">
          <Money value={b.base} />
          /s
        </b>
      </div>
      {SOURCES.map((src) => (
        <div key={src.id} className="source-row">
          <span>
            <b>{src.name}</b>
            <small>{notes[src.id]}</small>
          </span>
          <b className="source-num">{formatMult(factors[src.id])}</b>
        </div>
      ))}
      <div className="source-row source-total">
        <span>
          <b>Right now</b>
        </span>
        <b className="source-num">
          <Money value={incomeOf(b)} />
          /s
        </b>
      </div>
    </div>
  );
}

/** Office: each district's share of income, and where each source still has room to grow. */
export function IncomePanel() {
  const s = useGame();
  const total = incomePerSec(s, 'average');
  if (total <= 0) return null;
  const rows = incomeByArea(s);
  const g = growth(s);
  const tips: { source: SourceId; text: string }[] = [];
  if (g.nearMilestone > 0)
    tips.push({ source: 'lot', text: `${plural(g.nearMilestone, 'lot is', 'lots are')} ${NEAR_MILESTONE} levels or fewer from a ×2. Look for Best buy in each district.` });
  if (g.unclaimed) tips.push({ source: 'time', text: `Claim ${AREAS[g.unclaimed].name} to double income there.` });
  if (g.noManager > 0)
    tips.push({
      source: 'people',
      text: `${plural(g.noManager, 'lot has', 'lots have')} no Manager${g.freeAgents > 0 ? `, and ${plural(g.freeAgents, 'agent is', 'agents are')} free` : ''}.`,
    });
  if (g.cardsToStep !== null)
    tips.push({ source: 'reputation', text: `${plural(g.cardsToStep, 'more new card')} for +${Math.round(BINDER_STEP_INCOME * 100)}% income everywhere.` });
  const name = (id: SourceId) => SOURCES.find((x) => x.id === id)!.name;
  return (
    <section className="panel income-panel">
      <h2>Where your income comes from</h2>
      <p>
        <Money value={total} />
        /s in all, day and night averaged.
      </p>
      <ul className="area-income">
        {rows.map((r) => (
          <li key={r.area}>
            <span className="area-name">{AREAS[r.area].name}</span>
            <span className="area-bar" aria-hidden>
              <i style={{ width: `${Math.max(2, r.share * 100)}%` }} />
            </span>
            <span className="area-pct">{r.share < 0.01 ? '<1%' : formatPercent(r.share)}</span>
          </li>
        ))}
      </ul>
      {tips.length > 0 && (
        <>
          <h3>Room to grow</h3>
          <ul className="growth">
            {tips.map((t) => (
              <li key={t.source}>
                <b>{name(t.source)}</b> {t.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
