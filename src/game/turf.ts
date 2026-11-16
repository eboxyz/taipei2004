/** Turf War glue: squads, modifiers, power and fight results on top of the game state. */
import { unitPower, type BattleInput, type UnitSpec } from './battle';
import { addXp, classOf, statsOf, type Stats } from './characters';
import { ALL_LOTS, AREAS } from './content/areas';
import { CHARACTERS, ROLES } from './content/characters';
import { FIGHTS, type EnemyDef, type FightDef } from './content/fights';
import { skillOf } from './content/skills';
import {
  BOSS_SLOT,
  FACTION_BONUS,
  FIGHT_XP_FIRST_WIN,
  FIGHT_XP_LOSS,
  FIGHT_XP_WIN,
  HOME_TURF_GRIT,
  LT_SLOT,
  PHASE_BONUS,
  SHARE_BONUS_PER_STEP,
  SHARE_THRESHOLDS,
  SQUAD_SIZE,
} from './constants';
import { marketShare } from './economy';
import { payBinderPages } from './binder';
import { addCard } from './gacha';
import type { FactionId, GameState, Phase, Squad } from './types';

export type SlotKind = 'front' | 'back' | 'lt' | 'boss';

export function slotKind(slot: number): SlotKind {
  if (slot <= 1) return 'front';
  if (slot <= 4) return 'back';
  return slot === LT_SLOT ? 'lt' : 'boss';
}

export function slotUnlocked(state: GameState, slot: number): boolean {
  return slot < state.meta.squadSlots;
}

/** Whether a character may stand in a squad slot. */
export function canFill(charId: string, slot: number): boolean {
  const def = CHARACTERS[charId];
  if (!def?.role || def.rarity === 'NPC') return false;
  const row = ROLES[def.role].row;
  switch (slotKind(slot)) {
    case 'front':
      return row !== 'back';
    case 'back':
      return row !== 'front';
    case 'lt':
      return def.rarity === 'SR' || def.rarity === 'SSR';
    case 'boss':
      return def.rarity === 'SSR';
  }
}

export function basePower(state: GameState, id: string, slot = 0): number {
  const st = statsOf(id, state.characters[id]);
  return unitPower({ ...st, slot });
}

const ARMY_FRONT = [0, 1];
const ARMY_BACK = [2, 3, 4];

/** Your strongest legal squad: army first, then commanders (swapping a card back if that fills more slots). */
export function bestSquad(state: GameState): Squad {
  const squad: Squad = Array<string | null>(SQUAD_SIZE).fill(null);
  const owned = Object.keys(state.characters)
    .filter((id) => CHARACTERS[id]?.role)
    .sort((a, b) => basePower(state, b) - basePower(state, a));
  const used = new Set<string>();
  const open = (slots: number[]) => slots.filter((i) => slotUnlocked(state, i) && !squad[i]);
  const rowOf = (id: string) => ROLES[CHARACTERS[id]!.role!].row;

  // Front-only and back-only roles take their own rows first, then flexible runners fill gaps.
  for (const pass of ['fixed', 'either'] as const) {
    for (const id of owned) {
      if (used.has(id)) continue;
      const row = rowOf(id);
      if ((pass === 'fixed') === (row === 'either')) continue;
      const slot = [...(row !== 'back' ? open(ARMY_FRONT) : []), ...(row !== 'front' ? open(ARMY_BACK) : [])][0];
      if (slot === undefined) continue;
      squad[slot] = id;
      used.add(id);
    }
  }

  // Boss-class cards with a signature aura (Procession, Permits…) make the best commanders.
  const commandScore = (id: string) => (skillOf(id).aura ? 1000 : 0) + basePower(state, id);
  for (const cmd of [BOSS_SLOT, LT_SLOT]) {
    if (!slotUnlocked(state, cmd)) continue;
    let best: { id: string; from: number; sub: string | null } | null = null;
    for (const id of owned) {
      if (!canFill(id, cmd)) continue;
      const from = squad.indexOf(id);
      if (from >= 5) continue;
      // A card already in the army can step up only if a bench card takes its place.
      const sub = from >= 0 ? owned.find((b) => !used.has(b) && canFill(b, from)) ?? null : null;
      if (from >= 0 && !sub) continue;
      if (!best || commandScore(id) > commandScore(best.id)) best = { id, from, sub };
    }
    if (!best) continue;
    squad[cmd] = best.id;
    used.add(best.id);
    if (best.from >= 0 && best.sub) {
      squad[best.from] = best.sub;
      used.add(best.sub);
    }
  }
  return squad;
}

/** The squad that will actually fight: auto-built, or yours with anything invalid cleared. */
export function effectiveSquad(state: GameState): Squad {
  if (state.squadAuto) return bestSquad(state);
  return state.squad.map((id, i) => (id && state.characters[id] && slotUnlocked(state, i) && canFill(id, i) ? id : null));
}

