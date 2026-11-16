import type { AreaId, FactionId, FightKey, Phase, SquadStyle } from '../types';

export interface EnemyDef {
  id: string;
  level: number;
  /** 0–1 front, 2–4 back, 5–6 commanders. */
  slot: number;
  grunt?: boolean;
  /** Stat multiplier for this rival (tuning). */
  scale?: number;
  name?: string;
  nameZh?: string;
}

export interface FightDef {
  id: string;
  area: AreaId;
  key: FightKey;
  leader: string;
  units: EnemyDef[];
  /** Who a Procession calls in. */
  runner?: EnemyDef;
  /** Seconds the rival needs to hold out to win. */
  timeLimit: number;
  /** Shown on the prep screen: about where a typical squad starts winning by day. Tuned with `npm run sim:fights`. */
  recommended: number;
  /** Paid on the first win of each run. */
  rewards: { incense: number; lottery: number };
  /** Squad slots unlocked (permanently) by the first win. */
  unlockSlots: number;
  /** Multiplies every rival's stats (tuning, default 1). */
  strength?: number;
  intro: string;
  /** Shown on the results screen after a loss, when nothing more specific applies. */
  tip: string;
}

const temple = { name: 'Temple Punk', nameZh: '廟口小弟' };

/**
 * Each gang's home time: its fighters get the same +20% your crew does (PHASE_BONUS), so a fight
 * at the gang's home time is harder and the other half of the day is the opening.
 */
export const HOME_TIME: Partial<Record<FactionId, { phase: Phase; why: string }>> = {
  miaokou: { phase: 'day', why: 'the temple square is busiest by day' },
  molong: { phase: 'night', why: 'the scooter crews race after dark' },
  yuejian: { phase: 'night', why: 'the lounges open at night' },
  jintangchi: { phase: 'day', why: 'the boutiques are full by day' },
  tongtian: { phase: 'day', why: 'the permit offices keep day hours' },
  xiaoxiao: { phase: 'day', why: 'they keep office hours' },
};

/**
 * Matchup advice per district (its boss), measured with `STYLES=1 npm run sim:fights` against the
 * expected crews at the gang's off-time (balance pass, 2026-11-16). FIGHT_MATCHUPS overrides a lieutenant
 * that wants a different style.
 */
export const MATCHUPS: Partial<Record<AreaId, { style: SquadStyle; text: string }>> = {
  wanhua: { style: 'balanced', text: 'Miaokou Gang keeps calling in troupe runners. Try All-around, and keep hit-all fighters in the army to clear the crowd.' },
  ximending: { style: 'offense', text: 'Molong Society’s scooter crews are fast and fragile. Try Offensive and burn them down before the rush builds.' },
  zhongshan: { style: 'balanced', text: 'Yuejian Society charms your crew and heals her staff. Try All-around to keep damage in the army with steady commander support; stuns can help too.' },
  east: { style: 'balanced', text: 'Jin Tangchi Group shelters behind shielded bodyguards, and a one-note squad stalls against them. Try All-around, with a scrivener to strip defenses.' },
  xindian: { style: 'defense', text: 'Xiaoxiao charges its agents’ skills quickly. Try Defensive to keep your front standing through the paperwork.' },
  xinyi: { style: 'offense', text: 'Tongtian Development gains a permit buff every 15 seconds. Try Offensive to keep damage on the field and finish before the buffs build up.' },
};

/** Lieutenants whose best style differs from their district's boss. */
export const FIGHT_MATCHUPS: Record<string, { style: SquadStyle; text: string }> = {
  ximending_lt1: { style: 'balanced', text: 'Xiao Zhen’s Bad Ink weakens one fighter at a time. Try All-around to spread your power across the squad.' },
  zhongshan_lt1: { style: 'offense', text: 'A-Jian taunts everyone into hitting him. Try Offensive and burst him down.' },
};

/** The matchup hint for a fight: its own, else its district's. */
export function matchupFor(fightId: string): { style: SquadStyle; text: string } | undefined {
  const fight = FIGHTS[fightId];
  return FIGHT_MATCHUPS[fightId] ?? (fight ? MATCHUPS[fight.area] : undefined);
}

