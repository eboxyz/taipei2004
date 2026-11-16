import { CHARACTERS, ROLES } from './content/characters';
import type { CharClass, CharState, Rarity, Role } from './types';

const RARITY_BASE: Record<Rarity, number> = { N: 10, R: 16, SR: 26, SSR: 40 };

/** [muscle, grit, business] weights per role. */
const ROLE_PROFILE: Record<Role, [number, number, number]> = {
  weishi: [0.8, 1.4, 0.3],
  dashou: [1.4, 1.0, 0.2],
  xiaodi: [1.0, 0.8, 0.3],
  junshi: [0.7, 0.8, 0.9],
  fangzhong: [0.3, 0.7, 1.4],
  daishu: [0.4, 0.7, 1.3],
  dianzhang: [0.4, 0.9, 1.2],
  kuaiji: [0.3, 0.8, 1.3],
};

export interface Stats {
  muscle: number;
  grit: number;
  business: number;
}

export function statsOf(id: string, cs: CharState | undefined): Stats {
  const def = CHARACTERS[id];
  if (!def || !def.role || def.rarity === 'NPC') return { muscle: 0, grit: 0, business: 0 };
  const base = RARITY_BASE[def.rarity];
  const [m, g, b] = ROLE_PROFILE[def.role];
  const level = cs?.level ?? 1;
  const stars = cs?.stars ?? 1;
  const f = (1 + 0.08 * (level - 1)) * (1 + 0.1 * (stars - 1));
  return {
    muscle: Math.round(base * m * f),
    grit: Math.round(base * g * f),
    business: Math.round(base * b * f),
  };
}

export function classOf(id: string): CharClass | null {
  const role = CHARACTERS[id]?.role;
  return role ? ROLES[role].cls : null;
}

export function xpToNext(level: number): number {
  return Math.round(40 * Math.pow(level, 1.5));
}

/** Adds XP and returns the new state plus how many levels were gained. */
export function addXp(cs: CharState, xp: number): { cs: CharState; gained: number } {
  let { level, xp: cur } = cs;
  cur += xp;
  let gained = 0;
  while (cur >= xpToNext(level)) {
    cur -= xpToNext(level);
    level += 1;
    gained += 1;
  }
  return { cs: { ...cs, level, xp: cur }, gained };
}
