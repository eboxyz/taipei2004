/**
 * Staffing advice: what each crew member would do in a lot's Manager or Security slot,
 * which one fits best, and a dev-only "optimize everyone".
 *
 * Managers multiply their lot's income, so the strongest belong on the biggest earners.
 * Guards only need Muscle at the area's threat level (more earns nothing extra), and shakedowns
 * stop once an area is claimed, so the best guard is the weakest one who is still strong enough.
 */
import { assignStaff } from './actions';
import { classOf, statsOf } from './characters';
import { ALL_LOTS, AREAS } from './content/areas';
import { CHARACTERS } from './content/characters';
import { SHAKEDOWN_BONUS_SECONDS } from './constants';
import { isLotLocked, lotIncome, postOf } from './economy';
import { perk } from './perks';
import type { AreaId, GameState, LotDef } from './types';

export type Slot = 'manager' | 'security';

export interface SlotOption {
  charId: string;
  /** Already in this slot. */
  current: boolean;
  /** The other post they would leave, if any. */
  leaves: string | null;
  /** Managers: income/s (day and night averaged) they add at this lot. */
  gainHere: number;
  /** Managers: income/s lost at the lot they'd leave. */
  lossThere: number;
  /** Managers: change in total income/s compared with now. */
  net: number;
  /** Security: Muscle stat, and whether it meets this area's threat. */
  muscle: number;
  strong: boolean;
  /** Security: moving them would leave a lot that still gets shakedowns without a winning guard. */
  leavesUnguarded: boolean;
  best: boolean;
}

export interface SlotAdvice {
  options: SlotOption[];
  /** One short sentence for the top of the picker. */
  tip: string;
}

function withManager(state: GameState, lotId: string, charId: string | undefined): GameState {
  return { ...state, lots: { ...state.lots, [lotId]: { ...state.lots[lotId]!, manager: charId } } };
}

/** Income/s (averaged over day and night) that `charId` adds as Manager of `lotId`, against an empty slot. */
export function managerGain(state: GameState, lotId: string, charId: string): number {
  const lot = ALL_LOTS[lotId]!;
  return lotIncome(withManager(state, lotId, charId), lot, 'average') - lotIncome(withManager(state, lotId, undefined), lot, 'average');
}

/** A lot's income with no Manager, used to rank lots by how much a Manager can add. */
export function baseIncome(state: GameState, lot: LotDef): number {
  return lotIncome(withManager(state, lot.id, undefined), lot, 'average');
}

/** This lot's position among the lots you own, by base income (1 = biggest earner). */
export function earnerRank(state: GameState, lotId: string): { rank: number; of: number } {
  const owned = Object.keys(state.lots)
    .map((id) => ALL_LOTS[id])
    .filter((l): l is LotDef => !!l)
    .sort((a, b) => baseIncome(state, b) - baseIncome(state, a));
  return { rank: owned.findIndex((l) => l.id === lotId) + 1, of: owned.length };
}

/** Lots in the area you could still buy (owned lots and locked ones don't count). */
export function lotsLeftToBuy(state: GameState, area: AreaId): number {
  return AREAS[area].lots.filter((l) => !state.lots[l.id] && !isLotLocked(state, l)).length;
}

const nameOf = (id: string) => CHARACTERS[id]?.name ?? id;

function guardIsUseful(state: GameState, lotId: string, charId: string): boolean {
  const lot = ALL_LOTS[lotId];
  if (!lot || state.areas[lot.area].boss) return false;
  return statsOf(charId, state.characters[charId]).muscle >= AREAS[lot.area].threat;
}