export const FIGHTS: Record<string, FightDef> = {
  wanhua_lt1: {
    id: 'wanhua_lt1',
    area: 'wanhua',
    key: 'lt1',
    leader: 'a_biao',
    units: [
      { id: 'a_biao', level: 1, slot: 0, scale: 0.8 },
      { id: 'street_punk', level: 2, slot: 1, grunt: true, ...temple },
      { id: 'street_punk', level: 1, slot: 2, grunt: true, ...temple },
    ],
    timeLimit: 75,
    strength: 1.021,
    recommended: 115,
    rewards: { incense: 10, lottery: 0 },
    unlockSlots: 4,
    intro: 'A-Biao collects "festival fees" from every stall around the temple. He brought firecrackers.',
    tip: 'A-Cai buys out a punk when his skill charges. Keep him in the back row where he is safe.',
  },
  wanhua_lt2: {
    id: 'wanhua_lt2',
    area: 'wanhua',
    key: 'lt2',
    leader: 'gui_yi',
    units: [
      { id: 'street_punk', level: 6, slot: 0, grunt: true, scale: 1.4, ...temple },
      { id: 'street_punk', level: 6, slot: 1, grunt: true, scale: 1.4, ...temple },
      { id: 'gui_yi', level: 5, slot: 2 },
      { id: 'street_punk', level: 5, slot: 3, grunt: true, scale: 1.4, ...temple },
    ],
    timeLimit: 75,
    strength: 1.129,
    recommended: 210,
    rewards: { incense: 10, lottery: 0 },
    unlockSlots: 5,
    intro: 'Gui-yi keeps the temple donation ledger, and the gang\'s real books. Her shields keep her punks standing.',
    tip: "A-Biao's Firecracker String hits every enemy at once. Put him up front.",
  },
  wanhua_boss: {
    id: 'wanhua_boss',
    area: 'wanhua',
    key: 'boss',
    leader: 'kun_bo',
    units: [
      { id: 'street_punk', level: 5, slot: 0, grunt: true, scale: 1.6, ...temple },
      { id: 'a_shun', level: 4, slot: 1, scale: 1.3 },
      { id: 'street_punk', level: 5, slot: 2, grunt: true, scale: 1.6, ...temple },
      { id: 'street_punk', level: 4, slot: 3, grunt: true, scale: 1.6, ...temple },
      { id: 'kun_bo', level: 3, slot: 6 },
    ],
    runner: { id: 'street_punk', level: 3, slot: -1, grunt: true, scale: 1.1, name: 'Troupe Runner', nameZh: '陣頭' },
    timeLimit: 120,
    strength: 1.031,
    recommended: 315,
    rewards: { incense: 20, lottery: 1 },
    unlockSlots: 6,
    intro: 'Kun-bo has run the temple square from the same red plastic stool for forty years. His procession never stops coming.',
    tip: 'Kun-bo calls in a troupe runner every 15 s. Hit-all skills like Firecracker String clear them out.',
  },
};

const scooter = { name: 'Scooter Kid', nameZh: '機車少年' };
const waiter = { name: 'Lounge Waiter', nameZh: '少爺' };
const guard = { name: 'Bodyguard', nameZh: '保鑣' };
const worker = { name: 'Site Worker', nameZh: '工地工人' };

/** A rival grunt: the street-punk card, renamed and recoloured per gang. */
const g = (level: number, slot: number, scale: number, who: { name: string; nameZh: string }): EnemyDef => ({
  id: 'street_punk',
  level,
  slot,
  scale,
  grunt: true,
  ...who,
});

