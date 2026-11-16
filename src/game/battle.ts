/**
 * Turf War auto-battler. A battle is a short-lived simulation, separate from the saved
 * game state: build it with createBattle, advance it with stepBattle, and read `units`
 * to draw it. The same seed and inputs always play out the same way.
 */
import { ROLES } from './content/characters';
import { ROLE_AURA, skillOf, type AuraKind, type SkillDef } from './content/skills';
import { CHARACTERS } from './content/characters';
import { AURA_STAR, AURA_STAR_MULT, SKILL_STAR, SKILL_STAR_MULT } from './constants';
import type { CharClass, FactionId, Role } from './types';

export type Side = 'you' | 'them';
export type Row = 'front' | 'back' | 'cmd';
export type Outcome = 'win' | 'lose';

export interface UnitSpec {
  charId: string;
  /** 0–1 front, 2–4 back, 5–6 commanders, -1 called in mid-fight. */
  slot: number;
  level: number;
  stars: number;
  muscle: number;
  grit: number;
  business: number;
  name: string;
  nameZh: string;
  faction: FactionId;
  grunt?: boolean;
}

export interface BattleInput {
  you: UnitSpec[];
  them: UnitSpec[];
  /** Seconds before the defenders win by holding out. */
  timeLimit: number;
  night: boolean;
  /** Template for troupe runners called in by a Procession, per side. */
  runner: Partial<Record<Side, UnitSpec>>;
  /** Your Face upgrades: faster commander ultimates and skills that start part-charged. */
  boost?: { ultCharge: number; startCharge: number };
}

export interface Unit {
  uid: number;
  side: Side;
  spec: UnitSpec;
  row: Row;
  /** Horizontal position 0–1, used to pick the enemy across from you. */
  x: number;
  role: Role;
  cls: CharClass;
  commander: boolean;
  skill: SkillDef;
  maxHp: number;
  hp: number;
  atk: number;
  biz: number;
  interval: number;
  cd: number;
  /** Skill charge 0–1. */
  charge: number;
  chargeTime: number;
  shield: number;
  stun: number;
  taunt: number;
  strip: number;
  weak: number;
  dr: number;
  drAmt: number;
  /** Battle time of this unit's last knockout, for the after-fight report. */
  koAt?: number;
  buff: number;
  buffAmt: number;
  haste: number;
  hasteAmt: number;
  alive: boolean;
  /** Once-per-fight skills (revive) are spent. */
  spent: boolean;
}

export type BattleEvent =
  | { kind: 'attack'; uid: number; target: number }
  | { kind: 'damage'; uid: number; from: number | null; amount: number; crit: boolean; big: boolean }
  | { kind: 'heal'; uid: number; amount: number }
  | { kind: 'shield'; uid: number; amount: number }
  | { kind: 'skill'; uid: number; ultimate: boolean }
  | { kind: 'status'; uid: number; text: string }
  | { kind: 'ko'; uid: number }
  | { kind: 'spawn'; uid: number }
  | { kind: 'buyout'; uid: number; by: number }
  | { kind: 'revive'; uid: number }
  | { kind: 'end'; outcome: Outcome };

interface SideState {
  permitStacks: number;
  processionT: number;
  permitT: number;
}

export interface Battle {
  t: number;
  units: Unit[];
  input: BattleInput;
  sides: Record<Side, SideState>;
  rng: () => number;
  nextUid: number;
  outcome: Outcome | null;
  /** When false, your skills wait for a tap (fire()). The rival side is always auto. */
  auto: boolean;
  events: BattleEvent[];
}

/* ---------- Tuning ---------- */

const HP_PER_GRIT = Number(globalThis.process?.env?.HP_PER_GRIT ?? 30);
const BASE_HP = 40;
const INTERVAL: Record<Role, number> = {
  weishi: 1.7,
  dashou: 1.5,
  xiaodi: 0.9,
  junshi: 1.6,
  fangzhong: 1.6,
  daishu: 1.6,
  dianzhang: 1.6,
  kuaiji: 1.6,
};
export const ULT_CHARGE = 24;
const ULT_MULT = 2;
const PROCESSION_EVERY = 15;
/** Most troupe runners alive on one side at once. */
const PROCESSION_CAP = 4;
const PERMIT_EVERY = 15;
const STRIP_MULT = 1.35;
const WEAK_MULT = 0.6;

