import { describe, expect, it } from 'vitest';
import { assignStaff, buyLot } from './actions';
import { classOf, statsOf } from './characters';
import { AREAS } from './content/areas';
import { CHARACTERS } from './content/characters';
import { incomePerSec } from './economy';
import { managerGain, optimizeStaff, slotAdvice } from './staffing';
import { initialState } from './state';
import type { GameState } from './types';

const NOW = 1_700_000_000_000;
const fmt = (n: number) => n.toFixed(0);
const ok = (r: { ok: true; state: GameState } | { ok: false; reason: string }) => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};
const collectible = Object.values(CHARACTERS).filter((c) => c.rarity !== 'NPC' && c.role);
const agents = collectible.filter((c) => classOf(c.id) === 'agent').map((c) => c.id);
const gangsters = collectible.filter((c) => classOf(c.id) === 'gangster').map((c) => c.id);

/** Wanhua's first three lots, with every agent and gangster in the crew at level 1. */
function setup(): GameState {
  let s: GameState = { ...initialState(NOW), cash: 1e12 };
  s = { ...s, characters: Object.fromEntries([...agents, ...gangsters].map((id) => [id, { level: 1, xp: 0, stars: 1 }])) };
  for (const id of ['w1', 'w2', 'w3']) s = ok(buyLot(s, id));
  return s;
}

describe('staffing advice', () => {
  it('picks the agent who adds the most income for an empty Manager slot', () => {
    const s = setup();
    const { options, tip } = slotAdvice(s, 'w3', 'manager', fmt);
    const best = options.find((o) => o.best)!;
    const top = Math.max(...agents.map((id) => managerGain(s, 'w3', id)));
    expect(best.net).toBeCloseTo(top);
    expect(tip).toContain(CHARACTERS[best.charId]!.name);
  });

  it('counts what a move costs at the lot they leave', () => {
    let s = setup();
    const star = slotAdvice(s, 'w3', 'manager', fmt).options.find((o) => o.best)!.charId;
    s = ok(assignStaff(s, 'w3', 'manager', star));
    // w1 earns far less than w3, so moving the star there is a net loss and never the best fit.
    const move = slotAdvice(s, 'w1', 'manager', fmt).options.find((o) => o.charId === star)!;
    expect(move.leaves).toBe('w3');
    expect(move.net).toBeLessThan(0);
    expect(move.best).toBe(false);
  });

  it('suggests the weakest guard who is still strong enough', () => {
    const s = setup();
    const threat = AREAS.wanhua.threat;
    const strong = gangsters.map((id) => ({ id, m: statsOf(id, s.characters[id]).muscle })).filter((g) => g.m >= threat);
    expect(strong.length).toBeGreaterThan(0);
    const weakest = Math.min(...strong.map((g) => g.m));
    const best = slotAdvice(s, 'w1', 'security', fmt).options.find((o) => o.best)!;
    expect(best.muscle).toBe(weakest);
  });

  it('gives no best guard in a claimed area, and says why', () => {
    let s = setup();
    s = { ...s, areas: { ...s.areas, wanhua: { lt1: true, lt2: true, boss: true } } };
    const { options, tip } = slotAdvice(s, 'w1', 'security', fmt);
    expect(options.some((o) => o.best)).toBe(false);
    expect(tip).toContain('claimed');
  });

  it('dev optimize never lowers income and fills every Manager slot it can', () => {
    let s = setup();
    // A deliberately bad layout: the weakest agent on the biggest earner.
    const weakest = [...agents].sort((a, b) => managerGain(s, 'w3', a) - managerGain(s, 'w3', b))[0]!;
    s = ok(assignStaff(s, 'w3', 'manager', weakest));
    const after = optimizeStaff(s);
    expect(incomePerSec(after, 'average')).toBeGreaterThan(incomePerSec(s, 'average'));
    expect(['w1', 'w2', 'w3'].every((id) => after.lots[id]!.manager)).toBe(true);
  });
});
