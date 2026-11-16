import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { createBattle, fire, stepBattle, type Battle, type BattleEvent, type BattleInput, type Unit } from '../../game/battle';
import { classOf } from '../../game/characters';
import { phaseAt, secondsToNextPhase } from '../../game/clock';
import { ALL_LOTS, AREAS, AREA_ORDER, FACTIONS } from '../../game/content/areas';
import { Fireworks } from '../components/Ceremony';
import { CHARACTERS } from '../../game/content/characters';
import { FIGHTS, type FightDef } from '../../game/content/fights';
import { QUICK_CLAIM_RATIO, SHARE_BONUS_PER_STEP } from '../../game/constants';
import { marketShare } from '../../game/economy';
import { formatPercent } from '../../game/format';
import {
  battleInputFor,
  buildTheirSide,
  buildYourSide,
  effectiveSquad,
  isFirstWin,
  recommendedPower,
  rematchCooldown,
  resolveFight,
  type FightResult,
} from '../../game/turf';
import type { GameState, Phase } from '../../game/types';
import { artUrl } from '../art';
import { Portrait } from '../components/bits';
import { useDebugSpeed } from '../components/chrome';
import { SquadBoard } from '../components/Squad';
import { update } from '../engine';
import { store, useGame, useNow } from '../store';
import { gameNow } from '../time';

type Stage =
  | { kind: 'prep' }
  | { kind: 'battle'; input: BattleInput; seed: number; phase: Phase; power: number }
  | { kind: 'result'; result: FightResult; hints: string[] };

const SLOT_NAMES = ['', '4th army slot', '5th army slot', 'Lieutenant commander slot', 'Boss commander slot'];

/* ---------- Hints after a loss ---------- */

function lossHints(s: GameState, fight: FightDef, phase: Phase, power: number): string[] {
  const hints: string[] = [];
  const ids = effectiveSquad(s).filter((x): x is string => !!x);
  const gangsters = ids.filter((id) => classOf(id) === 'gangster').length;
  const agents = ids.length - gangsters;
  const mins = Math.ceil(secondsToNextPhase(gameNow()) / 60);
  if (phase === 'day' && gangsters > agents) hints.push(`Night falls in ${mins} min. Gangsters hit 20% harder at night.`);
  if (phase === 'night' && agents > gangsters) hints.push(`Dawn is ${mins} min away. Agents are 20% stronger by day.`);
  if (power < recommendedPower(fight))
    hints.push(
      `Your power is under the recommended ${recommendedPower(fight)}. Crew level up by guarding and managing lots and from every fight, and each 5% of market share above the line adds ${Math.round(SHARE_BONUS_PER_STEP * 100)}%.`,
    );
  hints.push(fight.tip);
  return hints.slice(0, 2);
}

/* ---------- Prep ---------- */

