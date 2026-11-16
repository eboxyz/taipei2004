/** Turf War glue: squads, modifiers, power and fight results on top of the game state. */
import { auraOf, unitPower, type BattleInput, type UnitSpec } from './battle';
import { addXp, classOf, statsOf, type Stats } from './characters';
import { ALL_LOTS, AREAS } from './content/areas';
import { CHARACTERS, ROLES } from './content/characters';
import { FIGHTS, type EnemyDef, type FightDef } from './content/fights';
import { skillOf, type AuraKind } from './content/skills';
import {
  BOSS_SLOT,
  CLAIM_INDEX,
  FACTION_BONUS,
  FIGHT_XP_FIRST_WIN,
  FIGHT_XP_LOSS,
  FIGHT_XP_WIN,
  LT_SLOT,
  PHASE_BONUS,
  SHARE_BONUS_PER_STEP,
  SHARE_THRESHOLDS,
  REMATCH_COOLDOWN_MS,
  SQUAD_SIZE,
  UNDERDOG_MARGIN,
} from './constants';
import { marketShare } from './economy';
import { perk } from './perks';
import { payBinderPages } from './binder';
import { addCard } from './gacha';
import type { FactionId, GameState, Phase, Role, Squad, SquadStyle } from './types';
export type { SquadStyle } from './types';

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

/** The three one-tap squad fills. None of them stays on: the squad keeps whatever you last set. */
export const SQUAD_STYLES: Record<SquadStyle, { name: string; zh: string; text: string }> = {
  offense: { name: 'Offensive', zh: '攻', text: 'Muscle first, with a sturdy front-row anchor and damage or speed support' },
  defense: { name: 'Defensive', zh: '守', text: 'Grit, healers and shields first, with health and shield support' },
  balanced: { name: 'All-around', zh: '平衡', text: 'Strongest army by total power, with bench commanders for support' },
};

/** Which style each commander aura suits. Auras that help any squad are null. */
const AURA_STYLE: Record<AuraKind, SquadStyle | null> = {
  grit: 'defense',
  staff_meal: 'defense',
  insurance: 'defense',
  daddys_money: 'defense',
  procession: 'defense',
  last_call: 'defense',
  muscle: 'offense',
  speed: 'offense',
  tactics: 'offense',
  lowball: 'offense',
  red_tape: 'offense',
  scooter_crew: 'offense',
  rave: 'offense',
  lucky_streak: 'offense',
  permits: null,
  old_money: null,
};

/** Roles each style leans toward (a multiplier on the card's score). */
const STYLE_ROLE: Record<SquadStyle, Partial<Record<Role, number>>> = {
  offense: { dashou: 1.3, xiaodi: 1.2, daishu: 1.2, junshi: 1.1 },
  defense: { weishi: 1.05, dianzhang: 1.5, kuaiji: 1.1 },
  balanced: {},
};

/** Relative army-wide aura utility used to rank bench commanders. */
const AURA_VALUE: Record<AuraKind, number> = {
  grit: 15, muscle: 15, speed: 15, tactics: 20, lowball: 15,
  red_tape: 10, staff_meal: 25, insurance: 15, procession: 30,
  scooter_crew: 25, last_call: 35, daddys_money: 20, permits: 25,
  old_money: 30, rave: 20, lucky_streak: 25,
};

function styleScore(state: GameState, id: string, style: SquadStyle): number {
  // Summon is especially valuable as a commander aura; it is less frequent
  // as an army skill, so raw stats overstate the summoner's fighting value.
  const skill = skillOf(id).kind;
  const armySkill = skill === 'summon' ? 0.65 : 1;
  if (style === 'balanced') return basePower(state, id) * armySkill;
  const st = statsOf(id, state.characters[id]);
  const raw = style === 'offense' ? st.muscle * 1.6 + st.grit * 0.6 + st.business * 0.8 : st.muscle * 0.9 + st.grit * 1.3 + st.business * 0.8;
  return raw * (STYLE_ROLE[style][CHARACTERS[id]!.role!] ?? 1) * armySkill;
}

