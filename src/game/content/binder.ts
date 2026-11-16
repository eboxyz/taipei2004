import type { AreaId, FactionId } from '../types';

export type PageBonus =
  | { kind: 'area_income'; area: AreaId; amount: number }
  | { kind: 'lot_discount'; amount: number }
  | { kind: 'safe_hours'; amount: number };

export interface BinderPage {
  faction: FactionId;
  bonus: PageBonus;
  text: string;
}

/** Binder pages in display order, one per faction. Completing a page also pays 1 lottery ticket. */
export const BINDER_PAGES: BinderPage[] = [
  { faction: 'agency', bonus: { kind: 'lot_discount', amount: 0.05 }, text: 'Lots cost 5% less everywhere' },
  { faction: 'miaokou', bonus: { kind: 'area_income', area: 'wanhua', amount: 0.1 }, text: 'Wanhua lots earn 10% more' },
  { faction: 'molong', bonus: { kind: 'area_income', area: 'ximending', amount: 0.1 }, text: 'Ximending lots earn 10% more' },
  { faction: 'yuejian', bonus: { kind: 'area_income', area: 'zhongshan', amount: 0.1 }, text: 'Zhongshan lots earn 10% more' },
  { faction: 'jintangchi', bonus: { kind: 'area_income', area: 'east', amount: 0.1 }, text: 'East District lots earn 10% more' },
  { faction: 'tongtian', bonus: { kind: 'area_income', area: 'xinyi', amount: 0.1 }, text: 'Xinyi lots earn 10% more' },
  { faction: 'xiaoxiao', bonus: { kind: 'area_income', area: 'xindian', amount: 0.1 }, text: 'Xindian lots earn 10% more' },
  { faction: 'independent', bonus: { kind: 'safe_hours', amount: 2 }, text: 'The safe holds 2 more hours' },
];

/** Every this many unique cards adds global income. */
export const BINDER_STEP = 10;
export const BINDER_STEP_INCOME = 0.05;
