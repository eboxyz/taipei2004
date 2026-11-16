import { useState } from 'react';
import { classOf, statsOf } from '../../game/characters';
import { AREA_ORDER, AREAS } from '../../game/content/areas';
import { CHARACTERS } from '../../game/content/characters';
import { lotIncome, postOf } from '../../game/economy';
import type { GameState, LotDef } from '../../game/types';
import { LedIcon, Money, Portrait } from '../components/bits';
import { useGame } from '../store';
import { baseIncome } from '../../game/staffing';
import { LotSheet } from './AreaScreen';

/** A guard posted where shakedowns still happen who can't win them. */
function weakGuard(s: GameState, lot: LotDef): boolean {
  const g = s.lots[lot.id]?.security;
  return !!g && !s.areas[lot.area].boss && statsOf(g, s.characters[g]).muscle < AREAS[lot.area].threat;
}

function SlotFace({ id, label, warn }: { id: string | undefined; label: 'M' | 'S'; warn?: boolean }) {
  return (
    <span className="post-slot" data-empty={!id} data-warn={!!warn} title={id ? CHARACTERS[id]?.name : label === 'M' ? 'No Manager' : 'No Security'}>
      {id ? <Portrait id={id} face /> : <b>{label}</b>}
    </span>
  );
}

/** Crew → Posts: every lot you own, who manages and guards it, and who is still free. */
export function PostsView() {
  const s = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const groups = AREA_ORDER.map((area) => ({ area, lots: AREAS[area].lots.filter((l) => s.lots[l.id]) })).filter((g) => g.lots.length > 0);
  const lots = groups.flatMap((g) => g.lots);
  const free = Object.keys(s.characters).filter((id) => classOf(id) && !postOf(s, id));
  const agents = Object.keys(s.characters).filter((id) => classOf(id) === 'agent').length;
  // Managers multiply income, so what matters is whether your top earners have one.
  const top = [...lots].sort((a, b) => baseIncome(s, b) - baseIncome(s, a)).slice(0, agents);
  const topMissing = top.filter((l) => !s.lots[l.id]!.manager).length;
  const topIds = new Set(top.map((l) => l.id));
  const freeAgents = free.filter((id) => classOf(id) === 'agent').length;
  const unguarded = lots.filter((l) => !s.areas[l.area].boss && !s.lots[l.id]!.security).length;
  const weak = lots.filter((l) => weakGuard(s, l)).length;
  const notes = [
    topMissing && `${topMissing} of your top ${top.length} earners ${topMissing === 1 ? 'has' : 'have'} no Manager`,
    freeAgents && `${freeAgents} agent${freeAgents === 1 ? ' is' : 's are'} not posted`,
    unguarded && `${unguarded} lot${unguarded === 1 ? '' : 's'} unguarded where shakedowns happen`,
    weak && `${weak} guard${weak === 1 ? '' : 's'} too weak for their area`,
  ].filter(Boolean);

  if (lots.length === 0) return <p className="empty-note">Buy a lot first. Its Manager and Security slots show up here.</p>;

  return (
    <div className="posts">
      <p className="staff-tip">
        <b>Tip</b> {notes.length ? `${notes.join(' · ')}. ` : 'Every slot that matters is filled. '}
        Tap a lot to see who fits it best.
      </p>
      {groups.map(({ area, lots: here }) => (
        <section key={area} className="post-area">
          <h3>
            {AREAS[area].name} <span className="zh">{AREAS[area].nameZh}</span>
            {s.areas[area].boss && <small>Claimed · no shakedowns</small>}
          </h3>
          {here.map((lot) => {
            const ls = s.lots[lot.id]!;
            const names = [ls.manager && `M ${CHARACTERS[ls.manager]?.name}`, ls.security && `S ${CHARACTERS[ls.security]?.name}`].filter(Boolean).join(' · ');
            return (
              <button key={lot.id} className="post-row" onClick={() => setOpen(lot.id)}>
                <LedIcon category={lot.category} size={40} />
                <span className="post-lot">
                  <b>
                    {topIds.has(lot.id) && <span className="top-earner">Top {top.length}</span>}
                    {lot.name}
                  </b>
                  <small>
                    <Money value={lotIncome(s, lot, 'average')} />
                    /s{names ? ` · ${names}` : ''}
                  </small>
                </span>
                <SlotFace id={ls.manager} label="M" />
                <SlotFace id={ls.security} label="S" warn={weakGuard(s, lot)} />
              </button>
            );
          })}
        </section>
      ))}
      <section className="post-area">
        <h3>Not posted</h3>
        {free.length === 0 ? (
          <p className="empty-note">Everyone has a post.</p>
        ) : (
          <div className="post-free">
            {free.map((id) => (
              <span key={id} className="post-free-item">
                <Portrait id={id} face />
                <small>
                  {CHARACTERS[id]?.name}
                  <br />
                  {classOf(id) === 'agent' ? 'Agent' : 'Gangster'}
                </small>
              </span>
            ))}
          </div>
        )}
      </section>
      {open && <LotSheet lotId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
