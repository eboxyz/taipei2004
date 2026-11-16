/**
 * Turf War tuning: plays each Wanhua fight many times with the squad a typical
 * player has at that point, by day and by night, and prints win rates and lengths.
 *   npm run sim:fights
 */
import { runBattle } from '../src/game/battle';
import { FIGHTS } from '../src/game/content/fights';
import { initialState } from '../src/game/state';
import { battleInputFor, buildYourSide, fillSquad, homeTimeOf, recommendedPower } from '../src/game/turf';
import type { GameState, Phase, SquadStyle } from '../src/game/types';

const N = Number(process.env.N ?? 400);
if (!Number.isInteger(N) || N < 1) throw new Error('N must be a positive integer');
const styles: SquadStyle[] = ['offense', 'defense', 'balanced'];

// Tuning overrides, e.g. wanhua_lt1="1:0.7,2:1" sets level:scale per enemy unit.
for (const f of Object.values(FIGHTS)) {
  const k = process.env[`S_${f.id}`];
  if (k) f.strength = Number(k);
  const o = process.env[f.id];
  if (!o) continue;
  o.split(',').forEach((pair, i) => {
    const [lv, sc] = pair.split(':').map(Number);
    const u = f.units[i];
    if (u && lv) u.level = lv;
    if (u && sc) u.scale = sc;
  });
}

function withCrew(levels: Record<string, number>, slots: number, extra: Partial<GameState> = {}, stars = 1, training = 0): GameState {
  const s = initialState(0);
  const characters = { ...s.characters };
  for (const [id, level] of Object.entries(levels)) characters[id] = { level, xp: 0, stars };
  // Hai-shu guards a lot in the fight's area (Home Turf), A-Cai manages one.
  const lots = { w1: { level: 10, invested: 0, security: 'hai_shu', manager: 'a_cai' } };
  // The squad a player gets from the All-around fill.
  return fillSquad({ ...s, characters, lots, meta: { ...s.meta, squadSlots: slots, upgrades: { training } }, ...extra }, 'balanced');
}

const lv = (ids: string[], level: number) => Object.fromEntries(ids.map((id) => [id, level]));
const STARTERS = ['hai_shu', 'a_di', 'a_cai'];
const WANHUA = ['a_biao', 'gui_yi', 'kun_bo'];
const XIMENDING = ['xiao_zhen', 'a_gan', 'a_jie'];
const ZHONGSHAN = ['a_jian', 'coco', 'yue_jie'];
const EAST = ['da_kuai', 'vivi', 'jin_shao'];
const XINYI = ['secretary_lin', 'tie_ge', 'tian_dong'];