function Prep({ fight, phase, onFight, onQuick }: { fight: FightDef; phase: Phase; onFight: () => void; onQuick: () => void }) {
  const s = useGame();
  useNow(1000);
  const you = buildYourSide(s, fight, phase);
  const them = buildTheirSide(fight);
  const rec = recommendedPower(fight);
  const ratio = you.power / rec;
  const verdict = ratio >= 1.1 ? 'strong' : ratio >= 0.95 ? 'even' : 'weak';
  const mins = Math.ceil(secondsToNextPhase(gameNow()) / 60);
  const quick = !isFirstWin(s, fight) || ratio >= QUICK_CLAIM_RATIO;
  const canQuick = ratio >= QUICK_CLAIM_RATIO;
  const empty = you.specs.length === 0;
  const leader = CHARACTERS[fight.leader]!;
  const rival = FACTIONS[AREAS[fight.area].rival];
  const rematch = !isFirstWin(s, fight);
  const cooldown = rematchCooldown(s, fight.id, gameNow());
  return (
    <>
      <div className="turf-scroll">
        <section className="rival" style={{ ['--c1' as string]: rival.colors[0], ['--c2' as string]: rival.colors[1] }}>
          <Portrait id={fight.leader} className="rival-portrait" />
          <div className="rival-text">
            <span className="rival-kicker">
              {fight.key === 'boss' ? 'Boss' : 'Lieutenant'} · {rival.name} <span className="zh">{rival.crest}</span>
              {rematch && <em>Rematch</em>}
            </span>
            <h2>
              {leader.name}
              <span className="zh">{leader.nameZh}</span>
            </h2>
            <p>{fight.intro}</p>
            <p className="rival-share">
              Market share {formatPercent(marketShare(s, fight.area))}
              {rematch
                ? cooldown > 0
                  ? ` · rematch rewards ready in ${Math.ceil(cooldown / 60000)} min`
                  : ' · rematches pay XP and a scratch card'
                : ''}
            </p>
          </div>
        </section>

        <section className="power-card" data-verdict={verdict}>
          <div className="power-nums">
            <div>
              <span className="k">Your power</span>
              <b>{you.power}</b>
            </div>
            <span className="vs">VS</span>
            <div style={{ textAlign: 'right' }}>
              <span className="k">Recommended</span>
              <b>{rec}</b>
            </div>
          </div>
          <div className="power-bar" aria-hidden>
            <i style={{ width: `${Math.min(100, (you.power / (rec * 1.5)) * 100)}%` }} />
            <span style={{ left: `${(1 / 1.5) * 100}%` }} />
          </div>
          <p className="power-verdict">
            {verdict === 'strong' ? 'You should win this.' : verdict === 'even' ? 'An even fight. It could go either way.' : 'Tough fight. You can still try: losing costs nothing.'}
          </p>
          <ul className="mods">
            {you.mods.map((m) => (
              <li key={m.label} data-good={m.good}>
                <span>{m.label}</span>
                <b>{m.good ? m.value : '—'}</b>
              </li>
            ))}
          </ul>
          <p className="phase-hint">
            {phase === 'day' ? `🌙 Nightfall in ${mins} min: gangsters get +20% at night.` : `☀ Dawn in ${mins} min: agents get +20% by day.`}
          </p>
        </section>

        <section className="lineup" aria-label="Rival lineup">
          <h3>
            Their side <span className="zh">{FACTIONS[AREAS[fight.area].rival].crest}</span>
          </h3>
          <div className="lineup-row">
            {them.specs.map((u, i) => (
              <div key={i} className="lineup-unit" data-cmd={u.slot >= 5}>
                <Portrait id={u.charId} face style={u.grunt ? gruntColors(u.faction) : undefined} />
                <span>{u.grunt ? u.name : CHARACTERS[u.charId]?.name}</span>
                <small>
                  {u.slot >= 5 ? 'Commander' : u.slot <= 1 ? 'Front' : 'Back'} · Lv {u.level}
                </small>
              </div>
            ))}
          </div>
        </section>

        <SquadBoard />
      </div>
      <footer className="turf-actions">
        {quick && (
          <button className="btn secondary" disabled={!canQuick} onClick={onQuick} title={`Needs ${QUICK_CLAIM_RATIO}× the recommended power`}>
            Quick {isFirstWin(s, fight) ? 'claim' : 'win'}
            <small>{canQuick ? 'skip the fight' : `at ${rec * QUICK_CLAIM_RATIO} power`}</small>
          </button>
        )}
        <button className="btn fight-btn" disabled={empty} onClick={onFight}>
          FIGHT! <span className="zh">開打</span>
        </button>
      </footer>
    </>
  );
}

function gruntColors(faction: string): CSSProperties {
  const [c1, c2] = FACTIONS[faction as keyof typeof FACTIONS]?.colors ?? ['#33276a', '#120c2e'];
  return { ['--c1' as string]: c1, ['--c2' as string]: c2 };
}

/* ---------- Battle ---------- */

interface Float {
  id: number;
  uid: number;
  text: string;
  kind: 'dmg' | 'crit' | 'heal' | 'shield' | 'status';
  born: number;
}

interface Impact {
  id: number;
  text: string;
  tone: 'hit' | 'big' | 'win' | 'lose' | 'skill';
  born: number;
}

const STEP = 0.05;
const ULT_PAUSE_MS = 1300;
const END_PAUSE_MS = 1600;

