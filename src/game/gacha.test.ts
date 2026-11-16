import { describe, expect, it } from 'vitest';
import { mulberry32 } from './battle';
import { binderIncomeMult, isPageComplete, pageMembers, payBinderPages, uniqueCards } from './binder';
import { CHARACTERS } from './content/characters';
import {
  addCard,
  canDraw,
  dayKey,
  draw,
  featuredOn,
  inPool,
  LOTTERY_PITY,
  ODDS,
  OVERFLOW_INCENSE,
  pickCard,
  poolFor,
  rollRarity,
  TEMPLE_PITY,
  throwBlocks,
  throwForUpgrade,
  type CardGain,
} from './gacha';
import { initialState } from './state';
import { resolveFight } from './turf';
import type { DrawKind, GameState, Rarity } from './types';

const NOW = Date.UTC(2026, 10, 15, 12);
const kinds: DrawKind[] = ['scratch', 'temple', 'lottery'];

function player(extra: Partial<GameState> = {}): GameState {
  const s = initialState(0);
  return { ...s, zodiac: 'ox', currencies: { scratch: 999, incense: 9999, lottery: 999 }, ...extra };
}

describe('pools and odds', () => {
  it('odds add up to 100%', () => {
    for (const k of kinds) expect(Object.values(ODDS[k]).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('every rarity a draw can roll has someone in it', () => {
    for (const k of kinds)
      for (const r of ['N', 'R', 'SR', 'SSR'] as Rarity[]) if (ODDS[k][r] > 0) expect(poolFor(k, r, NOW).length).toBeGreaterThan(0);
  });

  it('earned cards never come from draws; exclusives stay in their machine', () => {
    for (const k of kinds) {
      expect(inPool('kun_bo', k, NOW)).toBe(false);
      expect(inPool('a_biao', k, NOW)).toBe(false);
      expect(inPool('a_cai', k, NOW)).toBe(true);
    }
    expect(inPool('jackpot', 'scratch', NOW)).toBe(true);
    expect(inPool('jackpot', 'temple', NOW)).toBe(false);
    expect(inPool('bao_zhu', 'lottery', NOW)).toBe(true);
  });

  it('the featured card joins the lottery that week', () => {
    const feat = featuredOn(NOW);
    expect(inPool(feat, 'lottery', NOW)).toBe(true);
    expect(featuredOn(NOW + 7 * 24 * 3600 * 1000)).not.toBe(feat);
  });

  it('rolls match the published scratch odds', () => {
    const rng = mulberry32(1);
    const n = 100_000;
    const counts: Record<Rarity, number> = { N: 0, R: 0, SR: 0, SSR: 0 };
    for (let i = 0; i < n; i++) counts[rollRarity('scratch', rng)]++;
    expect(counts.N / n).toBeCloseTo(0.7, 1);
    expect(counts.R / n).toBeCloseTo(0.275, 1);
    expect(counts.SSR / n).toBeGreaterThan(0.003);
    expect(counts.SSR / n).toBeLessThan(0.008);
  });

  it('zodiac roles turn up more often inside a tier', () => {
    // Ox favours bouncers: Hai-shu (R bouncer) vs A-Cai (R broker) in scratch R.
    const rng = mulberry32(2);
    let hai = 0;
    let cai = 0;
    for (let i = 0; i < 20_000; i++) {
      const id = pickCard(player(), 'scratch', 'R', rng, NOW);
      if (id === 'hai_shu') hai++;
      if (id === 'a_cai') cai++;
    }
    expect(hai / cai).toBeGreaterThan(1.3);
  });
});

describe('drawing', () => {
  it('needs a zodiac first, then pays the cost', () => {
    expect(canDraw(initialState(0), 'scratch', NOW).ok).toBe(false);
    const r = draw(player(), 'scratch', mulberry32(3), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currencies.scratch).toBe(998);
      expect(r.result.gains).toHaveLength(1);
    }
  });

  it('one free temple visit a day', () => {
    const s = player({ currencies: { scratch: 0, incense: 0, lottery: 0 } });
    expect(canDraw(s, 'temple', NOW)).toMatchObject({ ok: true, free: true });
    const r = draw(s, 'temple', mulberry32(4), NOW);
    expect(r.ok && r.result.free).toBe(true);
    if (!r.ok) return;
    expect(r.state.draws.lastFreeTemple).toBe(dayKey(NOW));
    expect(canDraw(r.state, 'temple', NOW).ok).toBe(false);
    expect(canDraw(r.state, 'temple', NOW + 24 * 3600 * 1000).free).toBe(true);
  });

  it('every 10th temple draw is SR or better', () => {
    let s = player({ draws: { ...player().draws, lastFreeTemple: dayKey(NOW), templePity: TEMPLE_PITY - 1 } });
    const lowRng = () => 0.01; // would always roll N
    const r = draw(s, 'temple', lowRng, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(['SR', 'SSR']).toContain(r.result.gains[0]!.rarity);
    expect(r.result.pity).toBe(true);
    s = r.state;
    expect(s.draws.templePity).toBe(0);
  });

  it('every lottery ticket has an SR or better, and the 40th has an SSR', () => {
    const rng = mulberry32(5);
    let s = player();
    for (let i = 0; i < 50; i++) {
      const r = draw(s, 'lottery', rng, NOW);
      if (!r.ok) throw new Error(r.reason);
      expect(r.result.gains).toHaveLength(3);
      expect(r.result.gains.some((g) => g.rarity === 'SR' || g.rarity === 'SSR')).toBe(true);
      s = r.state;
    }
    const pityState = player({ draws: { ...player().draws, lotteryPity: LOTTERY_PITY - 1 } });
    const r = draw(pityState, 'lottery', () => 0.01, NOW);
    expect(r.ok && r.result.gains.some((g) => g.rarity === 'SSR')).toBe(true);
  });
});

describe('stars and duplicates', () => {
  it('duplicates add stars up to ★5, then trade in for incense', () => {
    let s = player();
    for (let i = 0; i < 4; i++) s = addCard(s, 'a_cai').state;
    expect(s.characters.a_cai!.stars).toBe(5);
    const before = s.currencies.incense;
    const r = addCard(s, 'a_cai');
    expect(r.state.characters.a_cai!.stars).toBe(5);
    expect(r.state.currencies.incense).toBe(before + OVERFLOW_INCENSE.R);
  });

  it('beating a leader you already own adds a star', () => {
    const s = { ...player(), characters: { ...player().characters, a_biao: { level: 3, xp: 0, stars: 1 } } };
    const { state, result } = resolveFight(s, 'wanhua_lt1', 'win');
    expect(result.joined).toBeNull();
    expect(state.characters.a_biao!.stars).toBe(2);
    expect(result.starUp).toEqual({ charId: 'a_biao', stars: 2 });
  });
});

describe('moon blocks', () => {
  it('three 聖筊 in a row happens about 12.5% of the time', () => {
    const rng = mulberry32(6);
    let wins = 0;
    const n = 40_000;
    for (let i = 0; i < n; i++) if (throwBlocks(rng).filter((b) => b === 'sheng').length === 3) wins++;
    expect(wins / n).toBeCloseTo(0.125, 1);
  });

  it('a win swaps the card for the next rarity; a miss keeps it', () => {
    const r = draw(player(), 'temple', () => 0.01, NOW); // N card
    if (!r.ok) throw new Error();
    const gain = r.result.gains[0]!;
    expect(gain.rarity).toBe('N');
    const miss = throwForUpgrade(r.state, gain, () => 0.9, NOW);
    expect(miss.upgraded).toBeNull();
    expect(miss.state).toBe(r.state);

    let i = 0;
    const lucky = () => (i++ < 3 ? 0.1 : 0.5); // three 聖筊, then pick
    const win = throwForUpgrade(r.state, gain, lucky, NOW);
    expect(win.upgraded?.rarity).toBe('R');
    expect(win.state.characters[win.upgraded!.charId]).toBeDefined();
    if (win.upgraded!.charId !== gain.charId && gain.isNew) expect(win.state.characters[gain.charId]).toBeUndefined();
  });

  it('SSR cards have nothing to upgrade into', () => {
    const gain: CardGain = { charId: 'a_tai', rarity: 'SSR', isNew: true, starsBefore: 0, starsAfter: 1, incense: 0, prev: null };
    expect(throwForUpgrade(player(), gain, () => 0.1, NOW).upgraded).toBeNull();
  });
});

describe('binder', () => {
  it('pages group cards by faction', () => {
    expect(pageMembers('agency').map((c) => c.id).sort()).toEqual(['a_cai', 'a_di', 'hai_shu', 'intern']);
    const total = ['agency', 'miaokou', 'molong', 'yuejian', 'jintangchi', 'tongtian', 'independent'].reduce(
      (n, f) => n + pageMembers(f as never).length,
      0,
    );
    expect(total).toBe(30);
  });

  it('a completed page pays one lottery ticket, once', () => {
    let s = player();
    s = addCard(s, 'intern').state;
    expect(isPageComplete(s, 'agency')).toBe(true);
    const a = payBinderPages(s);
    expect(a.pages).toEqual(['agency']);
    expect(a.state.currencies.lottery).toBe(s.currencies.lottery + 1);
    expect(payBinderPages(a.state).pages).toEqual([]);
  });

  it('every 10 unique cards adds 5% income', () => {
    let s = player();
    expect(binderIncomeMult(s, 'zhongshan')).toBe(1);
    const ids = Object.keys(CHARACTERS).filter((id) => CHARACTERS[id]!.rarity !== 'NPC' && !s.characters[id]);
    for (const id of ids.slice(0, 10 - uniqueCards(s))) s = addCard(s, id).state;
    expect(uniqueCards(s)).toBe(10);
    expect(binderIncomeMult(s, 'zhongshan')).toBeCloseTo(1.05);
  });
});