const scenarios: { fight: string; label: string; state: GameState }[] = [
  { fight: 'wanhua_lt1', label: 'starters Lv1', state: withCrew({ hai_shu: 1, a_di: 1, a_cai: 1 }, 3) },
  { fight: 'wanhua_lt1', label: 'starters Lv2', state: withCrew({ hai_shu: 2, a_di: 2, a_cai: 2 }, 3) },
  { fight: 'wanhua_lt2', label: '+A-Biao Lv1, starters Lv2', state: withCrew({ hai_shu: 2, a_di: 2, a_cai: 2, a_biao: 1 }, 4) },
  { fight: 'wanhua_lt2', label: '+A-Biao Lv2, starters Lv3', state: withCrew({ hai_shu: 3, a_di: 3, a_cai: 3, a_biao: 2 }, 4) },
  { fight: 'wanhua_boss', label: '+Gui-yi Lv1, A-Biao Lv2, starters Lv3', state: withCrew({ hai_shu: 3, a_di: 3, a_cai: 3, a_biao: 2, gui_yi: 1 }, 5) },
  { fight: 'wanhua_boss', label: 'Gui-yi Lv3, A-Biao Lv4, starters Lv4', state: withCrew({ hai_shu: 4, a_di: 4, a_cai: 4, a_biao: 4, gui_yi: 3 }, 5) },
  // Run 1, about an hour in: Wanhua crew, a couple of draws.
  { fight: 'ximending_lt1', label: 'run 1: crew Lv5, Wanhua cards Lv3', state: withCrew({ ...lv(STARTERS, 5), ...lv(WANHUA, 3), intern: 2 }, 6) },
  { fight: 'ximending_lt2', label: 'run 1: + Xiao Zhen', state: withCrew({ ...lv(STARTERS, 6), ...lv(WANHUA, 4), intern: 3, xiao_zhen: 1 }, 6) },
  { fight: 'ximending_boss', label: 'run 1: + A-Gan', state: withCrew({ ...lv(STARTERS, 6), ...lv(WANHUA, 5), intern: 3, xiao_zhen: 2, a_gan: 1 }, 6) },
  // Run 2: full squad, Training 3.
  { fight: 'zhongshan_lt1', label: 'run 2: Lv10, Training 3', state: withCrew({ ...lv(STARTERS, 10), ...lv(WANHUA, 9), ...lv(XIMENDING, 7) }, 7, {}, 1, 3) },
  { fight: 'zhongshan_lt2', label: 'run 2: + A-Jian', state: withCrew({ ...lv(STARTERS, 11), ...lv(WANHUA, 10), ...lv(XIMENDING, 8), a_jian: 1 }, 7, {}, 1, 3) },
  { fight: 'zhongshan_boss', label: 'run 2: + Coco', state: withCrew({ ...lv(STARTERS, 11), ...lv(WANHUA, 10), ...lv(XIMENDING, 8), a_jian: 2, coco: 1 }, 7, {}, 1, 3) },
  // Run 3: Lv15, ★2, Training 6.
  { fight: 'east_lt1', label: 'run 3: Lv15 ★2, Training 6', state: withCrew({ ...lv(STARTERS, 15), ...lv(WANHUA, 14), ...lv(XIMENDING, 13), ...lv(ZHONGSHAN, 10) }, 7, {}, 2, 6) },
  { fight: 'east_lt2', label: 'run 3: + Da-kuai', state: withCrew({ ...lv(STARTERS, 16), ...lv(WANHUA, 15), ...lv(XIMENDING, 14), ...lv(ZHONGSHAN, 11), da_kuai: 1 }, 7, {}, 2, 6) },
  { fight: 'east_boss', label: 'run 3: + Vivi', state: withCrew({ ...lv(STARTERS, 16), ...lv(WANHUA, 15), ...lv(XIMENDING, 14), ...lv(ZHONGSHAN, 12), da_kuai: 2, vivi: 1 }, 7, {}, 2, 6) },
  // Runs 4+: Lv22, ★3, Training 10.
  { fight: 'xinyi_lt1', label: 'run 4: Lv22 ★3, Training 10', state: withCrew({ ...lv(STARTERS, 22), ...lv(WANHUA, 21), ...lv(XIMENDING, 20), ...lv(ZHONGSHAN, 18), ...lv(EAST, 15) }, 7, {}, 3, 10) },
  { fight: 'xinyi_lt2', label: 'run 4: + Secretary Lin', state: withCrew({ ...lv(STARTERS, 23), ...lv(WANHUA, 22), ...lv(XIMENDING, 21), ...lv(ZHONGSHAN, 19), ...lv(EAST, 16), secretary_lin: 1 }, 7, {}, 3, 10) },
  { fight: 'xinyi_boss', label: 'run 4: + Tie-ge', state: withCrew({ ...lv(STARTERS, 23), ...lv(WANHUA, 22), ...lv(XIMENDING, 21), ...lv(ZHONGSHAN, 19), ...lv(EAST, 17), secretary_lin: 2, tie_ge: 1 }, 7, {}, 3, 10) },
  // Secret chapter: established collection, Lv30 / ★3 / Training 12.
  { fight: 'xindian_lt1', label: 'secret: Lv30 ★3, Training 12', state: withCrew({ ...lv(STARTERS, 30), ...lv(WANHUA, 29), ...lv(XIMENDING, 28), ...lv(ZHONGSHAN, 26), ...lv(EAST, 24), ...lv(XINYI, 20) }, 7, {}, 3, 12) },
  { fight: 'xindian_lt2', label: 'secret: + Qiao-lin', state: withCrew({ ...lv(STARTERS, 31), ...lv(WANHUA, 30), ...lv(XIMENDING, 29), ...lv(ZHONGSHAN, 27), ...lv(EAST, 25), ...lv(XINYI, 21), xiaoxiao_agent: 5 }, 7, {}, 3, 12) },
  { fight: 'xindian_boss', label: 'secret: + A-Yin, Lv32 ★3', state: withCrew({ ...lv(STARTERS, 32), ...lv(WANHUA, 31), ...lv(XIMENDING, 30), ...lv(ZHONGSHAN, 28), ...lv(EAST, 26), ...lv(XINYI, 22), xiaoxiao_agent: 7, a_yin: 5 }, 7, {}, 3, 12) },
];