/** Puts a character in a slot (or clears it). Swaps with their old slot when that's legal. */
export function setSquadSlot(state: GameState, slot: number, charId: string | null): GameState {
  const squad = [...effectiveSquad(state)];
  if (charId) {
    if (!state.characters[charId] || !canFill(charId, slot) || !slotUnlocked(state, slot)) return state;
    const from = squad.indexOf(charId);
    const displaced = squad[slot] ?? null;
    if (from >= 0) squad[from] = displaced && canFill(displaced, from) ? displaced : null;
  }
  squad[slot] = charId;
  return { ...state, squad, squadAuto: false };
}

export function autoFillSquad(state: GameState): GameState {
  return { ...state, squad: bestSquad(state), squadAuto: true };
}

/* ---------- Modifiers ---------- */

export interface Modifier {
  label: string;
  value: string;
  good: boolean;
}

export interface SideBuild {
  specs: UnitSpec[];
  mods: Modifier[];
  power: number;
}

const pct = (x: number) => `+${Math.round(x * 100)}%`;

export function shareSteps(state: GameState, fight: FightDef): number {
  const over = marketShare(state, fight.area) - SHARE_THRESHOLDS[fight.key];
  return Math.max(0, Math.floor(over / 0.05 + 1e-9));
}

export function buildYourSide(state: GameState, fight: FightDef, phase: Phase): SideBuild {
  const squad = effectiveSquad(state);
  const ids = squad.filter((x): x is string => !!x);
  const mods: Modifier[] = [];

  const rave = squad[LT_SLOT] === 'a_tai' || squad[BOSS_SLOT] === 'a_tai';
  const nightBonus = PHASE_BONUS * (rave ? 2 : 1);
  const hasAgents = ids.some((id) => classOf(id) === 'agent');
  const hasGangsters = ids.some((id) => classOf(id) === 'gangster');
  if (phase === 'day') mods.push({ label: '☀ Daytime: agents', value: pct(PHASE_BONUS), good: hasAgents });
  else mods.push({ label: `🌙 Night: gangsters${rave ? ' (Rave ×2)' : ''}`, value: pct(nightBonus), good: hasGangsters });

  const steps = shareSteps(state, fight);
  const share = steps * SHARE_BONUS_PER_STEP;
  if (steps > 0) mods.push({ label: `Market share above ${Math.round(SHARE_THRESHOLDS[fight.key] * 100)}%`, value: pct(share), good: true });

  const counts = new Map<string, number>();
  for (const id of ids) {
    const f = CHARACTERS[id]!.faction;
    if (f !== 'independent') counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const most = Math.max(0, ...counts.values());
  const faction = FACTION_BONUS[Math.min(3, most)] ?? 0;
  if (faction > 0) mods.push({ label: `Same faction ×${most}`, value: pct(faction), good: true });

  const guards = AREAS[fight.area].lots.filter((l) => state.lots[l.id]?.security).length;
  const turf = guards * HOME_TURF_GRIT;
  if (turf > 0) mods.push({ label: `Home Turf: ${guards} Security posted`, value: `${pct(turf)} Grit`, good: true });

  const specs: UnitSpec[] = [];
  squad.forEach((id, slot) => {
    if (!id) return;
    const def = CHARACTERS[id]!;
    const cs = state.characters[id];
    const base = statsOf(id, cs);
    const cls = classOf(id);
    const phaseMult = 1 + (phase === 'day' ? (cls === 'agent' ? PHASE_BONUS : 0) : cls === 'gangster' ? nightBonus : 0);
    const m = phaseMult * (1 + share) * (1 + faction);
    specs.push({
      charId: id,
      slot,
      level: cs?.level ?? 1,
      stars: cs?.stars ?? 1,
      muscle: base.muscle * m,
      grit: base.grit * m * (1 + turf),
      business: base.business * m,
      name: def.name,
      nameZh: def.nameZh,
      faction: def.faction,
    });
  });
  return { specs, mods, power: specs.reduce((s, u) => s + unitPower(u), 0) };
}

function enemySpec(fight: FightDef, e: EnemyDef): UnitSpec {
  const def = CHARACTERS[e.id]!;
  const st: Stats = statsOf(e.id, { level: e.level, xp: 0, stars: 1 });
  const k = e.scale ?? 1;
  return {
    charId: e.id,
    slot: e.slot,
    level: e.level,
    stars: 1,
    muscle: st.muscle * k,
    grit: st.grit * k,
    business: st.business * k,
    name: e.name ?? def.name,
    nameZh: e.nameZh ?? def.nameZh,
    faction: e.grunt ? AREAS[fight.area].rival : def.faction,
    grunt: e.grunt,
  };
}

export function buildTheirSide(fight: FightDef): SideBuild {
  const specs = fight.units.map((e) => enemySpec(fight, e));
  return { specs, mods: [], power: specs.reduce((s, u) => s + unitPower(u), 0) };
}

export function recommendedPower(fight: FightDef): number {
  return fight.recommended;
}

export function battleInputFor(state: GameState, fightId: string, phase: Phase): BattleInput {
  const fight = FIGHTS[fightId]!;
  const you = buildYourSide(state, fight, phase);
  const them = buildTheirSide(fight);
  const kunbo = you.specs.find((s) => s.charId === 'kun_bo' && s.slot >= 5);
  return {
    you: you.specs,
    them: them.specs,
    timeLimit: fight.timeLimit,
    night: phase === 'night',
    runner: {
      them: fight.runner ? enemySpec(fight, fight.runner) : undefined,
      // Your own Kun-bo calls in agency runners.
      you: kunbo ? { ...enemySpec(fight, { id: 'street_punk', level: kunbo.level, slot: -1, grunt: true }), name: 'Troupe Runner', nameZh: '陣頭', faction: 'agency' } : undefined,
    },
  };
}

/* ---------- Results ---------- */

export interface FightResult {
  outcome: 'win' | 'lose';
  first: boolean;
  joined: string | null;
  lotsUnlocked: string[];
  claimed: boolean;
  slotsUnlocked: number | null;
  starUp: { charId: string; stars: number } | null;
  binderPages: FactionId[];
  incense: number;
  lottery: number;
  scratch: number;
  xp: number;
  levelUps: { charId: string; level: number }[];
}

export function isFirstWin(state: GameState, fight: FightDef): boolean {
  return !state.areas[fight.area][fight.key];
}

/** Applies a finished fight to the game state. Losing only ever gives XP. */
export function resolveFight(state: GameState, fightId: string, outcome: 'win' | 'lose'): { state: GameState; result: FightResult } {
  const fight = FIGHTS[fightId]!;
  const first = outcome === 'win' && isFirstWin(state, fight);
  const xp = outcome === 'lose' ? FIGHT_XP_LOSS : first ? FIGHT_XP_FIRST_WIN : FIGHT_XP_WIN;
  const result: FightResult = {
    outcome,
    first,
    joined: null,
    lotsUnlocked: [],
    claimed: false,
    slotsUnlocked: null,
    starUp: null,
    binderPages: [],
    incense: 0,
    lottery: 0,
    scratch: 0,
    xp,
    levelUps: [],
  };

  const characters = { ...state.characters };
  for (const id of effectiveSquad(state)) {
    if (!id || !characters[id]) continue;
    const { cs, gained } = addXp(characters[id]!, xp);
    characters[id] = cs;
    if (gained > 0) result.levelUps.push({ charId: id, level: cs.level });
  }
  let s: GameState = { ...state, characters };

  if (outcome === 'lose') {
    return { state: { ...s, stats: { ...s.stats, fightsLost: s.stats.fightsLost + 1 } }, result };
  }

  s = { ...s, stats: { ...s.stats, fightsWon: s.stats.fightsWon + 1 } };
  if (!first) {
    result.scratch = 1;
    return { state: { ...s, currencies: { ...s.currencies, scratch: s.currencies.scratch + 1 } }, result };
  }

  result.incense = fight.rewards.incense;
  result.lottery = fight.rewards.lottery;
  result.claimed = fight.key === 'boss';
  result.lotsUnlocked = AREAS[fight.area].lots.filter((l) => l.lock === fight.key).map((l) => l.id);
  // The leader joins your crew; beating them again in a later run counts as a duplicate (+1 star).
  const added = addCard(s, fight.leader);
  s = added.state;
  if (added.gain.isNew) result.joined = fight.leader;
  else if (added.gain.starsAfter > added.gain.starsBefore) result.starUp = { charId: fight.leader, stars: added.gain.starsAfter };
  const paid = payBinderPages(s);
  s = paid.state;
  result.binderPages = paid.pages;
  result.lottery += paid.pages.length;
  if (fight.unlockSlots > s.meta.squadSlots) {
    result.slotsUnlocked = fight.unlockSlots;
    s = { ...s, meta: { ...s.meta, squadSlots: fight.unlockSlots } };
  }
  s = {
    ...s,
    areas: { ...s.areas, [fight.area]: { ...s.areas[fight.area], [fight.key]: true } },
    currencies: {
      ...s.currencies,
      incense: s.currencies.incense + result.incense,
      lottery: s.currencies.lottery + result.lottery,
    },
  };
  // A hand-built squad keeps its picks; drop the newcomer into an open slot if one fits.
  if (!s.squadAuto && result.joined) {
    const squad = [...s.squad];
    const slot = squad.findIndex((id, i) => !id && slotUnlocked(s, i) && canFill(result.joined!, i));
    if (slot >= 0) {
      squad[slot] = result.joined;
      s = { ...s, squad };
    }
  }
  return { state: s, result };
}

export function lotName(id: string): string {
  return ALL_LOTS[id]?.name ?? id;
}
