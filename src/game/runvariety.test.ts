import { describe, expect, it } from 'vitest';
import { buyLot } from './actions';
import { classOf } from './characters';
import { checkCommissions, commissionStatus, drawCommissions } from './commissions';
import { ALL_LOTS } from './content/areas';
import { FIGHTS } from './content/fights';
import { FAST_XIMENDING_MS, MAX_SAFE_HOURS, SAVE_VERSION } from './constants';
import { buyPrice, lotIncome, netWorth, safeHours } from './economy';
import { claimEvent, nextEventDelay } from './events';
import { cashOut, cashOutPreview } from './face';
import { drawOffers, pickHeadline } from './headlines';
import { seeded } from './rng';
import { initialState, migrate } from './state';
import { buildTheirSide, resolveFight } from './turf';
import type { Commission, GameState, Headline } from './types';

const NOW = Date.UTC(2004, 0, 1, 8);

function withHeadline(h: Headline | null, s: GameState = initialState(NOW)): GameState {
  return { ...s, run: { ...s.run, headline: h } };
}

function withLots(ids: string[], s: GameState = initialState(NOW)): GameState {
  return { ...s, lots: Object.fromEntries(ids.map((id) => [id, { level: 1, invested: ALL_LOTS[id]!.price }])) };
}

describe('headlines', () => {
  it('a cash-out offers three different front pages, and picking one sets the run', () => {
    const s = { ...initialState(NOW), meta: { ...initialState(NOW).meta, claimedEver: ['wanhua' as const] } };
    const { state } = cashOut(s, NOW, seeded(7));
    expect(state.run.offers).toHaveLength(3);
    expect(new Set(state.run.offers.map((h) => h.id)).size).toBe(3);
    expect(state.run.headline).toBeNull();
    const picked = pickHeadline(state, 1);
    expect(picked.run.headline).toEqual(state.run.offers[1]);
    expect(picked.run.offers).toEqual([]);
  });

  it('the New MRT Line always names a Chapter 1 district', () => {
    for (let i = 0; i < 50; i++)
      for (const h of drawOffers(seeded(i))) if (h.id === 'mrt') expect(['wanhua', 'ximending', 'zhongshan', 'east', 'xinyi']).toContain(h.area);
  });

  it('Typhoon Days adds 4 hours, even past the usual cap', () => {
    const s = initialState(NOW);
    const maxed = { ...s, meta: { ...s.meta, upgrades: { safe: 10 } } };
    expect(safeHours(maxed)).toBe(MAX_SAFE_HOURS);
    expect(safeHours(withHeadline({ id: 'typhoon' }, maxed))).toBe(MAX_SAFE_HOURS + 4);
  });

  it('Night Market Fever: night businesses everywhere earn ×2 at night', () => {
    const s = withLots(['w3']); // the tea house is a night business
    const lot = ALL_LOTS.w3!;
    expect(lotIncome(s, lot, 'night') / lotIncome(s, lot, 'day')).toBeCloseTo(1.5);
    const fever = withHeadline({ id: 'night_market' }, s);
    expect(lotIncome(fever, lot, 'night') / lotIncome(fever, lot, 'day')).toBeCloseTo(2);
  });

  it('Election Year: the price index grows 50% faster', () => {
    const plain = buyLot({ ...initialState(NOW), cash: 1e9 }, 'w1');
    const election = buyLot(withHeadline({ id: 'election' }, { ...initialState(NOW), cash: 1e9 }), 'w1');
    expect(plain.ok && election.ok).toBe(true);
    if (plain.ok && election.ok) expect(election.state.index - 100).toBeCloseTo((plain.state.index - 100) * 1.5);
  });

  it('New MRT Line: only the named district gets cheaper', () => {
    const s = withHeadline({ id: 'mrt', area: 'wanhua' });
    expect(buyPrice(s, ALL_LOTS.w2!)).toBe(Math.ceil(ALL_LOTS.w2!.price * 0.7));
    expect(buyPrice(s, ALL_LOTS.x1!)).toBe(buyPrice(initialState(NOW), ALL_LOTS.x1!));
  });

  it('Temple Festival Year: events twice as often, processions pay double', () => {
    const s = withLots(['w1']);
    const fest = withHeadline({ id: 'festival' }, s);
    expect(nextEventDelay(fest, () => 0.5)).toBeCloseTo(nextEventDelay(s, () => 0.5) / 2);
    const event = { id: 1, area: 'wanhua' as const, kind: 'procession' as const, xiaoxiao: false, expiresIn: 60 };
    const a = claimEvent({ ...s, event }, () => 0, NOW)!;
    const b = claimEvent({ ...fest, event }, () => 0, NOW)!;
    expect(b.reward.cash).toBeCloseTo(a.reward.cash! * 2);
    expect(b.state.run.events).toBe(1);
  });

  it('Stock Rally: properties count 1.5× toward net worth', () => {
    const s = { ...withLots(['w1', 'w2']), cash: 0 };
    expect(netWorth(withHeadline({ id: 'stock_rally' }, s))).toBeCloseTo(netWorth(s) * 1.5);
  });

  it('Rearmed Rivals: stronger rivals, double incense and Face for first wins', () => {
    const fight = FIGHTS.wanhua_lt1!;
    const s = withLots(['w1']);
    const rearmed = withHeadline({ id: 'rearmed' }, s);
    expect(buildTheirSide(fight, rearmed).power).toBeGreaterThan(buildTheirSide(fight, s).power);
    const plain = resolveFight(s, fight.id, 'win', NOW);
    const hard = resolveFight(rearmed, fight.id, 'win', NOW);
    expect(hard.result.incense).toBe(plain.result.incense * 2);
    expect(cashOutPreview(hard.state).fromRearmed).toBe(1);
    expect(cashOutPreview(plain.state).fromRearmed).toBe(0);
  });
});