/** A legal squad in the given style: army first, then commanders (swapping a card back if that fills more slots). */
export function bestSquad(state: GameState, style: SquadStyle = 'balanced'): Squad {
  const squad: Squad = Array<string | null>(SQUAD_SIZE).fill(null);
  const owned = Object.keys(state.characters)
    .filter((id) => CHARACTERS[id]?.role)
    .sort((a, b) => styleScore(state, b, style) - styleScore(state, a, style));
  const used = new Set<string>();
  // Compare legal front-row combinations, then take the best remaining back
  // row. Flexible runners compete on score rather than always coming last.
  const frontSlots = ARMY_FRONT.filter((i) => slotUnlocked(state, i));
  const backSlots = ARMY_BACK.filter((i) => slotUnlocked(state, i));
  const fronts = owned.filter((id) => canFill(id, 0));
  const choices: string[][] = [[]];
  for (const id of fronts) {
    for (const choice of [...choices]) if (choice.length < frontSlots.length) choices.push([...choice, id]);
  }
  const needsAnchor = style === 'offense' && frontSlots.length === 2 && fronts.some((id) => CHARACTERS[id]!.role === 'weishi');
  let army: { front: string[]; back: string[]; count: number; score: number } = { front: [], back: [], count: 0, score: 0 };
  for (const front of choices) {
    // Until an SSR enforcer can anchor the rush, keep one bouncer to soak hits.
    if (needsAnchor && !front.some((id) => CHARACTERS[id]!.role === 'weishi' || CHARACTERS[id]!.rarity === 'SSR')) continue;
    const back = owned.filter((id) => !front.includes(id) && canFill(id, 2)).slice(0, backSlots.length);
    const ids = [...front, ...back];
    const score = ids.reduce((sum, id) => sum + styleScore(state, id, style), 0);
    if (ids.length > army.count || (ids.length === army.count && score > army.score)) army = { front, back, count: ids.length, score };
  }
  for (const [ids, slots] of [[army.front, frontSlots], [army.back, backSlots]] as const) {
    ids.forEach((id, i) => { squad[slots[i]!] = id; used.add(id); });
  }

  // Commanders never make basic attacks: keep the chosen army intact whenever
  // a legal bench commander exists. Boss goes first to reserve scarce SSR cards.
  const commandScore = (id: string) => {
    const skill = skillOf(id);
    const aura = auraOf({ skill, role: CHARACTERS[id]!.role! });
    const st = statsOf(id, state.characters[id]);
    // Relative army-wide benefit plus the doubled ultimate's output. Role auras
    // matter even on a low-level card; stats only break ties within that value.

    const stat = classOf(id) === 'agent' ? st.business : st.muscle;
    const ultimate = stat * skill.mult * (skill.n ?? 1) * 2 / 24;
    return (AURA_STYLE[aura] === style ? 10000 : 0) + (AURA_VALUE[aura] + (style === 'defense' && aura === 'grit' ? 5 : 0)) * 100 + ultimate + st.grit * 0.1;
  };
  for (const cmd of [BOSS_SLOT, LT_SLOT]) {
    if (!slotUnlocked(state, cmd)) continue;
    const bench = owned.filter((id) => !used.has(id) && canFill(id, cmd));
    bench.sort((a, b) => commandScore(b) - commandScore(a));
    const commander = bench[0];
    if (commander) {
      squad[cmd] = commander;
      used.add(commander);
      continue;
    }
    // Only fall back to promotion when no legal bench card exists. Minimize
    // lost fighting value, and require a legal replacement to keep the army full.
    const promotions = owned.flatMap((id) => {
      const from = squad.indexOf(id);
      if (from < 0 || from >= LT_SLOT || !canFill(id, cmd)) return [];
      const sub = owned.find((b) => !used.has(b) && canFill(b, from));
      return sub ? [{ id, from, sub }] : [];
    });
    promotions.sort((a, b) => styleScore(state, a.id, style) - styleScore(state, b.id, style) || commandScore(b.id) - commandScore(a.id));
    const promoted = promotions[0];
    if (promoted) {
      squad[cmd] = promoted.id;
      squad[promoted.from] = promoted.sub;
      used.add(promoted.sub);
    }
  }
  // A promotion's replacement should not inherit a higher-priority position.
  // Preserve style ordering after backfilling. Put back-row attackers before
  // support in the steady builds, protecting healers and shields at the rear.
  for (const slots of [ARMY_FRONT, ARMY_BACK]) {
    const ids = slots.map((slot) => squad[slot]).filter((id): id is string => !!id);
    const rowScore = (id: string) => style !== 'offense' && slots === ARMY_BACK
      ? (statsOf(id, state.characters[id]).muscle + (style === 'defense' ? statsOf(id, state.characters[id]).business * 0.2 : 0)) * (skillOf(id).kind === 'summon' ? 0.65 : 1)
      : styleScore(state, id, style);
    ids.sort((a, b) => rowScore(b) - rowScore(a));
    slots.forEach((slot, i) => { squad[slot] = ids[i] ?? null; });
  }
  return squad;
}

/** The squad that will actually fight: yours, with anything invalid cleared. */
export function effectiveSquad(state: GameState): Squad {
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
  return { ...state, squad };
}

