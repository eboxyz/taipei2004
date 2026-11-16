/**
 * Pacing simulator: plays Wanhua with a greedy "best payback first" player
 * who checks in every few seconds, and reports when each market share threshold is hit.
 * Assumes lieutenant fights are won as soon as they unlock (milestone 2 adds real fights).
 *
 *   npm run sim
 */
import { buyLot, collectSafe, hireAccountant, upgradeLot, canHireAccountant, assignStaff } from '../src/game/actions';
import { AREAS } from '../src/game/content/areas';
import { ACCOUNTANT_COST, SHARE_THRESHOLDS } from '../src/game/constants';
import { buyPrice, incomePerSec, isLotLocked, lotIncome, marketShare, upgradeCost } from '../src/game/economy';
import { formatDuration, formatMoney } from '../src/game/format';
import { initialState } from '../src/game/state';
import { tick } from '../src/game/tick';
import type { GameState } from '../src/game/types';

// Optional overrides for tuning sweeps, e.g. RIVAL_BASE=2e8 P7=3e7 npm run sim
const env = process.env;
if (env.RIVAL_BASE) AREAS.wanhua.rivalBase = Number(env.RIVAL_BASE);
for (const [i, lot] of AREAS.wanhua.lots.entries()) {
  const n = i + 1;
  if (env[`P${n}`]) lot.price = Number(env[`P${n}`]);
  if (env[`I${n}`]) lot.income = Number(env[`I${n}`]);
}

const START = Date.UTC(2004, 0, 1, 8);
const STEP = 1; // seconds per tick
const CHECK_EVERY = 5; // player taps/decides every N seconds
const LIMIT = 3 * 3600;

let seed = 42;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

let s: GameState = initialState(START);
let t = 0;
const hits: Record<string, number> = {};
const lotTimes: string[] = [];

function avgGain(before: GameState, after: GameState) {
  return incomePerSec(after, 'average') - incomePerSec(before, 'average');
}

function staff(state: GameState): GameState {
  const owned = AREAS.wanhua.lots.filter((l) => state.lots[l.id]);
  if (owned.length === 0) return state;
  const best = [...owned].sort((a, b) => lotIncome(state, b, 'average') - lotIncome(state, a, 'average'));
  let next = state;
  const r1 = assignStaff(next, best[0]!.id, 'manager', 'a_cai');
  if (r1.ok) next = r1.state;
  const r2 = assignStaff(next, best[0]!.id, 'security', 'hai_shu');
  if (r2.ok) next = r2.state;
  if (best[1]) {
    const r3 = assignStaff(next, best[1].id, 'security', 'a_di');
    if (r3.ok) next = r3.state;
  }
  return next;
}

function decide(state: GameState): GameState | null {
  type Option = { payback: number; cost: number; apply: () => GameState | null; label: string };
  const options: Option[] = [];
  for (const lot of AREAS.wanhua.lots) {
    const ls = state.lots[lot.id];
    if (!ls) {
      if (isLotLocked(state, lot)) continue;
      const cost = buyPrice(state, lot);
      const r = buyLot({ ...state, cash: Infinity }, lot.id);
      if (!r.ok) continue;
      const gain = avgGain(state, r.state);
      options.push({ payback: cost / gain, cost, label: `buy ${lot.id}`, apply: () => { const x = buyLot(state, lot.id); return x.ok ? x.state : null; } });
    } else {
      const cost = upgradeCost(state, lot, ls.level);
      const r = upgradeLot({ ...state, cash: Infinity }, lot.id, 1);
      if (!r.ok) continue;
      const gain = avgGain(state, r.state);
      options.push({ payback: cost / gain, cost, label: `up ${lot.id}`, apply: () => { const x = upgradeLot(state, lot.id, 1); return x.ok ? x.state : null; } });
    }
  }
  if (canHireAccountant(state)) {
    options.push({ payback: 0, cost: ACCOUNTANT_COST, label: 'accountant', apply: () => { const x = hireAccountant(state); return x.ok ? x.state : null; } });
  }
  options.sort((a, b) => a.payback - b.payback);
  const best = options[0];
  if (!best || best.cost > state.cash) return null;
  return best.apply();
}

while (t < LIMIT) {
  s = tick(s, STEP, START + t * 1000, rng).state;
  t += STEP;
  if (t % CHECK_EVERY === 0) {
    const c = collectSafe(s);
    if (c.ok) s = c.state;
    for (let i = 0; i < 50; i++) {
      const owned = Object.keys(s.lots).length;
      const n = decide(s);
      if (!n) break;
      s = n;
      if (Object.keys(s.lots).length > owned) {
        lotTimes.push(`${formatDuration(t)} bought lot #${Object.keys(s.lots).length}`);
        s = staff(s);
      }
    }
  }
  const share = marketShare(s, 'wanhua');
  for (const [k, v] of Object.entries(SHARE_THRESHOLDS)) {
    if (share >= v && hits[k] === undefined) {
      hits[k] = t;
      if (k === 'lt1') s = { ...s, areas: { ...s.areas, wanhua: { ...s.areas.wanhua, lt1: true } } };
      if (k === 'lt2') s = { ...s, areas: { ...s.areas, wanhua: { ...s.areas.wanhua, lt2: true } } };
    }
  }
  if (hits.boss !== undefined) break;
}

console.log('Wanhua pacing (greedy player, checks in every 5 s)');
console.log('targets for a perfect player: Lt1 ~10 min · Lt2 ~15 min · Boss ~20 min (real players ~1.5x slower; fights add more)\n');
for (const k of ['lt1', 'lt2', 'boss']) {
  console.log(`${k.padEnd(5)} ${hits[k] !== undefined ? formatDuration(hits[k]!) : 'not reached'}`);
}
console.log(`\nincome ${formatMoney(incomePerSec(s, 'average'))}/s · index ${s.index.toFixed(1)} · lots ${Object.keys(s.lots).length}`);
console.log(`accountant ${s.run.accountant ? 'hired' : 'no'} · shakedowns repelled ${s.stats.shakedownsRepelled}`);
console.log('levels:', AREAS.wanhua.lots.filter((l) => s.lots[l.id]).map((l) => `${l.id}:${s.lots[l.id]!.level}`).join(' '));
console.log('\n' + lotTimes.join('\n'));