describe('commissions', () => {
  it('pays one lottery ticket, once', () => {
    const s = initialState(NOW);
    const c: Commission = { id: 'street5', from: 0, done: false };
    const ready = { ...s, run: { ...s.run, commissions: [c], events: 5 } };
    const r = checkCommissions(ready, NOW);
    expect(r.events).toEqual([{ kind: 'commission', id: 'street5' }]);
    expect(r.state.currencies.lottery).toBe(s.currencies.lottery + 1);
    expect(checkCommissions(r.state, NOW).events).toEqual([]);
  });

  it('counts "this run" goals from where the run started', () => {
    const s = initialState(NOW);
    const veteran = { ...s, stats: { ...s.stats, shakedownsRepelled: 40 } };
    const [c] = drawCommissions(veteran, () => 0.99, NOW).filter((x) => x.id === 'repel10');
    const c2 = c ?? { id: 'repel10' as const, from: 40, done: false };
    expect(c2.from).toBe(40);
    expect(commissionStatus({ ...veteran, stats: { ...veteran.stats, shakedownsRepelled: 47 } }, c2, NOW).have).toBe(7);
  });

  it('never offers one that is already done', () => {
    const s = { ...initialState(NOW), index: 140 };
    for (let i = 0; i < 30; i++) expect(drawCommissions(s, seeded(i), NOW).map((c) => c.id)).not.toContain('index130');
  });

  it('notices a win with only agents', () => {
    const s = withLots(['w1']);
    const agent = 'coco';
    expect(classOf(agent)).toBe('agent');
    // Coco fights from the back row (slot 2).
    const squad = s.squad.map((_, i) => (i === 2 ? agent : null));
    const won = resolveFight({ ...s, characters: { ...s.characters, [agent]: { level: 5, xp: 0, stars: 1 } }, squad }, 'wanhua_lt1', 'win', NOW);
    expect(won.state.run.agentWin).toBe(true);
    expect(resolveFight(s, 'wanhua_lt1', 'win', NOW).state.run.agentWin).toBe(false);
  });

  it('a fast Ximending claim can be missed, gently', () => {
    const s = initialState(NOW);
    const c: Commission = { id: 'fast_ximending', from: 0, done: false };
    const run = { ...s, run: { ...s.run, startedAt: NOW, commissions: [c] } };
    expect(commissionStatus(run, c, NOW + FAST_XIMENDING_MS + 1).missed).toBe(true);
    const claimedInTime = { ...run, areas: { ...run.areas, ximending: { lt1: true, lt2: true, boss: true } } };
    expect(checkCommissions(claimedInTime, NOW + 60_000).events).toHaveLength(1);
    expect(checkCommissions(claimedInTime, NOW + FAST_XIMENDING_MS + 1).events).toHaveLength(0);
  });
});

describe('save v8', () => {
  it('older saves get commissions, and front pages if they have cashed out before', () => {
    const s = initialState(NOW);
    const firstRun = { ...s, version: 7, run: { accountant: false, claims: 0, underdog: 0 } };
    const veteran = { ...firstRun, meta: { ...s.meta, runs: 2, claimedEver: ['wanhua'] } };
    const a = migrate(JSON.parse(JSON.stringify(firstRun)), NOW)!;
    const b = migrate(JSON.parse(JSON.stringify(veteran)), NOW)!;
    expect(a.version).toBe(SAVE_VERSION);
    expect(a.run.commissions).toHaveLength(3);
    expect(a.run.offers).toEqual([]);
    expect(b.run.offers).toHaveLength(3);
    expect(b.run.startedAt).toBe(NOW);
  });

  it('a current save keeps its headline and commissions', () => {
    const s = withHeadline({ id: 'typhoon' });
    const back = migrate(JSON.parse(JSON.stringify(s)), NOW + 1000)!;
    expect(back.run.headline).toEqual({ id: 'typhoon' });
    expect(back.run.commissions).toEqual(s.run.commissions);
  });
});
