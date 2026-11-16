import type { Role } from '../types';

/**
 * Turf War skills. Every character fires their signature skill when it charges.
 * In a commander slot they instead give an aura (always on) and fire the skill as an
 * ultimate: twice as strong on a long charge.
 */

export type SkillKind =
  | 'hit_all' // damage every enemy in the army rows
  | 'heavy' // one big hit (optional short stun)
  | 'flurry' // several quick hits
  | 'taunt' // enemies must hit this unit; takes less damage
  | 'shield_taunt' // big self-shield plus taunt
  | 'shield_weakest'
  | 'shield_back'
  | 'shield_front'
  | 'heal_all'
  | 'last_call' // heal everyone and stun one enemy
  | 'buyout' // remove the weakest enemy grunt if its health is at most Business × n
  | 'strip' // target takes more damage
  | 'stun_strongest'
  | 'stun_strip'
  | 'weaken' // target deals less damage
  | 'tipoff' // weaken and hit the enemy commanders
  | 'drum' // front row hits harder for a while
  | 'dash_back' // hit a back-row enemy
  | 'revive' // bring back one knocked-out ally, once per fight
  | 'summon' // call a troupe runner into the fight
  | 'haste' // army attacks faster for a while
  | 'permit' // army gains +5% stats, stacking
  | 'charge_agents' // agents' skills charge instantly by a chunk
  | 'rave' // army hits harder for a while, double at night
  | 'jackpot'; // heavy hit that often crits big

export type AuraKind =
  // Role auras (any Lieutenant-class commander)
  | 'grit' // 圍事: +15% health
  | 'muscle' // 打手: +15% damage
  | 'speed' // 小弟: +15% attack speed
  | 'tactics' // 軍師: skills charge 20% faster
  | 'lowball' // 房仲: enemy grunts start with 15% less health
  | 'red_tape' // 代書: enemies take 10% more damage
  | 'staff_meal' // 店長: army heals 1% health per second
  | 'insurance' // 會計: army starts with a shield worth 15% health
  // Boss-class signature auras
  | 'procession'
  | 'scooter_crew'
  | 'last_call'
  | 'daddys_money'
  | 'permits'
  | 'old_money'
  | 'rave'
  | 'lucky_streak';

export interface SkillDef {
  kind: SkillKind;
  /** Power multiplier on Muscle (gangsters) or Business (agents). */
  mult: number;
  /** Duration for timed effects. */
  secs?: number;
  /** Number of hits / units, where it applies. */
  n?: number;
  /** Seconds to charge in the army. */
  charge: number;
  /** Signature aura when commanding (Boss-class only). */
  aura?: AuraKind;
}

export const ROLE_AURA: Record<Role, AuraKind> = {
  weishi: 'grit',
  dashou: 'muscle',
  xiaodi: 'speed',
  junshi: 'tactics',
  fangzhong: 'lowball',
  daishu: 'red_tape',
  dianzhang: 'staff_meal',
  kuaiji: 'insurance',
};

export const AURA_TEXT: Record<AuraKind, string> = {
  grit: 'Army +15% health',
  muscle: 'Army +15% damage',
  speed: 'Army attacks 15% faster',
  tactics: 'Skills charge 20% faster',
  lowball: 'Enemy grunts start with 15% less health',
  red_tape: 'Enemies take 10% more damage',
  staff_meal: 'Army heals 1% health every second',
  insurance: 'Army starts shielded (15% of health)',
  procession: 'Calls a troupe runner in every 15 s',
  scooter_crew: 'Army attacks 25% faster',
  last_call: 'Army heals over time; charms one enemy at the start',
  daddys_money: 'Front row starts shielded (30% of health)',
  permits: 'Army +5% stats every 15 s, stacking',
  old_money: "Agents' skills charge 40% faster",
  rave: "Doubles the army's night bonus",
  lucky_streak: 'Any hit can crit for ×2.5',
};

export const SKILLS: Record<string, SkillDef> = {
  // Miaokou
  kun_bo: { kind: 'summon', mult: 1, n: 1, charge: 14, aura: 'procession' },
  a_biao: { kind: 'hit_all', mult: 0.9, charge: 11 },
  gui_yi: { kind: 'shield_weakest', mult: 6, charge: 10 },
  a_shun: { kind: 'drum', mult: 0.3, secs: 8, charge: 11 },
  // Molong
  a_jie: { kind: 'haste', mult: 0.25, secs: 6, charge: 12, aura: 'scooter_crew' },
  xiao_zhen: { kind: 'weaken', mult: 1, secs: 6, charge: 11 },
  a_gan: { kind: 'flurry', mult: 0.6, n: 5, charge: 10 },
  a_hao: { kind: 'dash_back', mult: 1.8, charge: 9 },
  street_punk: { kind: 'heavy', mult: 1.6, charge: 9 },
  // Yuejian
  yue_jie: { kind: 'last_call', mult: 4, secs: 2, charge: 12, aura: 'last_call' },
  a_jian: { kind: 'taunt', mult: 0.3, secs: 6, charge: 10 },
  coco: { kind: 'strip', mult: 1, secs: 6, charge: 11 },
  // Jin Tangchi
  jin_shao: { kind: 'shield_front', mult: 7, charge: 12, aura: 'daddys_money' },
  da_kuai: { kind: 'taunt', mult: 0.5, secs: 4, charge: 10 },
  vivi: { kind: 'shield_back', mult: 4, charge: 11 },
  lao_liu: { kind: 'revive', mult: 0.4, charge: 14 },
  // Tongtian
  tian_dong: { kind: 'permit', mult: 0.05, charge: 12, aura: 'permits' },
  secretary_lin: { kind: 'stun_strongest', mult: 0.6, secs: 3, charge: 12 },
  tie_ge: { kind: 'heavy', mult: 2.4, secs: 0.8, charge: 12 },
  // Agency
  a_cai: { kind: 'buyout', mult: 2.5, n: 12, charge: 13 },
  hai_shu: { kind: 'taunt', mult: 0.3, secs: 5, charge: 10 },
  a_di: { kind: 'flurry', mult: 0.8, n: 3, charge: 8 },
  intern: { kind: 'hit_all', mult: 0.6, charge: 11 },
  // Independents
  bao_zhu: { kind: 'charge_agents', mult: 0.4, charge: 12, aura: 'old_money' },
  a_tai: { kind: 'rave', mult: 0.3, secs: 6, charge: 12, aura: 'rave' },
  jackpot: { kind: 'jackpot', mult: 2, charge: 10, aura: 'lucky_streak' },
  chen_daishu: { kind: 'stun_strip', mult: 0.6, secs: 2, charge: 12 },
  lao_zhang: { kind: 'heal_all', mult: 4, charge: 12 },
  a_xiong: { kind: 'tipoff', mult: 1.2, secs: 8, charge: 12 },
  lao_zhou: { kind: 'shield_taunt', mult: 0.3, secs: 5, charge: 12 },
};

export const FALLBACK_SKILL: SkillDef = { kind: 'heavy', mult: 1.4, charge: 10 };

export function skillOf(id: string): SkillDef {
  return SKILLS[id] ?? FALLBACK_SKILL;
}
