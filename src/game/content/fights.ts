import type { AreaId, FightKey } from '../types';

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
  intro: string;
  /** Shown on the results screen after a loss, when nothing more specific applies. */
  tip: string;
}

const temple = { name: 'Temple Punk', nameZh: '廟口小弟' };

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
    recommended: 315,
    rewards: { incense: 20, lottery: 1 },
    unlockSlots: 6,
    intro: 'Kun-bo has run the temple square from the same red plastic stool for forty years. His procession never stops coming.',
    tip: 'Kun-bo calls in a troupe runner every 15 s. Hit-all skills like Firecracker String clear them out.',
  },
};

export function fightFor(area: AreaId, key: FightKey): FightDef | undefined {
  return Object.values(FIGHTS).find((f) => f.area === area && f.key === key);
}