/* ---------- Setup ---------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FRONT_X = [0.3, 0.7];
const BACK_X = [0.15, 0.5, 0.85];
const CMD_X = [0.35, 0.65];

function rowOf(slot: number): Row {
  if (slot < 0 || slot <= 1) return 'front';
  if (slot <= 4) return 'back';
  return 'cmd';
}

function addUnit(b: Battle, side: Side, spec: UnitSpec): Unit {
  const def = CHARACTERS[spec.charId];
  const role: Role = def?.role ?? 'xiaodi';
  const row = rowOf(spec.slot);
  const commander = row === 'cmd';
  const skill = skillOf(spec.charId);
  const x =
    spec.slot < 0
      ? 0.15 + 0.7 * b.rng()
      : row === 'front'
        ? FRONT_X[spec.slot]!
        : row === 'back'
          ? BACK_X[spec.slot - 2]!
          : CMD_X[spec.slot - 5]!;
  const maxHp = Math.round(BASE_HP + spec.grit * HP_PER_GRIT);
  const u: Unit = {
    uid: b.nextUid++,
    side,
    spec,
    row,
    x,
    role,
    cls: ROLES[role].cls,
    commander,
    skill,
    maxHp,
    hp: maxHp,
    atk: spec.muscle,
    biz: spec.business,
    interval: INTERVAL[role],
    cd: INTERVAL[role] * (0.3 + 0.7 * b.rng()),
    charge: commander ? 0 : 0.3 * b.rng(),
    chargeTime: commander ? ULT_CHARGE : skill.charge,
    shield: 0,
    stun: 0,
    taunt: 0,
    strip: 0,
    weak: 0,
    dr: 0,
    drAmt: 0,
    buff: 0,
    buffAmt: 0,
    haste: 0,
    hasteAmt: 0,
    alive: true,
    spent: false,
  };
  b.units.push(u);
  return u;
}

export function auraOf(u: Pick<Unit, 'skill' | 'role'>): AuraKind {
  return u.skill.aura ?? ROLE_AURA[u.role];
}

/**
 * Strength of `aura` on `side`: 0 when no living commander gives it (a knocked-out commander's
 * aura is lost), 1 normally, 1.5 from a ★5 commander.
 */
function auraK(b: Battle, side: Side, aura: AuraKind): number {
  let k = 0;
  for (const u of b.units)
    if (u.side === side && u.commander && u.alive && auraOf(u) === aura) k = Math.max(k, u.spec.stars >= AURA_STAR ? AURA_STAR_MULT : 1);
  return k;
}


const other = (s: Side): Side => (s === 'you' ? 'them' : 'you');
const living = (b: Battle, side: Side) => b.units.filter((u) => u.side === side && u.alive);

export function createBattle(input: BattleInput, seed: number, auto = true): Battle {
  const b: Battle = {
    t: 0,
    units: [],
    input,
    sides: {
      you: { permitStacks: 0, processionT: 0, permitT: 0 },
      them: { permitStacks: 0, processionT: 0, permitT: 0 },
    },
    rng: mulberry32(seed),
    nextUid: 1,
    outcome: null,
    auto,
    events: [],
  };
  for (const s of input.you) addUnit(b, 'you', s);
  for (const s of input.them) addUnit(b, 'them', s);
  const boost = input.boost;
  if (boost)
    for (const u of b.units)
      if (u.side === 'you') {
        if (u.commander) u.chargeTime /= 1 + boost.ultCharge;
        else u.charge = Math.min(0.95, u.charge + boost.startCharge);
      }

  // Opening auras.
  for (const side of ['you', 'them'] as Side[]) {
    const foe = other(side);
    const lowball = auraK(b, side, 'lowball');
    if (lowball) for (const u of living(b, foe)) if (u.spec.grunt) u.hp = Math.round(u.hp * (1 - 0.15 * lowball));
    const insurance = auraK(b, side, 'insurance');
    if (insurance) for (const u of living(b, side)) if (!u.commander) u.shield += Math.round(u.maxHp * 0.15 * insurance);
    const daddy = auraK(b, side, 'daddys_money');
    if (daddy) for (const u of living(b, side)) if (u.row === 'front') u.shield += Math.round(u.maxHp * 0.3 * daddy);
    const charm = auraK(b, side, 'last_call');
    if (charm) {
      const pool = living(b, foe).filter((u) => !u.commander);
      const target = pool[Math.floor(b.rng() * pool.length)];
      if (target) {
        target.stun = 4 * charm;
        b.events.push({ kind: 'status', uid: target.uid, text: 'CHARMED' });
      }
    }
  }
  return b;
}