Object.assign(FIGHTS, {
  ximending_lt1: {
    id: 'ximending_lt1',
    area: 'ximending',
    key: 'lt1',
    leader: 'xiao_zhen',
    units: [g(6, 0, 1.8, scooter), g(6, 1, 1.8, scooter), { id: 'xiao_zhen', level: 5, slot: 2 }, g(5, 3, 1.8, scooter)],
    timeLimit: 75,
    recommended: 480,
    strength: 1.686,
    rewards: { incense: 10, lottery: 0 },
    unlockSlots: 0,
    intro: 'Xiao Zhen runs the best tattoo chair on the street. Her Bad Ink leaves your fighters hitting like wet noodles.',
    tip: 'Xiao Zhen weakens one fighter at a time. Spread your damage across several strong cards.',
  },
  ximending_lt2: {
    id: 'ximending_lt2',
    area: 'ximending',
    key: 'lt2',
    leader: 'a_gan',
    units: [{ id: 'a_gan', level: 7, slot: 0 }, g(7, 1, 1.9, scooter), g(7, 2, 1.9, scooter), g(6, 3, 1.9, scooter), g(6, 4, 1.9, scooter)],
    timeLimit: 75,
    recommended: 550,
    strength: 1.042,
    rewards: { incense: 10, lottery: 0 },
    unlockSlots: 0,
    intro: 'A-Gan has the high score on every machine on the street, and a five-hit combo to match.',
    tip: 'A-Gan hits fast. Bouncers 圍事 with Taunt soak her combos for the rest of the squad.',
  },
  ximending_boss: {
    id: 'ximending_boss',
    area: 'ximending',
    key: 'boss',
    leader: 'a_jie',
    units: [g(8, 0, 1.6, scooter), { id: 'a_hao', level: 7, slot: 1, scale: 1.2 }, g(8, 2, 1.6, scooter), g(8, 3, 1.6, scooter), g(7, 4, 1.6, scooter), { id: 'a_jie', level: 8, slot: 6 }],
    timeLimit: 120,
    recommended: 570,
    strength: 1.109,
    rewards: { incense: 20, lottery: 1 },
    unlockSlots: 7,
    intro: 'A-Jie leads the scooter crews that own Ximending after dark. They are fast, loud, and gone before you blink.',
    tip: 'Scooter Crew makes his whole army 25% faster. Bouncers and hit-all skills thin the crowd before it swarms you.',
  },
  zhongshan_lt1: {
    id: 'zhongshan_lt1',
    area: 'zhongshan',
    key: 'lt1',
    leader: 'a_jian',
    units: [{ id: 'a_jian', level: 11, slot: 0 }, g(11, 1, 2.2, waiter), g(11, 2, 2.2, waiter), g(10, 3, 2.2, waiter), g(10, 4, 2.2, waiter)],
    timeLimit: 75,
    recommended: 1250,
    strength: 1.544,
    rewards: { incense: 12, lottery: 0 },
    unlockSlots: 0,
    intro: 'A-Jian has poured drinks on Linsen North Road for twenty years. At Last Orders, everyone has to deal with him first.',
    tip: 'A-Jian taunts: everyone must hit him. Strip his defense with a scrivener 代書, or burst him down.',
  },
  zhongshan_lt2: {
    id: 'zhongshan_lt2',
    area: 'zhongshan',
    key: 'lt2',
    leader: 'coco',
    units: [g(13, 0, 2.3, waiter), g(13, 1, 2.3, waiter), { id: 'coco', level: 13, slot: 2 }, g(12, 3, 2.3, waiter), g(12, 4, 2.3, waiter)],
    timeLimit: 75,
    recommended: 1310,
    strength: 2.098,
    rewards: { incense: 12, lottery: 0 },
    unlockSlots: 0,
    intro: "Coco books every room in the alleys from one charm-covered flip phone. Her Fine Print leaves your toughest card exposed.",
    tip: 'Coco exposes one fighter at a time. Shields from accountants 會計 cover the gap.',
  },
  zhongshan_boss: {
    id: 'zhongshan_boss',
    area: 'zhongshan',
    key: 'boss',
    leader: 'yue_jie',
    units: [g(15, 0, 2.2, waiter), g(15, 1, 2.2, waiter), g(14, 2, 2.2, waiter), g(14, 3, 2.2, waiter), g(14, 4, 2.2, waiter), { id: 'yue_jie', level: 15, slot: 6 }],
    timeLimit: 120,
    recommended: 1310,
    strength: 1.574,
    rewards: { incense: 25, lottery: 1 },
    unlockSlots: 0,
    intro: 'Yue-jie owns the lantern-lit lounges of the 條通 alleys. Her staff never seem to tire, and nobody refuses her a drink.',
    tip: 'Last Call heals her staff every second and charms one of yours at the start. Burst damage and stuns beat the healing.',
  },
  east_lt1: {
    id: 'east_lt1',
    area: 'east',
    key: 'lt1',
    leader: 'da_kuai',
    units: [{ id: 'da_kuai', level: 18, slot: 0 }, g(18, 1, 2.6, guard), g(17, 2, 2.6, guard), g(17, 3, 2.6, guard), g(17, 4, 2.6, guard)],
    timeLimit: 75,
    recommended: 2360,
    strength: 2.449,
    rewards: { incense: 15, lottery: 0 },
    unlockSlots: 0,
    intro: 'Da-kuai has never smiled on duty. He blocks doorways, punches, and bullets, in that order.',
    tip: 'Human Wall makes Da-kuai the only target. Hit-all skills reach the guards behind him.',
  },
  east_lt2: {
    id: 'east_lt2',
    area: 'east',
    key: 'lt2',
    leader: 'vivi',
    units: [g(20, 0, 2.7, guard), g(20, 1, 2.7, guard), { id: 'vivi', level: 20, slot: 2 }, { id: 'lao_liu', level: 19, slot: 3, scale: 1.4 }, g(19, 4, 2.7, guard)],
    timeLimit: 75,
    recommended: 2460,
    strength: 2.638,
    rewards: { incense: 15, lottery: 0 },
    unlockSlots: 0,
    intro: "Vivi carries the young master's credit cards and pays for everything, including his bodyguards' second chances.",
    tip: 'Company Card shields her whole back row. Runners 小弟 and dash attacks get behind the guards.',
  },
  east_boss: {
    id: 'east_boss',
    area: 'east',
    key: 'boss',
    leader: 'jin_shao',
    units: [g(23, 0, 2.8, guard), g(23, 1, 2.8, guard), g(22, 2, 2.8, guard), g(22, 3, 2.8, guard), g(22, 4, 2.8, guard), { id: 'jin_shao', level: 23, slot: 6 }],
    timeLimit: 120,
    recommended: 2490,
    strength: 1.943,
    rewards: { incense: 30, lottery: 1 },
    unlockSlots: 0,
    intro: "Jin-shao has never paid full price for anything. His bodyguards start every fight behind his father's money.",
    tip: "Daddy's Money shields his front row. Scriveners 代書 strip defenses so your hits land.",
  },
  xinyi_lt1: {
    id: 'xinyi_lt1',
    area: 'xinyi',
    key: 'lt1',
    leader: 'secretary_lin',
    units: [g(26, 0, 3, worker), g(26, 1, 3, worker), { id: 'secretary_lin', level: 26, slot: 2 }, g(25, 3, 3, worker), g(25, 4, 3, worker)],
    timeLimit: 75,
    recommended: 4110,
    strength: 2.872,
    rewards: { incense: 18, lottery: 0 },
    unlockSlots: 0,
    intro: 'Secretary Lin carries two flip phones: one for the city council, one for the chairman. Your permits are always "under review".',
    tip: 'Zoning Change stuns your strongest fighter. A wide squad keeps swinging while one card is stuck.',
  },
  xinyi_lt2: {
    id: 'xinyi_lt2',
    area: 'xinyi',
    key: 'lt2',
    leader: 'tie_ge',
    units: [{ id: 'tie_ge', level: 29, slot: 0 }, g(29, 1, 3.1, worker), g(28, 2, 3.1, worker), g(28, 3, 3.1, worker), g(28, 4, 3.1, worker)],
    timeLimit: 75,
    recommended: 4250,
    strength: 2.472,
    rewards: { incense: 18, lottery: 0 },
    unlockSlots: 0,
    intro: 'Tie-ge has poured the foundation for half the towers in Xinyi. He swings rebar like a baseball bat.',
    tip: 'Rebar Swing hits hard and knocks fighters off balance. Healers 店長 keep the front row standing.',
  },
  xinyi_boss: {
    id: 'xinyi_boss',
    area: 'xinyi',
    key: 'boss',
    leader: 'tian_dong',
    units: [g(33, 0, 3.2, worker), g(33, 1, 3.2, worker), g(32, 2, 3.2, worker), g(32, 3, 3.2, worker), g(32, 4, 3.2, worker), { id: 'tian_dong', level: 33, slot: 6 }],
    timeLimit: 120,
    recommended: 4270,
    strength: 2.034,
    rewards: { incense: 40, lottery: 2 },
    unlockSlots: 0,
    intro: 'Chairman Tian-dong is building the tallest tower in the world, and he has friends in every office that matters.',
    tip: 'Permits make his army 5% stronger every 15 s. Win fast: bring your hardest hitters and skip the slow builds.',
  },
  xindian_lt1: {
    id: 'xindian_lt1', area: 'xindian', key: 'lt1', leader: 'xiaoxiao_agent',
    units: [g(38, 0, 3.2, { name: 'Branch Guard', nameZh: '分店警衛' }), g(38, 1, 3.2, { name: 'Branch Guard', nameZh: '分店警衛' }), { id: 'xiaoxiao_agent', level: 38, slot: 2 }, { id: 'intern', level: 37, slot: 3, grunt: true, name: 'Branch Clerk', nameZh: '分店職員' }, { id: 'intern', level: 37, slot: 4, grunt: true, name: 'Branch Clerk', nameZh: '分店職員' }],
    timeLimit: 75, recommended: 5800, strength: 4.901,
    rewards: { incense: 25, lottery: 0 }, unlockSlots: 0,
    intro: 'The smiling agent from your street tips has one last offer.',
    tip: 'Keep a sturdy front and hit the back-row clerks with skills.',
  },
  xindian_lt2: {
    id: 'xindian_lt2', area: 'xindian', key: 'lt2', leader: 'a_yin',
    units: [g(40, 0, 3.4, { name: 'Head Office Guard', nameZh: '總部警衛' }), g(40, 1, 3.4, { name: 'Head Office Guard', nameZh: '總部警衛' }), { id: 'a_yin', level: 40, slot: 2 }, { id: 'intern', level: 39, slot: 3, grunt: true, name: 'Contract Clerk', nameZh: '合約職員' }, { id: 'xiaoxiao_agent', level: 39, slot: 5 }],
    timeLimit: 75, recommended: 5900, strength: 4.066,
    rewards: { incense: 25, lottery: 1 }, unlockSlots: 0,
    intro: 'A-Yin has a stamp for every objection.',
    tip: 'His stamps strip defenses. Hit-all attacks can reach the paperwork behind the guards.',
  },
  xindian_boss: {
    id: 'xindian_boss', area: 'xindian', key: 'boss', leader: 'xiao_dong',
    units: [g(44, 0, 3.6, { name: 'Head Office Guard', nameZh: '總部警衛' }), g(44, 1, 3.6, { name: 'Head Office Guard', nameZh: '總部警衛' }), { id: 'a_yin', level: 43, slot: 2 }, { id: 'intern', level: 43, slot: 3, grunt: true, name: 'Contract Clerk', nameZh: '合約職員' }, { id: 'xiaoxiao_agent', level: 43, slot: 4 }, { id: 'xiao_dong', level: 44, slot: 6 }],
    timeLimit: 120, recommended: 6050, strength: 3.446,
    rewards: { incense: 50, lottery: 3 }, unlockSlots: 0,
    intro: 'Xiao-dong owns the chain. Every smile was business.',
    tip: 'Closing Time charges the agents’ skills. Bring damage and stuns before the next round of paperwork.',
  },
} satisfies Record<string, FightDef>);

export function fightFor(area: AreaId, key: FightKey): FightDef | undefined {
  return Object.values(FIGHTS).find((f) => f.area === area && f.key === key);
}