export function slotAdvice(state: GameState, lotId: string, slot: Slot, fmt: (n: number) => string): SlotAdvice {
  const lot = ALL_LOTS[lotId]!;
  const ls = state.lots[lotId]!;
  const occupant = ls[slot];
  const need = slot === 'manager' ? 'agent' : 'gangster';
  const crew = Object.keys(state.characters).filter((id) => classOf(id) === need);
  const area = AREAS[lot.area];
  const claimed = state.areas[lot.area].boss;

  const options: SlotOption[] = crew.map((id) => {
    const post = postOf(state, id);
    const current = id === occupant;
    const leaves = post && !current ? post.lotId : null;
    const muscle = statsOf(id, state.characters[id]).muscle;
    let gainHere = 0;
    let lossThere = 0;
    let net = 0;
    if (slot === 'manager') {
      gainHere = managerGain(state, lotId, id);
      lossThere = leaves ? managerGain(state, leaves, id) : 0;
      net = current ? 0 : gainHere - (occupant ? managerGain(state, lotId, occupant) : 0) - lossThere;
    }
    return {
      charId: id,
      current,
      leaves,
      gainHere,
      lossThere,
      net,
      muscle,
      strong: muscle >= area.threat,
      leavesUnguarded: !!leaves && guardIsUseful(state, leaves, id),
      best: false,
    };
  });

  if (slot === 'manager') {
    options.sort((a, b) => (b.current ? b.gainHere : b.net) - (a.current ? a.gainHere : a.net) || (b.current ? 1 : 0) - (a.current ? 1 : 0));
    const pick = options.filter((o) => !o.current && o.net > 0).sort((a, b) => b.net - a.net)[0];
    const cur = options.find((o) => o.current);
    const { rank, of } = earnerRank(state, lotId);
    const where = rank === 1 ? 'Your biggest earner' : `Your #${rank} earner of ${of}`;
    const agents = crew.length;
    // Below your top lots, no one is the "best fit": the advice is to look elsewhere.
    if (rank <= agents) {
      if (pick) pick.best = true;
      else if (cur) cur.best = true;
    }
    let tip: string;
    if (rank > agents)
      tip = `${where}. Managers multiply a lot's income, so your ${agents} agent${agents === 1 ? '' : 's'} earn the most on your top ${agents} lots. This one can wait${cur ? `, and ${nameOf(cur.charId)} may do more on a bigger earner` : ''}.`;
    else if (pick) tip = `${where}. Put strong managers on big earners: ${nameOf(pick.charId)} would add ${fmt(pick.net)}/s here.`;
    else if (cur) tip = `${where}. ${nameOf(cur.charId)} is already the best fit here.`;
    else tip = `${where}. Every agent you have is doing more somewhere else.`;
    return { options, tip };
  }

  // Security
  if (claimed) {
    options.sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0) || b.muscle - a.muscle);
    const pct = Math.round(perk.homeTurf(state) * 100);
    return {
      options,
      tip: `${area.name} is claimed, so there are no more shakedowns here. A guard only adds +${pct}% Grit in ${area.name} Turf War rematches, so strong fighters may do more in areas you haven't claimed.`,
    };
  }
  // Strong and free first (weakest first, so stronger fighters stay free for tougher areas),
  // then strong but needed elsewhere, then everyone too weak (strongest first).
  const tier = (o: SlotOption) => (o.strong ? (o.leavesUnguarded ? 1 : 0) : 2);
  options.sort((a, b) => tier(a) - tier(b) || (tier(a) === 2 ? b.muscle - a.muscle : a.muscle - b.muscle));
  const cur = options.find((o) => o.current);
  const pick = cur?.strong ? cur : options.find((o) => o.strong && !o.leavesUnguarded);
  if (pick) pick.best = true;
  const bonus = fmt(Math.max(1000, lotIncome(state, lot, 'average') * SHAKEDOWN_BONUS_SECONDS));
  const head = `${area.name} shakedowns need Muscle ${area.threat}. A strong guard here wins about ${bonus} each time, plus XP.`;
  let tip: string;
  if (cur?.strong) tip = `${head} ${nameOf(cur.charId)} is strong enough already.`;
  else if (pick) tip = `${head} Best fit: ${nameOf(pick.charId)} (Muscle ${pick.muscle}), the weakest who's strong enough, which keeps your stronger fighters free.`;
  else tip = `${head} No free gangster is strong enough yet. Turf Wars and shakedown attempts give them XP.`;
  return { options, tip };
}

/* ---------- Dev only ---------- */

function managerMultOf(state: GameState, id: string): number {
  const b = statsOf(id, state.characters[id]).business;
  return (1 + b / 100) * (CHARACTERS[id]?.role === 'dianzhang' ? 1.25 : 1);
}

/**
 * Dev tool: reassigns every post. Strongest managers go to the biggest earners. Guards go to unclaimed
 * areas, toughest area first, each lot getting the weakest gangster strong enough for it.
 * Leftover gangsters guard claimed areas for the Home Turf bonus. Role perks other than 店長 are ignored.
 */
export function optimizeStaff(state: GameState): GameState {
  const lots = Object.fromEntries(Object.entries(state.lots).map(([id, ls]) => [id, { ...ls, manager: undefined, security: undefined }]));
  let s: GameState = { ...state, lots };
  const owned = Object.keys(s.lots)
    .map((id) => ALL_LOTS[id])
    .filter((l): l is LotDef => !!l);
  const assign = (lotId: string, slot: Slot, id: string) => {
    const r = assignStaff(s, lotId, slot, id);
    if (r.ok) s = r.state;
  };

  const agents = Object.keys(s.characters)
    .filter((id) => classOf(id) === 'agent')
    .sort((a, b) => managerMultOf(s, b) - managerMultOf(s, a));
  const byIncome = [...owned].sort((a, b) => baseIncome(s, b) - baseIncome(s, a));
  byIncome.forEach((lot, i) => agents[i] && assign(lot.id, 'manager', agents[i]));

  const free = new Set(Object.keys(s.characters).filter((id) => classOf(id) === 'gangster'));
  const muscle = (id: string) => statsOf(id, s.characters[id]).muscle;
  const contested = byIncome.filter((l) => !s.areas[l.area].boss).sort((a, b) => AREAS[b.area].threat - AREAS[a.area].threat);
  for (const lot of contested) {
    const fit = [...free].filter((id) => muscle(id) >= AREAS[lot.area].threat).sort((a, b) => muscle(a) - muscle(b))[0];
    if (fit) {
      assign(lot.id, 'security', fit);
      free.delete(fit);
    }
  }
  // Anyone left: claimed areas (Home Turf), then unguarded contested lots (attempts still earn XP).
  const rest = [...byIncome.filter((l) => s.areas[l.area].boss), ...contested].filter((l) => !s.lots[l.id]!.security);
  const leftovers = [...free].sort((a, b) => muscle(b) - muscle(a));
  rest.forEach((lot, i) => leftovers[i] && assign(lot.id, 'security', leftovers[i]));
  return s;
}