/* ---------- Combat helpers ---------- */

function atkOf(b: Battle, u: Unit, stat: 'atk' | 'biz' = 'atk'): number {
  let v = u[stat];
  if (u.buff > 0) v *= 1 + u.buffAmt;
  if (stat === 'atk') v *= 1 + 0.15 * auraK(b, u.side, 'muscle');
  v *= 1 + 0.05 * b.sides[u.side].permitStacks;
  return v;
}

function skillPower(b: Battle, u: Unit): number {
  const base = u.cls === 'agent' ? atkOf(b, u, 'biz') : atkOf(b, u, 'atk');
  const stars = u.spec.stars >= SKILL_STAR ? SKILL_STAR_MULT : 1;
  return base * u.skill.mult * stars * (u.commander ? ULT_MULT : 1);
}

function hasteOf(b: Battle, u: Unit): number {
  let h = 1;
  if (u.haste > 0) h += u.hasteAmt;
  h += 0.15 * auraK(b, u.side, 'speed');
  h += 0.25 * auraK(b, u.side, 'scooter_crew');
  return h;
}

function chargeRate(b: Battle, u: Unit): number {
  let r = 1 / u.chargeTime;
  r *= 1 + 0.2 * auraK(b, u.side, 'tactics');
  if (u.cls === 'agent') r *= 1 + 0.4 * auraK(b, u.side, 'old_money');
  return r;
}

/** Who `u` may hit: the front row first; once it has fallen, the back row and commanders. */
function targetPool(b: Battle, side: Side): Unit[] {
  const foes = living(b, other(side));
  const taunting = foes.filter((f) => f.taunt > 0);
  if (taunting.length) return taunting;
  const front = foes.filter((f) => f.row === 'front');
  return front.length ? front : foes;
}

