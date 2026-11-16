import { useState } from 'react';
import { auraOf } from '../../game/battle';
import { AREAS } from '../../game/content/areas';
import { CHARACTERS, ROLES } from '../../game/content/characters';
import { FIGHTS } from '../../game/content/fights';
import { AURA_TEXT, skillOf } from '../../game/content/skills';
import { autoFillSquad, basePower, canFill, effectiveSquad, setSquadSlot, slotKind, slotUnlocked, type SlotKind } from '../../game/turf';
import type { GameState } from '../../game/types';
import { update } from '../engine';
import { useGame } from '../store';
import { Portrait, Sheet } from './bits';

const KIND_LABEL: Record<SlotKind, string> = {
  front: 'Front',
  back: 'Back',
  lt: 'Lt. commander',
  boss: 'Boss commander',
};

/** What unlocks a squad slot, in words. */
function unlockHint(slot: number): string {
  const fight = Object.values(FIGHTS).find((f) => f.unlockSlots === slot + 1);
  if (fight) {
    const who = CHARACTERS[fight.leader]?.name ?? fight.leader;
    return fight.key === 'boss' ? `Claim ${AREAS[fight.area].name}` : `Beat ${who}`;
  }
  return slot === 6 ? 'Claim Ximending' : 'Locked';
}

function commanderLine(id: string): string {
  const def = CHARACTERS[id];
  if (!def?.role) return '';
  return AURA_TEXT[auraOf({ skill: skillOf(id), role: def.role })];
}

function SlotTile({ s, slot, id, onPick }: { s: GameState; slot: number; id: string | null; onPick: () => void }) {
  const kind = slotKind(slot);
  if (!slotUnlocked(s, slot)) {
    return (
      <div className="slot" data-kind={kind} data-state="locked">
        <span className="slot-lock" aria-hidden>
          🔒
        </span>
        <span className="slot-label">{KIND_LABEL[kind]}</span>
        <span className="slot-hint">{unlockHint(slot)}</span>
      </div>
    );
  }
  if (!id) {
    return (
      <button className="slot" data-kind={kind} data-state="empty" onClick={onPick}>
        <span className="slot-plus">+</span>
        <span className="slot-label">{KIND_LABEL[kind]}</span>
      </button>
    );
  }
  const def = CHARACTERS[id]!;
  return (
    <button className="slot" data-kind={kind} data-state="filled" data-rarity={def.rarity} onClick={onPick}>
      <Portrait id={id} face className="slot-face" />
      <span className="slot-name">{def.name}</span>
      <span className="slot-meta">
        {def.role ? ROLES[def.role].nameZh : ''} · Lv {s.characters[id]?.level ?? 1}
      </span>
      <span className="slot-power">{basePower(s, id, slot)}</span>
    </button>
  );
}

function SlotPicker({ slot, onClose }: { slot: number; onClose: () => void }) {
  const s = useGame();
  const squad = effectiveSquad(s);
  const kind = slotKind(slot);
  const current = squad[slot];
  const options = Object.keys(s.characters)
    .filter((id) => canFill(id, slot))
    .sort((a, b) => basePower(s, b, slot) - basePower(s, a, slot));
  const commander = kind === 'lt' || kind === 'boss';
  const need =
    kind === 'front'
      ? 'Front row: bouncers 圍事, enforcers 打手 and runners 小弟.'
      : kind === 'back'
        ? 'Back row: strategists 軍師, runners 小弟 and every agent.'
        : kind === 'lt'
          ? 'Lieutenant-class (SR) or Boss-class (SSR). Commanders stand behind the army: their aura is always on, and their skill fires as a big ultimate.'
          : 'Boss-class (SSR) only. Commanders stand behind the army: their aura is always on, and their skill fires as a big ultimate.';
  return (
    <Sheet onClose={onClose}>
      <h2>{KIND_LABEL[kind]}</h2>
      <p style={{ margin: '4px 0 10px', fontSize: 13, fontWeight: 600, opacity: 0.75 }}>{need}</p>
      {options.length === 0 && <p className="empty-note">Nobody in your crew can fill this slot yet.</p>}
      <div className="pick-list">
        {options.map((id) => {
          const def = CHARACTERS[id]!;
          const at = squad.indexOf(id);
          const here = at === slot;
          const skill = def.skill;
          return (
            <button
              key={id}
              className="pick"
              aria-pressed={here}
              onClick={() => {
                update((st) => setSquadSlot(st, slot, id));
                onClose();
              }}
            >
              <Portrait id={id} face />
              <span>
                <span className="who">
                  {def.name} <span className="zh">{def.nameZh}</span>
                </span>
                <br />
                <span className="what">
                  {def.rarity} {def.role ? ROLES[def.role].name : ''} ·{' '}
                  {commander ? `Aura: ${commanderLine(id)}` : `${skill.name}: ${skill.text}`}
                  {at >= 0 && !here ? ` · now in ${KIND_LABEL[slotKind(at)]}` : ''}
                </span>
              </span>
              <span className="num">{basePower(s, id, slot)}</span>
            </button>
          );
        })}
      </div>
      {current && (
        <button
          className="btn secondary"
          style={{ marginTop: 12, width: '100%' }}
          onClick={() => {
            update((st) => setSquadSlot(st, slot, null));
            onClose();
          }}
        >
          Leave this slot empty
        </button>
      )}
    </Sheet>
  );
}

/** The 7-slot squad: front row, back row, commanders. Tap a slot to change who stands there. */
export function SquadBoard() {
  const s = useGame();
  const squad = effectiveSquad(s);
  const [pick, setPick] = useState<number | null>(null);
  const row = (slots: number[], label: string) => (
    <div className="squad-row" data-row={label}>
      <span className="squad-row-label">{label}</span>
      <div className="squad-slots" style={{ gridTemplateColumns: `repeat(${slots.length}, 1fr)` }}>
        {slots.map((i) => (
          <SlotTile key={i} s={s} slot={i} id={squad[i] ?? null} onPick={() => setPick(i)} />
        ))}
      </div>
    </div>
  );
  return (
    <section className="squad" aria-label="Squad">
      <div className="squad-head">
        <h2>
          Squad <span className="zh">人馬</span>
        </h2>
        <button className="btn secondary small" aria-pressed={s.squadAuto} onClick={() => update(autoFillSquad)}>
          {s.squadAuto ? 'Auto-fill: on ✓' : 'Auto-fill best'}
        </button>
      </div>
      {row([0, 1], 'Front')}
      {row([2, 3, 4], 'Back')}
      {row([5, 6], 'Command')}
      <p className="squad-note">
        {s.squadAuto
          ? 'Auto-fill puts your strongest cards in before every fight. Tap a slot to choose yourself.'
          : 'Your picks stay put. Tap Auto-fill best to let the office choose again.'}
      </p>
      {pick !== null && <SlotPicker slot={pick} onClose={() => setPick(null)} />}
    </section>
  );
}