/** One-tap fill in a style. It sets the squad once; nothing re-fills it later. */
export function fillSquad(state: GameState, style: SquadStyle): GameState {
  return { ...state, squad: bestSquad(state, style) };
}

/**
 * Saves from before v5 could have auto-fill switched on, which rebuilt the squad before every fight.
 * Auto-fill is gone, so such a save keeps the squad auto-fill would field right now, as a fixed squad.
 */
export function retireAutoSquad(state: GameState): GameState {
  const { squadAuto, ...rest } = state;
  return squadAuto ? { ...rest, squad: bestSquad(rest, 'balanced') } : squadAuto === undefined ? state : rest;
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
  const turf = guards * perk.homeTurf(state);
  if (turf > 0) mods.push({ label: `Home Turf: ${guards} Security posted`, value: `${pct(turf)} Grit`, good: true });

  const training = perk.training(state);
  if (training > 0) mods.push({ label: 'Training 練兵 (Face)', value: pct(training), good: true });

  const specs: UnitSpec[] = [];
  squad.forEach((id, slot) => {
    if (!id) return;
    const def = CHARACTERS[id]!;
    const cs = state.characters[id];
    const base = statsOf(id, cs);
    const cls = classOf(id);
    const phaseMult = 1 + (phase === 'day' ? (cls === 'agent' ? PHASE_BONUS : 0) : cls === 'gangster' ? nightBonus : 0);
    const m = phaseMult * (1 + share) * (1 + faction) * (1 + training);
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
  const k = (e.scale ?? 1) * (fight.strength ?? 1);
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
    boost: { ultCharge: perk.ultCharge(state), startCharge: perk.warmUp(state) },
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
  /** A rematch won while its rewards were cooling down. */
  cooling?: boolean;
  /** First win right at the threshold: +1 Face at cash-out. */
  underdog: boolean;
  /** Price index jump from claiming the area. */
  indexJump: number;
  /** Claiming Xinyi: 'full' fireworks the first time, 'short' after. */
  fireworks: 'full' | 'short' | null;
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
/** Ms until a fight's rematch rewards are ready again (0 when ready). */
export function rematchCooldown(state: GameState, fightId: string, now: number): number {
  return Math.max(0, (state.cooldowns[fightId] ?? 0) - now);
}

export function resolveFight(state: GameState, fightId: string, outcome: 'win' | 'lose', now = 0): { state: GameState; result: FightResult } {
  const fight = FIGHTS[fightId]!;
  const first = outcome === 'win' && isFirstWin(state, fight);
  const cooling = outcome === 'win' && !first && rematchCooldown(state, fightId, now) > 0;
  const xp = cooling ? 0 : outcome === 'lose' ? FIGHT_XP_LOSS : first ? FIGHT_XP_FIRST_WIN : FIGHT_XP_WIN;
  const result: FightResult = {
    outcome,
    first,
    joined: null,
    lotsUnlocked: [],
    claimed: false,
    slotsUnlocked: null,
    starUp: null,
    underdog: false,
    indexJump: 0,
    fireworks: null,
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
    if (cooling) return { state: s, result: { ...result, cooling: true } };
    result.scratch = 1;
    return {
      state: {
        ...s,
        currencies: { ...s.currencies, scratch: s.currencies.scratch + 1 },
        cooldowns: { ...s.cooldowns, [fightId]: now + REMATCH_COOLDOWN_MS },
      },
      result,
    };
  }

  result.incense = Math.round(fight.rewards.incense * perk.incenseMult(state));
  result.lottery = fight.rewards.lottery;
  result.claimed = fight.key === 'boss';
  result.underdog = marketShare(state, fight.area) < SHARE_THRESHOLDS[fight.key] + UNDERDOG_MARGIN;
  if (result.underdog) s = { ...s, run: { ...s.run, underdog: s.run.underdog + 1 } };
  if (result.claimed) {
    result.indexJump = CLAIM_INDEX * perk.indexMult(state);
    const claimedEver = s.meta.claimedEver.includes(fight.area) ? s.meta.claimedEver : [...s.meta.claimedEver, fight.area];
    let chapterClears = s.meta.chapterClears;
    if (fight.area === 'xinyi') {
      result.fireworks = chapterClears === 0 ? 'full' : 'short';
      chapterClears += 1;
    }
    s = {
      ...s,
      index: s.index + result.indexJump,
      run: { ...s.run, claims: s.run.claims + 1 },
      meta: { ...s.meta, claimedEver, chapterClears },
    };
  }
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
  // The squad keeps its picks; drop the newcomer into an open slot if one fits.
  if (result.joined) {
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