function BattleScreen({ input, seed, fight, onEnd }: { input: BattleInput; seed: number; fight: FightDef; onEnd: (outcome: 'win' | 'lose') => void }) {
  const s = useGame();
  const auto = s.settings.battleAuto;
  const speed = s.settings.battleSpeed;
  const debug = useDebugSpeed();
  const battle = useRef<Battle | null>(null);
  if (!battle.current) battle.current = createBattle(input, seed, auto);
  const b = battle.current;
  b.auto = auto;

  const [, redraw] = useReducer((x: number) => x + 1, 0);
  const anim = useRef(new Map<number, { lunge: number; hit: number; ko?: number }>());
  const floats = useRef<Float[]>([]);
  const impact = useRef<Impact | null>(null);
  const ult = useRef<{ uid: number; until: number } | null>(null);
  const ended = useRef<number | null>(null);
  const nextId = useRef(1);
  const speedRef = useRef(speed * debug);
  speedRef.current = speed * debug;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const handle = (events: BattleEvent[], now: number) => {
    for (const e of events) {
      const mark = (uid: number, k: 'lunge' | 'hit') => {
        const a = anim.current.get(uid) ?? { lunge: 0, hit: 0 };
        a[k] = now;
        anim.current.set(uid, a);
      };
      const float = (uid: number, text: string, kind: Float['kind']) => {
        floats.current.push({ id: nextId.current++, uid, text, kind, born: now });
      };
      const shout = (text: string, tone: Impact['tone']) => {
        if (impact.current && now - impact.current.born < 450 && tone !== 'win' && tone !== 'lose') return;
        impact.current = { id: nextId.current++, text, tone, born: now };
      };
      switch (e.kind) {
        case 'attack':
          mark(e.uid, 'lunge');
          break;
        case 'damage':
          mark(e.uid, 'hit');
          float(e.uid, `${e.crit ? '' : '-'}${e.amount}`, e.crit ? 'crit' : 'dmg');
          if (e.crit) shout('爆!', 'big');
          else if (e.big) shout('砰!', 'hit');
          break;
        case 'heal':
          float(e.uid, `+${e.amount}`, 'heal');
          break;
        case 'shield':
          float(e.uid, `🛡${e.amount}`, 'shield');
          break;
        case 'status':
          float(e.uid, e.text, 'status');
          break;
        case 'buyout':
          float(e.uid, 'BOUGHT OUT', 'status');
          shout('買斷!', 'skill');
          break;
        case 'revive':
          float(e.uid, 'BACK UP', 'heal');
          break;
        case 'spawn':
          float(e.uid, 'JOINS', 'status');
          break;
        case 'skill': {
          mark(e.uid, 'lunge');
          const u = b.units.find((x) => x.uid === e.uid);
          if (e.ultimate) ult.current = { uid: e.uid, until: now + ULT_PAUSE_MS };
          else if (u) float(e.uid, CHARACTERS[u.spec.charId]?.skill.name ?? 'Skill', 'status');
          break;
        }
        case 'ko': {
          const a = anim.current.get(e.uid) ?? { lunge: 0, hit: 0 };
          anim.current.set(e.uid, { ...a, ko: now });
          break;
        }
        case 'end':
          ended.current = now;
          shout(e.outcome === 'win' ? '勝!' : '敗', e.outcome);
          break;
      }
    }
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const bt = battle.current!;
      if (ult.current && now >= ult.current.until) ult.current = null;
      if (!ult.current && !bt.outcome) {
        acc += dt * speedRef.current;
        while (acc >= STEP && !bt.outcome && !ult.current) {
          acc -= STEP;
          handle(stepBattle(bt, STEP), now);
        }
      }
      floats.current = floats.current.filter((f) => now - f.born < 900);
      if (impact.current && now - impact.current.born > (ended.current ? END_PAUSE_MS + 400 : 700)) impact.current = null;
      if (ended.current && now - ended.current > END_PAUSE_MS) {
        onEndRef.current(bt.outcome!);
        return;
      }
      redraw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = performance.now();
  const tap = (u: Unit) => {
    if (auto || u.side !== 'you') return;
    if (fire(b, u.uid)) handle(b.events, performance.now());
  };
  // Called-in runners leave the board shortly after they drop, so the front row doesn't fill with KOs.
  const shown = (u: Unit) => u.alive || u.spec.slot >= 0 || now - (anim.current.get(u.uid)?.ko ?? 0) < 700;
  const group = (side: 'you' | 'them', row: Unit['row']) => b.units.filter((u) => u.side === side && u.row === row && shown(u));
  const rowEl = (side: 'you' | 'them', row: Unit['row']) => {
    const units = group(side, row);
    if (units.length === 0) return <div className="b-row" data-row={row} data-empty="true" />;
    return (
      <div className="b-row" data-row={row}>
        {units.map((u) => (
          <BattleUnit key={u.uid} u={u} now={now} anim={anim.current.get(u.uid)} floats={floats.current.filter((f) => f.uid === u.uid)} manual={!auto} onTap={() => tap(u)} />
        ))}
      </div>
    );
  };
  const left = Math.max(0, Math.ceil(b.input.timeLimit - b.t));
  const ultUnit = ult.current ? b.units.find((u) => u.uid === ult.current!.uid) : null;
  const area = AREAS[fight.area];
  const bg = artUrl('areas', `${fight.area}_${input.night ? 'night' : 'day'}`);

  return (
    <div className="battle" data-night={input.night}>
      <div className="battle-bg" aria-hidden>
        {bg ? <img src={bg} alt="" /> : <span>{area.nameZh}</span>}
      </div>
      <header className="battle-bar">
        <span className="battle-clock" data-low={left <= 10}>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </span>
        <div className="seg" role="group" aria-label="Battle speed">
          {([1, 2] as const).map((v) => (
            <button key={v} aria-pressed={speed === v} onClick={() => update((st) => ({ ...st, settings: { ...st.settings, battleSpeed: v } }))}>
              {v}×
            </button>
          ))}
        </div>
        <button
          className="auto-btn"
          aria-pressed={auto}
          onClick={() => update((st) => ({ ...st, settings: { ...st.settings, battleAuto: !st.settings.battleAuto } }))}
        >
          AUTO {auto ? 'ON' : 'OFF'}
        </button>
      </header>
      <div className="b-side" data-side="them">
        {rowEl('them', 'cmd')}
        {rowEl('them', 'back')}
        {rowEl('them', 'front')}
      </div>
      <div className="b-mid">{!auto && !b.outcome && <span className="manual-hint">Tap a glowing card to fire its skill</span>}</div>
      <div className="b-side" data-side="you">
        {rowEl('you', 'front')}
        {rowEl('you', 'back')}
        {rowEl('you', 'cmd')}
      </div>
      {impact.current && (
        <div key={impact.current.id} className="impact" data-tone={impact.current.tone}>
          {impact.current.text}
        </div>
      )}
      {ultUnit && (
        <div className="ult" data-side={ultUnit.side}>
          <div className="ult-card">
            <Portrait id={ultUnit.spec.charId} />
          </div>
          <div className="ult-text">
            <small>ULTIMATE 大絕</small>
            <b>{CHARACTERS[ultUnit.spec.charId]?.skill.name}</b>
            <span>{ultUnit.spec.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function BattleUnit({ u, now, anim, floats, manual, onTap }: { u: Unit; now: number; anim?: { lunge: number; hit: number }; floats: Float[]; manual: boolean; onTap: () => void }) {
  const hp = Math.max(0, u.hp / u.maxHp);
  const sh = Math.min(1, u.shield / u.maxHp);
  const lunge = anim && now - anim.lunge < 220;
  const hit = anim && now - anim.hit < 260;
  const ready = manual && u.side === 'you' && u.alive && u.charge >= 1;
  const status = [u.stun > 0 && 'STUN', u.taunt > 0 && 'TAUNT', u.strip > 0 && 'EXPOSED', u.weak > 0 && 'WEAK', u.buff > 0 && 'POWER', u.haste > 0 && 'FAST'].filter(Boolean) as string[];
  return (
    <button
      className="bu"
      data-side={u.side}
      data-cmd={u.commander}
      data-alive={u.alive}
      data-lunge={!!lunge}
      data-hit={!!hit}
      data-ready={ready}
      data-stun={u.stun > 0}
      onClick={onTap}
      tabIndex={ready ? 0 : -1}
      aria-label={`${u.spec.name}, ${Math.ceil(u.hp)} of ${u.maxHp} health${ready ? ', skill ready' : ''}`}
    >
      <div className="bu-card">
        <Portrait id={u.spec.charId} face style={u.spec.grunt ? gruntColors(u.spec.faction) : undefined} />
        {u.commander && <span className="bu-crown">{u.spec.slot === 6 ? 'BOSS' : 'LT'}</span>}
        {status.length > 0 && u.alive && <span className="bu-status">{status[0]}</span>}
        {!u.alive && <span className="bu-ko">KO</span>}
      </div>
      <span className="bu-name">{u.spec.name}</span>
      <span className="bu-hp">
        <i style={{ width: `${hp * 100}%` }} data-low={hp < 0.3} />
        {sh > 0 && <b style={{ width: `${sh * 100}%` }} />}
      </span>
      <span className="bu-charge" data-full={u.charge >= 1}>
        <i style={{ width: `${u.charge * 100}%` }} />
      </span>
      {floats.map((f) => (
        <span key={f.id} className="float" data-kind={f.kind}>
          {f.text}
        </span>
      ))}
    </button>
  );
}

/* ---------- Results ---------- */

function Results({ fight, result, hints, onAgain, onClose }: { fight: FightDef; result: FightResult; hints: string[]; onAgain: () => void; onClose: () => void }) {
  const win = result.outcome === 'win';
  const [show, setShow] = useState(!!result.fireworks);
  const leader = CHARACTERS[fight.leader]!;
  const area = AREAS[fight.area];
  const joined = result.joined ? CHARACTERS[result.joined] : null;
  const rows: { icon: string; text: string }[] = [];
  if (result.cooling) rows.push({ icon: '⏳', text: 'Rematch rewards are cooling down. Fight again in a few minutes for XP and a scratch card.' });
  if (result.claimed) rows.push({ icon: '🏮', text: `${area.name} is yours: income ×2 on every lot here, lots you don't own cost 25% less, and no more shakedowns.` });
  if (result.indexJump) rows.push({ icon: '指', text: `Price index +${result.indexJump.toFixed(1)}` });
  if (result.underdog) rows.push({ icon: '面', text: 'Underdog win, right at the threshold: +1 Face when you cash out' });
  for (const id of result.lotsUnlocked) rows.push({ icon: '🔓', text: `${ALL_LOTS[id]?.name} is for sale.` });
  if (result.slotsUnlocked) rows.push({ icon: '➕', text: `New squad slot: ${SLOT_NAMES[result.slotsUnlocked - 3]}.` });
  if (result.starUp) rows.push({ icon: '★', text: `${CHARACTERS[result.starUp.charId]?.name} is now ★${result.starUp.stars}` });
  for (const f of result.binderPages) rows.push({ icon: '冊', text: `Binder page complete: ${FACTIONS[f].name}. +1 lottery ticket` });
  if (result.incense) rows.push({ icon: '香', text: `+${result.incense} incense money 香油錢 (for temple draws)` });
  const bossTickets = result.lottery - result.binderPages.length;
  if (bossTickets > 0) rows.push({ icon: '樂', text: `+${bossTickets} lottery ticket 樂透` });
  if (result.scratch) rows.push({ icon: '刮', text: `+${result.scratch} scratch card 刮刮樂` });
  if (result.xp) rows.push({ icon: '★', text: `+${result.xp} XP for everyone in the squad` });
  for (const l of result.levelUps) rows.push({ icon: '▲', text: `${CHARACTERS[l.charId]?.name} reached Lv ${l.level}` });
  const nextArea = AREA_ORDER[AREA_ORDER.indexOf(area.id) + 1];
  if (result.claimed && nextArea && !AREAS[nextArea].secret) rows.push({ icon: '🚇', text: `${AREAS[nextArea].name} is open on the map.` });
  if (result.claimed && area.id === 'wanhua') rows.push({ icon: '盆', text: 'Cash-out 金盆洗手 is open in the Office.' });

  return (
    <div className="turf-scroll result" data-outcome={result.outcome}>
      {show && <Fireworks full={result.fireworks === 'full'} onClose={() => setShow(false)} />}
      <div className="stamp" aria-hidden>
        {win ? '勝' : '敗'}
      </div>
      <h2 className="result-title">
        {win ? (result.first ? `${leader.name} backs down!` : 'Rematch won') : 'They held out.'}
      </h2>
      {!win && <p className="result-sub">Nothing lost. Your crew learned something.</p>}
      {joined && (
        <div className="join">
          <div className="card" data-rarity={joined.rarity}>
            <Portrait id={joined.id} />
          </div>
          <div>
            <small>JOINS YOUR CREW</small>
            <b>
              {joined.name} <span className="zh">{joined.nameZh}</span>
            </b>
            <span>
              {joined.rarity} · {joined.skill.name}: {joined.skill.text}
            </span>
          </div>
        </div>
      )}
      <ul className="rewards">
        {rows.map((r) => (
          <li key={r.text}>
            <span className="ri">{r.icon}</span>
            {r.text}
          </li>
        ))}
      </ul>
      {!win && (
        <div className="hints">
          <h3>Try this</h3>
          {hints.map((h) => (
            <p key={h}>{h}</p>
          ))}
        </div>
      )}
      <div className="result-actions">
        {!win && (
          <button className="btn" onClick={onAgain}>
            Try again
          </button>
        )}
        <button className={`btn ${win ? '' : 'secondary'}`} onClick={onClose}>
          {win ? 'Continue' : 'Back to Wanhua'}
        </button>
      </div>
    </div>
  );
}

/* ---------- Shell ---------- */

export function TurfWar({ fightId, onClose }: { fightId: string; onClose: () => void }) {
  const fight = FIGHTS[fightId]!;
  const now = useNow(1000);
  const phase = phaseAt(now);
  const [stage, setStage] = useState<Stage>({ kind: 'prep' });
  const leader = CHARACTERS[fight.leader]!;

  const start = () => {
    const st = store.get();
    setStage({
      kind: 'battle',
      input: battleInputFor(st, fightId, phase),
      seed: Math.floor(Math.random() * 2 ** 31),
      phase,
      power: buildYourSide(st, fight, phase).power,
    });
  };
  const finish = (outcome: 'win' | 'lose', fightPhase: Phase, power: number) => {
    const before = store.get();
    const { state, result } = resolveFight(before, fightId, outcome, gameNow());
    update(() => state);
    setStage({ kind: 'result', result, hints: outcome === 'lose' ? lossHints(before, fight, fightPhase, power) : [] });
    navigator.vibrate?.(outcome === 'win' ? [20, 40, 60] : 30);
  };

  const host = document.querySelector('.phone') ?? document.body;
  return createPortal(
    <div className="turf" role="dialog" aria-modal="true" aria-label={`Turf War against ${leader.name}`}>
      {stage.kind !== 'battle' && (
        <header className="turf-head">
          <button className="back-btn" onClick={onClose}>
            ← {stage.kind === 'result' ? 'Done' : 'Back'}
          </button>
          <div className="turf-title">
            TURF WAR <span className="zh">搶地盤</span>
          </div>
        </header>
      )}
      {stage.kind === 'prep' && (
        <Prep fight={fight} phase={phase} onFight={start} onQuick={() => finish('win', phase, buildYourSide(store.get(), fight, phase).power)} />
      )}
      {stage.kind === 'battle' && (
        <BattleScreen input={stage.input} seed={stage.seed} fight={fight} onEnd={(o) => finish(o, stage.phase, stage.power)} />
      )}
      {stage.kind === 'result' && <Results fight={fight} result={stage.result} hints={stage.hints} onAgain={() => setStage({ kind: 'prep' })} onClose={onClose} />}
    </div>,
    host,
  );
}
