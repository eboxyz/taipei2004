/** 面子 Face upgrades: bought with Face from cashing out. Permanent across runs. */

export type Branch = 'business' | 'idle' | 'muscle' | 'network';

export interface FaceUpgrade {
  id: string;
  branch: Branch;
  name: string;
  zh: string;
  max: number;
  /** Face cost of the first level. */
  base: number;
  /** Each level costs this much more. */
  growth: number;
  /** What the upgrade does at a given level (0 = not bought). */
  effect: (level: number) => string;
}

export const BRANCHES: { id: Branch; name: string; zh: string; blurb: string }[] = [
  { id: 'business', name: 'Business', zh: '生意', blurb: 'Income, prices and a head start' },
  { id: 'idle', name: 'Idle', zh: '閒', blurb: 'The safe and automation' },
  { id: 'muscle', name: 'Muscle', zh: '拳頭', blurb: 'Turf War strength' },
  { id: 'network', name: 'Network', zh: '人脈', blurb: 'Events, draws and the index' },
];

const pct = (x: number) => `${Math.round(x * 100)}%`;

export const FACE_UPGRADES: FaceUpgrade[] = [
  // Business 生意
  { id: 'income', branch: 'business', name: 'Good Name', zh: '好名聲', max: 20, base: 2, growth: 1.6, effect: (l) => `All income +${pct(0.25 * l)}` },
  { id: 'lot_price', branch: 'business', name: 'Hard Bargain', zh: '殺價', max: 5, base: 3, growth: 2, effect: (l) => `Lots cost ${pct(0.05 * l)} less` },
  { id: 'upgrade_price', branch: 'business', name: 'Contractor Friends', zh: '包商朋友', max: 5, base: 3, growth: 2, effect: (l) => `Upgrades cost ${pct(0.04 * l)} less` },
  { id: 'seed', branch: 'business', name: 'Seed Money', zh: '本錢', max: 6, base: 4, growth: 2.4, effect: (l) => `Start each run with NT$${(5 * Math.pow(10, l)).toLocaleString('en-US')}萬` },
  { id: 'old_turf', branch: 'business', name: 'Old Turf', zh: '老地盤', max: 3, base: 8, growth: 3, effect: (l) => (l ? `Start with Wanhua's first ${2 * l} lots at Lv 10` : 'Start with Wanhua lots already bought') },
  // Idle 閒
  { id: 'safe', branch: 'idle', name: 'Bigger Safe', zh: '大保險箱', max: 10, base: 2, growth: 1.6, effect: (l) => `Safe holds ${4 + 2 * l} hours` },
  { id: 'bookkeeper', branch: 'idle', name: 'Bookkeeper on Staff', zh: '常駐會計', max: 1, base: 6, growth: 1, effect: (l) => (l ? 'The bookkeeper is hired from the start of every run' : 'Hire the bookkeeper from the start of every run') },
  { id: 'auto_staff', branch: 'idle', name: 'Duty Roster', zh: '排班表', max: 1, base: 8, growth: 1, effect: () => 'Auto-fills empty Manager and Security slots with free crew: best managers on your biggest earners, and guards just strong enough for each area' },
  { id: 'auto_upgrade', branch: 'idle', name: 'Standing Orders', zh: '自動加碼', max: 1, base: 12, growth: 1, effect: () => 'Half of what you earn goes to the best buy anywhere, new lots and upgrades alike. One switch in Office' },
  // Muscle 拳頭
  { id: 'training', branch: 'muscle', name: 'Training', zh: '練兵', max: 20, base: 2, growth: 1.6, effect: (l) => `Turf War stats +${pct(0.1 * l)}` },
  { id: 'command', branch: 'muscle', name: 'Presence', zh: '威望', max: 3, base: 6, growth: 2.2, effect: (l) => `Commander ultimates charge ${pct(0.15 * l)} faster` },
  { id: 'home_turf', branch: 'muscle', name: 'Local Hero', zh: '地頭蛇', max: 5, base: 4, growth: 2, effect: (l) => `Home Turf: +${3 + 2 * l}% Grit per Security` },
  { id: 'warm_up', branch: 'muscle', name: 'Warmed Up', zh: '熱身', max: 4, base: 5, growth: 2.2, effect: (l) => `Skills start ${pct(0.15 * l)} charged` },
  // Network 人脈
  { id: 'events', branch: 'network', name: 'Street Smarts', zh: '消息靈通', max: 3, base: 4, growth: 2.2, effect: (l) => `Street events ${pct(0.25 * l)} more often` },
  { id: 'scratch_luck', branch: 'network', name: 'Lucky Hands', zh: '手氣', max: 3, base: 6, growth: 2.5, effect: (l) => `Scratch cards: +${(1.5 * l).toFixed(1)}% SR, +${(0.5 * l).toFixed(1)}% SSR` },
  { id: 'incense', branch: 'network', name: 'Temple Regular', zh: '常客', max: 3, base: 5, growth: 2.2, effect: (l) => `Incense money from Turf Wars +${pct(0.5 * l)}` },
  { id: 'index', branch: 'network', name: 'Market Buzz', zh: '炒作', max: 4, base: 6, growth: 2.2, effect: (l) => `Price index grows ${pct(0.25 * l)} faster` },
];

export const FACE_BY_ID: Record<string, FaceUpgrade> = Object.fromEntries(FACE_UPGRADES.map((u) => [u.id, u]));
