/**
 * Pacing simulator: a greedy "best payback first" player who checks in every few seconds,
 * across every open area. Fights are assumed won the moment they unlock, so these times
 * are a lower bound for a perfect, always-online player.
 *
 *   npm run sim                         # a first run, no Face upgrades
 *   UP=income:6,lot_price:3 HOURS=12 npm run sim
 */
import { buyLot, canHireAccountant, collectSafe, hireAccountant, upgradeLot } from '../src/game/actions';
import { autoStaff } from '../src/game/auto';
import { AREAS, AREA_ORDER } from '../src/game/content/areas';
import { ACCOUNTANT_COST, CLAIM_INDEX, SHARE_THRESHOLDS } from '../src/game/constants';
import { buyPrice, incomePerSec, isAreaOpen, isLotLocked, marketShare, netWorth, upgradeCost } from '../src/game/economy';
import { cashOutPreview, startRun } from '../src/game/face';
import { formatDuration, formatMoney } from '../src/game/format';
import { initialState } from '../src/game/state';
import { tick } from '../src/game/tick';
import type { AreaId, FightKey, GameState } from '../src/game/types';

const env = process.env;
const HOURS = Number(env.HOURS ?? 4);
const START = Date.UTC(2004, 0, 1, 8);
const STEP = 1;
const CHECK_EVERY = 5;

// Tuning knob: RIVAL multiplies the rival stake in areas 2–5.
if (env.RIVAL) for (const a of AREA_ORDER) if (a !== 'wanhua') AREAS[a].rivalBase *= Number(env.RIVAL);

let seed = 42;
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

let s: GameState = initialState(START);
const upgrades = Object.fromEntries((env.UP ?? '').split(',').filter(Boolean).map((kv) => [kv.split(':')[0]!, Number(kv.split(':')[1])]));
s = startRun({ ...s, meta: { ...s.meta, upgrades } });
// A crew that has joined over earlier runs, so staffing isn't the bottleneck.
for (const id of ['a_biao', 'gui_yi', 'kun_bo', 'xiao_zhen', 'a_gan', 'a_jie', 'lao_zhang', 'chen_daishu', 'intern'])
  if (env.CREW) s = { ...s, characters: { ...s.characters, [id]: { level: 10, xp: 0, stars: 1 } } };

const avg = (st: GameState) => incomePerSec(st, 'average');

function decide(state: GameState): GameState | null {
  let best: { payback: number; cost: number; next: () => GameState | null } | null = null;
  const consider = (payback: number, cost: number, next: () => GameState | null) => {
    if (!best || payback < best.payback) best = { payback, cost, next };
  };
  const base = avg(state);
  for (const area of AREA_ORDER) {
    if (!isAreaOpen(state, area)) continue;
    for (const lot of AREAS[area].lots) {
      const ls = state.lots[lot.id];
      if (!ls) {
        if (isLotLocked(state, lot)) continue;
        const cost = buyPrice(state, lot);
        const r = buyLot({ ...state, cash: Infinity }, lot.id);
        if (!r.ok) continue;
        // Buying also raises market share: weight new lots a little higher.
        consider((cost / Math.max(1e-9, avg(r.state) - base)) * 0.8, cost, () => {
          const x = buyLot(state, lot.id);
          return x.ok ? x.state : null;
        });
      } else {
        const cost = upgradeCost(state, lot, ls.level);
        const r = upgradeLot({ ...state, cash: Infinity }, lot.id, 1);
        if (!r.ok) continue;
        consider(cost / Math.max(1e-9, avg(r.state) - base), cost, () => {
          const x = upgradeLot(state, lot.id, 1);
          return x.ok ? x.state : null;
        });
      }
    }
  }
  if (canHireAccountant(state)) consider(0, ACCOUNTANT_COST, () => {
    const x = hireAccountant(state);
    return x.ok ? x.state : null;
  });
  const b = best as { payback: number; cost: number; next: () => GameState | null } | null;
  if (!b || b.cost > state.cash) return null;
  return b.next();
}

const hits: string[] = [];
const marks = new Set<number>();
let t = 0;
while (t < HOURS * 3600) {
  s = tick(s, STEP, START + t * 1000, rng).state;
  t += STEP;
  if (t % CHECK_EVERY === 0) {
    const c = collectSafe(s);
    if (c.ok) s = c.state;
    for (let i = 0; i < 40; i++) {
      const n = decide(s);
      if (!n) break;
      s = n;
    }
    s = autoStaff(s);
  }
  for (const area of AREA_ORDER) {
    if (!isAreaOpen(s, area) || AREAS[area].lots.length === 0) continue;
    const share = marketShare(s, area);
    for (const key of ['lt1', 'lt2', 'boss'] as FightKey[]) {
      if (s.areas[area][key] || share < SHARE_THRESHOLDS[key]) continue;
      s = { ...s, areas: { ...s.areas, [area]: { ...s.areas[area], [key]: true } } };
      if (key === 'boss') s = { ...s, index: s.index + CLAIM_INDEX, run: { ...s.run, claims: s.run.claims + 1 } };
      hits.push(`${formatDuration(t).padStart(8)}  ${AREAS[area as AreaId].name} ${key}${key === 'boss' ? ' (claimed)' : ''}  · Face if you cashed out now: ${cashOutPreview(s).face}`);
    }
  }
  const hour = Math.floor(t / 3600);
  if (t % 3600 === 0 && !marks.has(hour)) {
    marks.add(hour);
    hits.push(`${formatDuration(t).padStart(8)}  — net worth ${formatMoney(netWorth(s), 'kmb')}, income ${formatMoney(avg(s), 'kmb')}/s, Face ${cashOutPreview(s).face}`);
  }
}

console.log(`Full-run pacing: greedy, always-online player, fights won instantly. Upgrades: ${env.UP || 'none'}\n`);
for (const h of hits) console.log(h);
