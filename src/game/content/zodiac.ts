import type { Role, Zodiac } from '../types';

export interface ZodiacDef {
  id: Zodiac;
  name: string;
  zh: string;
  /** Roles that turn up a little more often in your draws. */
  roles: [Role, Role];
  trait: string;
}

/** Each role is favoured by exactly three signs. */
export const ZODIAC: ZodiacDef[] = [
  { id: 'rat', name: 'Rat', zh: '鼠', roles: ['kuaiji', 'xiaodi'], trait: 'Quick and thrifty' },
  { id: 'ox', name: 'Ox', zh: '牛', roles: ['weishi', 'dashou'], trait: 'Strong and steady' },
  { id: 'tiger', name: 'Tiger', zh: '虎', roles: ['dashou', 'xiaodi'], trait: 'Bold and fast' },
  { id: 'rabbit', name: 'Rabbit', zh: '兔', roles: ['dianzhang', 'kuaiji'], trait: 'Gentle and careful' },
  { id: 'dragon', name: 'Dragon', zh: '龍', roles: ['junshi', 'dashou'], trait: 'Ambitious and proud' },
  { id: 'snake', name: 'Snake', zh: '蛇', roles: ['daishu', 'junshi'], trait: 'Clever and patient' },
  { id: 'horse', name: 'Horse', zh: '馬', roles: ['xiaodi', 'fangzhong'], trait: 'Restless and friendly' },
  { id: 'goat', name: 'Goat', zh: '羊', roles: ['dianzhang', 'weishi'], trait: 'Kind and protective' },
  { id: 'monkey', name: 'Monkey', zh: '猴', roles: ['fangzhong', 'junshi'], trait: 'Witty and persuasive' },
  { id: 'rooster', name: 'Rooster', zh: '雞', roles: ['daishu', 'kuaiji'], trait: 'Precise and tidy' },
  { id: 'dog', name: 'Dog', zh: '狗', roles: ['weishi', 'dianzhang'], trait: 'Loyal and watchful' },
  { id: 'pig', name: 'Pig', zh: '豬', roles: ['fangzhong', 'daishu'], trait: 'Lucky with money' },
];

export const ZODIAC_BY_ID = Object.fromEntries(ZODIAC.map((z) => [z.id, z])) as Record<Zodiac, ZodiacDef>;

/** Weight for favoured roles within a rarity tier. Rarity odds never change. */
export const ZODIAC_WEIGHT = 1.5;
