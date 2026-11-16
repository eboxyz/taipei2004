/**
 * Turf War tuning: plays each Wanhua fight many times with the squad a typical
 * player has at that point, by day and by night, and prints win rates and lengths.
 *   npm run sim:fights
 */
import { runBattle } from '../src/game/battle';
import { FIGHTS } from '../src/game/content/fights';
import { initialState } from '../src/game/state';
import { battleInputFor, buildYourSide, recommendedPower } from '../src/game/turf';
import type { GameState, Phase } from '../src/game/types';

const N = Number(process.env.N ?? 400);

// Tuning overrides, e.g. wanhua_lt1="1:0.7,2:1" sets level:scale per enemy unit.
for (const f of Object.values(FIGHTS)) {
  const o = process.env[f.id];
  if (!o) continue;
  o.split(',').forEach((pair, i) => {
    const [lv, sc] = pair.split(':').map(Number);
    const u = f.units[i];
    if (u && lv) u.level = lv;
    if (u && sc) u.scale = sc;
  });
}

function withCrew(levels: Record<string, number>, slots: number, extra: Partial<GameState> = {}): GameState {
  const s = initialState(0);
  const characters = { ...s.characters };
  for (const [id, level] of Object.entries(levels)) characters[id] = { level, xp: 0, stars: 1 };
  // Hai-shu guards a Wanhua lot (Home Turf), A-Cai manages one.
  const lots = { w1: { level: 10, invested: 0, security: 'hai_shu', manager: 'a_cai' } };
  return { ...s, characters, lots, meta: { ...s.meta, squadSlots: slots }, ...extra };
}

const scenarios: { fight: string; label: string; state: GameState }[] = [
  { fight: 'wanhua_lt1', label: 'starters Lv1', state: withCrew({ hai_shu: 1, a_di: 1, a_cai: 1 }, 3) },
  { fight: 'wanhua_lt1', label: 'starters Lv2', state: withCrew({ hai_shu: 2, a_di: 2, a_cai: 2 }, 3) },
  { fight: 'wanhua_lt2', label: '+A-Biao Lv1, starters Lv2', state: withCrew({ hai_shu: 2, a_di: 2, a_cai: 2, a_biao: 1 }, 4) },
  { fight: 'wanhua_lt2', label: '+A-Biao Lv2, starters Lv3', state: withCrew({ hai_shu: 3, a_di: 3, a_cai: 3, a_biao: 2 }, 4) },
  { fight: 'wanhua_boss', label: '+Gui-yi Lv1, A-Biao Lv2, starters Lv3', state: withCrew({ hai_shu: 3, a_di: 3, a_cai: 3, a_biao: 2, gui_yi: 1 }, 5) },
  { fight: 'wanhua_boss', label: 'Gui-yi Lv3, A-Biao Lv4, starters Lv4', state: withCrew({ hai_shu: 4, a_di: 4, a_cai: 4, a_biao: 4, gui_yi: 3 }, 5) },
];

for (const sc of scenarios) {
  const fight = FIGHTS[sc.fight]!;
  const rec = recommendedPower(fight);
  const row: string[] = [];
  for (const phase of ['day', 'night'] as Phase[]) {
    const power = buildYourSide(sc.state, fight, phase).power;
    const input = battleInputFor(sc.state, sc.fight, phase);
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
    row.push(`${phase}: power ${power} → win ${Math.round((wins / N) * 100)}% (${wins ? Math.round(tWin / wins) : '-'}s, avg ${Math.round(tAll / N)}s)`);
  }
  console.log(`${sc.fight.padEnd(12)} rec ${String(rec).padStart(4)} | ${sc.label}\n    ${row.join('\n    ')}`);
}
