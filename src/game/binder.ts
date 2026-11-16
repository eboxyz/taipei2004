/** 名片簿: which cards you own, page completion, and the permanent bonuses they give. */
import { BINDER_PAGES, BINDER_STEP, BINDER_STEP_INCOME } from './content/binder';
import { CHARACTERS } from './content/characters';
import type { AreaId, CharacterDef, FactionId, GameState } from './types';

export const COLLECTIBLES: CharacterDef[] = Object.values(CHARACTERS).filter((c) => c.rarity !== 'NPC');

const RARITY_ORDER = { SSR: 0, SR: 1, R: 2, N: 3, NPC: 4 } as const;

/** Cards on a faction's page, best first. */
export function pageMembers(faction: FactionId): CharacterDef[] {
  return COLLECTIBLES.filter((c) => c.faction === faction).sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
}

export function uniqueCards(state: GameState): number {
  return Object.keys(state.characters).filter((id) => CHARACTERS[id] && CHARACTERS[id].rarity !== 'NPC').length;
}

export function isPageComplete(state: GameState, faction: FactionId): boolean {
  return pageMembers(faction).every((c) => state.characters[c.id]);
}

/** Global income bonus from collecting: +5% per 10 unique cards. */
export function binderGlobalBonus(state: GameState): number {
  return Math.floor(uniqueCards(state) / BINDER_STEP) * BINDER_STEP_INCOME;
}

/** Income multiplier for a lot in `area`: the global bonus plus the area's faction page. */
export function binderIncomeMult(state: GameState, area: AreaId): number {
  let m = 1 + binderGlobalBonus(state);
  for (const p of BINDER_PAGES) if (p.bonus.kind === 'area_income' && p.bonus.area === area && isPageComplete(state, p.faction)) m += p.bonus.amount;
  return m;
}

export function binderLotDiscount(state: GameState): number {
  let d = 0;
  for (const p of BINDER_PAGES) if (p.bonus.kind === 'lot_discount' && isPageComplete(state, p.faction)) d += p.bonus.amount;
  return d;
}

export function binderSafeHours(state: GameState): number {
  let h = 0;
  for (const p of BINDER_PAGES) if (p.bonus.kind === 'safe_hours' && isPageComplete(state, p.faction)) h += p.bonus.amount;
  return h;
}

/** Pays 1 lottery ticket for each newly completed page. Call after any card is added. */
export function payBinderPages(state: GameState): { state: GameState; pages: FactionId[] } {
  const pages = BINDER_PAGES.map((p) => p.faction).filter((f) => !state.binderPaid.includes(f) && isPageComplete(state, f));
  if (pages.length === 0) return { state, pages };
  return {
    state: {
      ...state,
      binderPaid: [...state.binderPaid, ...pages],
      currencies: { ...state.currencies, lottery: state.currencies.lottery + pages.length },
    },
    pages,
  };
}