const only = process.env.ONLY;
/** The gang's home time (it gets +20%) and its off-time (the opening). */
const homeOf = (fightId: string): Phase => homeTimeOf(FIGHTS[fightId]!)?.phase ?? 'night';
const offOf = (fightId: string): Phase => (homeOf(fightId) === 'day' ? 'night' : 'day');
const label = (fightId: string, phase: Phase) => `${phase}${homeOf(fightId) === phase ? ' (home)' : ' (off)'}`;
for (const sc of scenarios.filter((x) => !only || x.fight.startsWith(only))) {
  const fight = FIGHTS[sc.fight]!;
  if (process.env.STYLES) {
    console.log(`${sc.fight} | ${sc.label} | N=${N}`);
    for (const style of styles) {
      const rates = (['day', 'night'] as Phase[]).map((phase) => {
        // The fill is made for the phase you fight in, as the prep screen does.
        const state = fillSquad(sc.state, style, phase);
        const input = battleInputFor(state, sc.fight, phase);
        let wins = 0;
        for (let seed = 1; seed <= N; seed++) if (runBattle(input, seed).outcome === 'win') wins++;
        return `${label(sc.fight, phase)} ${(100 * wins / N).toFixed(1)}%`;
      });
      console.log(`    ${style.padEnd(8)} ${rates.join(' | ')}`);
    }
    continue;
  }
  const rec = recommendedPower(fight);
  const row: string[] = [];
  for (const phase of ['day', 'night'] as Phase[]) {
    const state = fillSquad(sc.state, 'balanced', phase);
    const power = buildYourSide(state, fight, phase).power;
    const input = battleInputFor(state, sc.fight, phase);
    let wins = 0;
    let tWin = 0;
    let tAll = 0;
    for (let seed = 1; seed <= N; seed++) {
      const r = runBattle(input, seed);
      tAll += r.t;
      if (r.outcome === 'win') {
        wins++;
        tWin += r.t;
      }
    }
    row.push(`${label(sc.fight, phase)}: power ${power} → win ${Math.round((wins / N) * 100)}% (${wins ? Math.round(tWin / wins) : '-'}s, avg ${Math.round(tAll / N)}s)`);
  }
  console.log(`${sc.fight.padEnd(12)} rec ${String(rec).padStart(4)} | ${sc.label}\n    ${row.join('\n    ')}`);
}

// TUNE=1: binary-search each fight's strength so its first (expected) squad wins ~TARGET (default 70%)
// at the gang's off-time, then report the win rate at its home time (aim: about 45%).
if (process.env.TUNE) {
  const target = Number(process.env.TARGET ?? 0.7);
  const seen = new Set<string>();
  const out: Record<string, number> = {};
  console.log(`\nTuned strengths (off-time win ≈ ${Math.round(target * 100)}% for the expected squad):`);
  for (const sc of scenarios.filter((x) => !only || x.fight.startsWith(only))) {
    if (seen.has(sc.fight)) continue;
    seen.add(sc.fight);
    const fight = FIGHTS[sc.fight]!;
    const rate = (k: number, phase: Phase) => {
      fight.strength = k;
      const input = battleInputFor(fillSquad(sc.state, 'balanced', phase), sc.fight, phase);
      let w = 0;
      for (let seed = 1; seed <= N; seed++) if (runBattle(input, seed).outcome === 'win') w++;
      return w / N;
    };
    let lo = 0.3;
    let hi = fight.area === 'xindian' ? 8 : 4;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (rate(mid, offOf(sc.fight)) > target) lo = mid;
      else hi = mid;
    }
    const k = Number(((lo + hi) / 2).toFixed(3));
    out[sc.fight] = k;
    const off = rate(k, offOf(sc.fight));
    const home = rate(k, homeOf(sc.fight));
    console.log(`  ${sc.fight.padEnd(15)} strength ${k}  off-time ${Math.round(off * 100)}%  home ${Math.round(home * 100)}%`);
  }
  if (process.env.JSON) console.log(`JSON ${JSON.stringify(out)}`);
}