function pickTarget(b: Battle, u: Unit): Unit | null {
  const pool = targetPool(b, u.side);
  let best: Unit | null = null;
  let bestScore = Infinity;
  for (const f of pool) {
    const score = Math.abs(f.x - u.x) * 1000 + f.hp;
    if (score < bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return best;
}

function ko(b: Battle, u: Unit) {
  u.koAt = b.t;
  u.alive = false;
  u.hp = 0;
  u.shield = 0;
  b.events.push({ kind: 'ko', uid: u.uid });
}

function damage(
  b: Battle,
  from: Unit | null,
  to: Unit,
  raw: number,
  opts: { big?: boolean; critChance?: number; critMult?: number } = {},
): number {
  if (!to.alive) return 0;
  let amt = raw * (0.9 + 0.2 * b.rng());
  if (to.strip > 0) amt *= STRIP_MULT;
  if (to.dr > 0) amt *= 1 - to.drAmt;
  amt /= 1 + 0.15 * auraK(b, to.side, 'grit');
  if (from) {
    if (from.weak > 0) amt *= WEAK_MULT;
    amt *= 1 + 0.1 * auraK(b, from.side, 'red_tape');
  }
  const critChance = opts.critChance ?? (from ? 0.15 * auraK(b, from.side, 'lucky_streak') : 0);
  const crit = critChance > 0 && b.rng() < critChance;
  if (crit) amt *= opts.critMult ?? 2.5;
  amt = Math.max(1, Math.round(amt));
  let rest = amt;
  if (to.shield > 0) {
    const absorbed = Math.min(to.shield, rest);
    to.shield -= absorbed;
    rest -= absorbed;
  }
  to.hp -= rest;
  b.events.push({ kind: 'damage', uid: to.uid, from: from?.uid ?? null, amount: amt, crit, big: !!opts.big || crit });
  if (to.hp <= 0) ko(b, to);
  return amt;
}

function heal(b: Battle, u: Unit, amount: number) {
  if (!u.alive || u.hp >= u.maxHp) return;
  const amt = Math.min(u.maxHp - u.hp, Math.round(amount));
  if (amt <= 0) return;
  u.hp += amt;
  b.events.push({ kind: 'heal', uid: u.uid, amount: amt });
}

function shield(b: Battle, u: Unit, amount: number) {
  if (!u.alive) return;
  const amt = Math.round(amount);
  u.shield += amt;
  b.events.push({ kind: 'shield', uid: u.uid, amount: amt });
}

function spawnRunner(b: Battle, side: Side): Unit | null {
  const tpl = b.input.runner[side];
  if (!tpl) return null;
  if (living(b, side).filter((u) => u.spec.slot < 0).length >= PROCESSION_CAP) return null;
  const u = addUnit(b, side, { ...tpl, slot: -1 });
  u.hp = Math.round(u.hp * (1 - 0.15 * auraK(b, other(side), 'lowball')));
  b.events.push({ kind: 'spawn', uid: u.uid });
  return u;
}

/** Whether a charged skill has something useful to do right now. */
function canFire(b: Battle, u: Unit): boolean {
  if (u.spent) return false;
  if (u.skill.kind === 'revive') return b.units.some((x) => x.side === u.side && !x.alive && !x.spec.grunt);
  if (u.skill.kind === 'summon') return !!b.input.runner[u.side];
  return targetPool(b, u.side).length > 0;
}

function fireSkill(b: Battle, u: Unit) {
  const k = u.skill;
  const p = skillPower(b, u);
  const ult = u.commander;
  const allies = living(b, u.side);
  const foes = living(b, other(u.side));
  const armyFoes = foes.filter((f) => !f.commander);
  u.charge = 0;
  b.events.push({ kind: 'skill', uid: u.uid, ultimate: ult });
  switch (k.kind) {
    case 'hit_all':
      for (const f of armyFoes.length ? armyFoes : foes) damage(b, u, f, p, { big: true });
      break;
    case 'heavy': {
      const t = pickTarget(b, u);
      if (t) {
        damage(b, u, t, p, { big: true });
        if (k.secs && t.alive) t.stun = Math.max(t.stun, k.secs);
      }
      break;
    }
    case 'jackpot': {
      const t = pickTarget(b, u);
      if (t) damage(b, u, t, p, { big: true, critChance: 0.5, critMult: 3 });
      break;
    }
    case 'flurry':
      for (let i = 0; i < (k.n ?? 3) * (ult ? 2 : 1); i++) {
        const t = pickTarget(b, u);
        if (t) damage(b, u, t, k.mult * atkOf(b, u));
      }
      break;
    case 'dash_back': {
      const back = foes.filter((f) => f.row === 'back');
      const t = back.length ? back.reduce((a, c) => (Math.abs(c.x - u.x) < Math.abs(a.x - u.x) ? c : a)) : pickTarget(b, u);
      if (t) damage(b, u, t, p, { big: true });
      break;
    }
    case 'taunt':
      u.taunt = (k.secs ?? 5) * (ult ? 2 : 1);
      u.dr = u.taunt;
      u.drAmt = k.mult;
      b.events.push({ kind: 'status', uid: u.uid, text: 'TAUNT' });
      break;
    case 'shield_taunt':
      shield(b, u, u.maxHp * 0.3 * (ult ? 2 : 1));
      u.taunt = k.secs ?? 5;
      u.dr = u.taunt;
      u.drAmt = k.mult;
      break;
    case 'shield_weakest': {
      const t = allies.filter((a) => !a.commander || allies.every((x) => x.commander)).reduce<Unit | null>((a, c) => (!a || c.hp / c.maxHp < a.hp / a.maxHp ? c : a), null);
      if (t) shield(b, t, p);
      break;
    }
    case 'shield_back':
      for (const a of allies) if (a.row === 'back') shield(b, a, p);
      break;
    case 'shield_front':
      for (const a of allies) if (a.row === 'front') shield(b, a, p);
      break;
    case 'heal_all':
      for (const a of allies) heal(b, a, p);
      break;
    case 'last_call': {
      for (const a of allies) heal(b, a, p);
      const t = armyFoes[Math.floor(b.rng() * armyFoes.length)];
      if (t) {
        t.stun = Math.max(t.stun, k.secs ?? 2);
        b.events.push({ kind: 'status', uid: t.uid, text: 'CHARMED' });
      }
      break;
    }
    case 'buyout': {
      // Grunts cheap enough to buy (health at most Business × n) leave the fight.
      const price = atkOf(b, u, 'biz') * (k.n ?? 12) * (ult ? 2 : 1);
      const grunts = armyFoes.filter((f) => f.spec.grunt && f.hp + f.shield <= price).sort((a, c) => a.hp - c.hp);
      if (grunts.length) {
        for (const g of grunts.slice(0, ult ? 2 : 1)) {
          b.events.push({ kind: 'buyout', uid: g.uid, by: u.uid });
          ko(b, g);
        }
      } else {
        const t = pickTarget(b, u);
        if (t) damage(b, u, t, p, { big: true });
      }
      break;
    }
    case 'strip': {
      const t = pickTarget(b, u);
      if (t) {
        t.strip = k.secs ?? 6;
        b.events.push({ kind: 'status', uid: t.uid, text: 'EXPOSED' });
        damage(b, u, t, p);
      }
      break;
    }
    case 'stun_strongest': {
      const t = foes.reduce<Unit | null>((a, c) => (!a || c.atk > a.atk ? c : a), null);
      if (t) {
        t.stun = Math.max(t.stun, (k.secs ?? 3) * (ult ? 1.5 : 1));
        b.events.push({ kind: 'status', uid: t.uid, text: 'STUNNED' });
        damage(b, u, t, p);
      }
      break;
    }
    case 'stun_strip': {
      const t = pickTarget(b, u);
      if (t) {
        t.stun = Math.max(t.stun, k.secs ?? 2);
        t.strip = 6;
        b.events.push({ kind: 'status', uid: t.uid, text: 'STUNNED' });
        damage(b, u, t, p);
      }
      break;
    }
    case 'weaken': {
      const t = pickTarget(b, u);
      if (t) {
        t.weak = k.secs ?? 6;
        b.events.push({ kind: 'status', uid: t.uid, text: 'WEAKENED' });
        damage(b, u, t, p);
      }
      break;
    }
    case 'tipoff': {
      const cmds = foes.filter((f) => f.commander);
      const targets = cmds.length ? cmds : [foes.reduce((a, c) => (c.atk > a.atk ? c : a))];
      for (const t of targets) {
        t.weak = k.secs ?? 8;
        damage(b, u, t, p);
      }
      break;
    }
    case 'drum':
      for (const a of allies)
        if (a.row === 'front') {
          a.buff = k.secs ?? 8;
          a.buffAmt = k.mult * (ult ? 2 : 1);
        }
      break;
    case 'rave':
      for (const a of allies) {
        a.buff = k.secs ?? 6;
        a.buffAmt = k.mult * (b.input.night ? 2 : 1) * (ult ? 2 : 1);
      }
      break;
    case 'haste':
      for (const a of allies) {
        a.haste = k.secs ?? 6;
        a.hasteAmt = k.mult * (ult ? 2 : 1);
      }
      break;
    case 'permit':
      b.sides[u.side].permitStacks += ult ? 2 : 1;
      break;
    case 'charge_agents':
      for (const a of allies) if (a !== u && a.cls === 'agent') a.charge = Math.min(1, a.charge + k.mult * (ult ? 2 : 1));
      break;
    case 'revive': {
      const down = b.units.find((x) => x.side === u.side && !x.alive && !x.spec.grunt);
      if (down) {
        down.alive = true;
        down.hp = Math.round(down.maxHp * k.mult * (ult ? 2 : 1));
        down.stun = 0;
        b.events.push({ kind: 'revive', uid: down.uid });
        u.spent = true;
      }
      break;
    }
    case 'summon':
      for (let i = 0; i < (k.n ?? 1) * (ult ? 2 : 1); i++) spawnRunner(b, u.side);
      break;
  }
}

/** Fire a charged skill by hand (when Auto is off). Returns false if it isn't ready. */
export function fire(b: Battle, uid: number): boolean {
  const u = b.units.find((x) => x.uid === uid);
  if (!u || !u.alive || u.side !== 'you' || u.charge < 1 || u.stun > 0 || b.outcome) return false;
  if (!canFire(b, u)) return false;
  fireSkill(b, u);
  checkEnd(b);
  return true;
}

function checkEnd(b: Battle) {
  if (b.outcome) return;
  const you = living(b, 'you').length;
  const them = living(b, 'them').length;
  if (them === 0) b.outcome = 'win';
  else if (you === 0 || b.t >= b.input.timeLimit) b.outcome = 'lose';
  if (b.outcome) b.events.push({ kind: 'end', outcome: b.outcome });
}

function tickTimers(u: Unit, dt: number) {
  if (u.stun > 0) u.stun = Math.max(0, u.stun - dt);
  if (u.taunt > 0) u.taunt = Math.max(0, u.taunt - dt);
  if (u.strip > 0) u.strip = Math.max(0, u.strip - dt);
  if (u.weak > 0) u.weak = Math.max(0, u.weak - dt);
  if (u.dr > 0) u.dr = Math.max(0, u.dr - dt);
  if (u.buff > 0) u.buff = Math.max(0, u.buff - dt);
  if (u.haste > 0) u.haste = Math.max(0, u.haste - dt);
}

/** Advances the battle by `dt` seconds. Returns what happened, for the animation layer. */
export function stepBattle(b: Battle, dt: number): BattleEvent[] {
  b.events = [];
  if (b.outcome) return b.events;
  b.t += dt;

  for (const side of ['you', 'them'] as Side[]) {
    const st = b.sides[side];
    const procession = auraK(b, side, 'procession');
    if (procession) {
      st.processionT += dt * procession;
      if (st.processionT >= PROCESSION_EVERY) {
        st.processionT = 0;
        spawnRunner(b, side);
      }
    }
    const permits = auraK(b, side, 'permits');
    if (permits) {
      st.permitT += dt * permits;
      if (st.permitT >= PERMIT_EVERY) {
        st.permitT = 0;
        st.permitStacks += 1;
      }
    }
    const regen = 0.01 * auraK(b, side, 'staff_meal') + 0.015 * auraK(b, side, 'last_call');
    if (regen > 0) for (const u of living(b, side)) if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * regen * dt);
  }

  for (const u of [...b.units]) {
    if (!u.alive) continue;
    tickTimers(u, dt);
    if (u.stun > 0) continue;
    if (u.charge < 1) u.charge = Math.min(1, u.charge + dt * chargeRate(b, u));
    if (u.charge >= 1 && (u.side === 'them' || b.auto) && canFire(b, u)) fireSkill(b, u);
    if (!u.commander) {
      u.cd -= dt * hasteOf(b, u);
      if (u.cd <= 0) {
        u.cd += u.interval;
        const t = pickTarget(b, u);
        if (t) {
          b.events.push({ kind: 'attack', uid: u.uid, target: t.uid });
          damage(b, u, t, atkOf(b, u));
        }
      }
    }
    checkEnd(b);
    if (b.outcome) break;
  }
  if (!b.outcome) checkEnd(b);
  return b.events;
}

/** Plays a whole battle on auto. Used by quick checks, tests and the tuning script. */
export function runBattle(input: BattleInput, seed: number): { outcome: Outcome; t: number; battle: Battle } {
  const b = createBattle(input, seed, true);
  while (!b.outcome) stepBattle(b, 0.05);
  return { outcome: b.outcome, t: b.t, battle: b };
}

/** Rough strength of one fighter, shown as Power on the prep screen. */
export function unitPower(spec: Pick<UnitSpec, 'muscle' | 'grit' | 'business' | 'slot'>): number {
  const raw = spec.muscle * 1.2 + spec.grit + spec.business * 0.8;
  // Commanders don't swing, but their aura and ultimate are worth a lot.
  return Math.round(spec.slot >= 5 ? raw * 1.2 : raw);
}
