import type { AreaDef, AreaId, FactionDef, FactionId, LotDef } from '../types';

const wanhuaLots: LotDef[] = [
  { id: 'w1', area: 'wanhua', name: 'Temple Snack Stall', nameZh: '廟口小吃', category: 'food_stall', price: 3e4, income: 750 },
  { id: 'w2', area: 'wanhua', name: 'Herb Alley Shop', nameZh: '青草巷', category: 'herbal_shop', price: 1.15e5, income: 1650 },
  { id: 'w3', area: 'wanhua', name: 'Back-Alley Tea House', nameZh: '老茶室', category: 'tea_house', price: 4.4e5, income: 4e3 },
  { id: 'w4', area: 'wanhua', name: 'Riverside Inn', nameZh: '河岸旅社', category: 'old_inn', price: 1.65e6, income: 9.7e3 },
  { id: 'w5', area: 'wanhua', name: 'Snake Alley Stall', nameZh: '華西街攤', category: 'food_stall', price: 6.3e6, income: 2.4e4 },
  { id: 'w6', area: 'wanhua', name: 'Bopiliao Herb Hall', nameZh: '剝皮寮藥行', category: 'herbal_shop', price: 2.4e7, income: 5.3e4 },
  { id: 'w7', area: 'wanhua', name: 'Moonlit Tea House', nameZh: '月下茶室', category: 'tea_house', price: 6e7, income: 4e4, lock: 'lt1' },
  { id: 'w8', area: 'wanhua', name: 'Longshan Inn', nameZh: '龍山旅社', category: 'old_inn', price: 2e8, income: 8e4, lock: 'lt2' },
  { id: 'w9', area: 'wanhua', name: 'Xiaoxiao Realty', nameZh: '笑笑房屋', category: 'xiaoxiao_branch', price: 4e7, income: 0, lock: 'xiaoxiao' },
];

/**
 * Later areas follow Wanhua's price curve ×100 per area. Income grows less than price, so each area
 * pays back slower than the last (×SLOWDOWN vs Wanhua); Face upgrades close the gap over runs.
 * Tuned with `npm run sim`.
 */
export const SLOWDOWN: Record<AreaId, number> = { wanhua: 1, ximending: 8, zhongshan: 64, east: 400, xinyi: 800, xindian: 3200 };
const TIER: Record<AreaId, number> = { wanhua: 0, ximending: 1, zhongshan: 2, east: 3, xinyi: 4, xindian: 5 };

type LotSpec = [id: string, name: string, nameZh: string, category: string, lock?: 'lt1' | 'lt2' | 'xiaoxiao'];

function areaLots(area: AreaId, priceFactor: number, incomeFactor: number, specs: LotSpec[]): LotDef[] {
  const scale = Math.pow(100, TIER[area]);
  return specs.map(([id, name, nameZh, category, lock], i) => {
    const w = wanhuaLots[i]!;
    const price = Number((w.price * scale * priceFactor).toPrecision(2));
    const income = lock === 'xiaoxiao' ? 0 : Number(((w.income * scale * incomeFactor) / SLOWDOWN[area]).toPrecision(2));
    return { id, area, name, nameZh, category, price, income, ...(lock ? { lock } : {}) };
  });
}

// Ximending: fast income, low property values.
const ximendingLots = areaLots('ximending', 0.6, 1.25, [
  ['x1', 'Corner Comic Rental', '轉角租書店', 'comic_rental'],
  ['x2', 'Hanzhong Street Clothes', '漢中街服飾', 'clothing_stall'],
  ['x3', 'Ink Alley Tattoo', '刺青巷', 'tattoo_parlor'],
  ['x4', 'Starlight Net Café', '星光網咖', 'internet_cafe'],
  ['x5', 'Neon Arcade', '霓虹電玩', 'arcade'],
  ['x6', 'Movie Street Streetwear', '電影街潮店', 'clothing_stall'],
  ['x7', 'Ink Dragon Studio', '墨龍刺青', 'tattoo_parlor', 'lt1'],
  ['x8', 'Token King Arcade', '代幣王電玩', 'arcade', 'lt2'],
  ['x9', 'Xiaoxiao Realty', '笑笑房屋', 'xiaoxiao_branch', 'xiaoxiao'],
]);

// Zhongshan: night businesses only, with a stronger night bonus.
const zhongshanLots = areaLots('zhongshan', 1, 1, [
  ['z1', 'Alley Izakaya', '條通居酒屋', 'izakaya'],
  ['z2', 'Lantern Lounge', '燈籠酒店', 'lounge'],
  ['z3', 'Linsen Business Hotel', '林森商旅', 'business_hotel'],
  ['z4', 'Golden Mic KTV', '金麥KTV', 'ktv'],
  ['z5', 'Silver Fan Lounge', '銀扇酒店', 'lounge'],
  ['z6', 'Encore KTV', '安可KTV', 'ktv'],
  ['z7', 'Bow Tie Bar', '領結酒吧', 'izakaya', 'lt1'],
  ['z8', 'Plaza Business Hotel', '廣場商旅', 'business_hotel', 'lt2'],
  ['z9', 'Xiaoxiao Realty', '笑笑房屋', 'xiaoxiao_branch', 'xiaoxiao'],
]);

// East District: one "hot" business type earns double, rotating every game day.
const eastLots = areaLots('east', 1, 1, [
  ['e1', 'Alley Café', '巷弄咖啡', 'cafe'],
  ['e2', 'Select Boutique', '選物精品', 'boutique'],
  ['e3', 'Dunhua Store Counter', '敦化百貨專櫃', 'department_store'],
  ['e4', 'Velvet Nightclub', '絲絨夜店', 'nightclub'],
  ['e5', 'Runway Boutique', '伸展台精品', 'boutique'],
  ['e6', 'Terrace Café', '露台咖啡', 'cafe'],
  ['e7', 'VIP Room Club', '貴賓夜店', 'nightclub', 'lt1'],
  ['e8', 'Platinum Department Store', '白金百貨', 'department_store', 'lt2'],
  ['e9', 'Xiaoxiao Realty', '笑笑房屋', 'xiaoxiao_branch', 'xiaoxiao'],
]);

// Xinyi: the highest values in the city.
const xinyiLots = areaLots('xinyi', 1.5, 1.5, [
  ['y1', 'Xinyi Office Floor', '信義辦公室', 'office_tower'],
  ['y2', 'Skyline Condo', '天際豪宅', 'luxury_condo'],
  ['y3', 'Plaza Department Store', '廣場百貨', 'department_store'],
  ['y4', 'Rooftop Nightclub', '頂樓夜店', 'nightclub'],
  ['y5', 'Glass Tower', '玻璃大樓', 'office_tower'],
  ['y6', 'Penthouse Residences', '頂層豪宅', 'luxury_condo'],
  ['y7', 'City Hall Annex', '市府旁辦公大樓', 'office_tower', 'lt1'],
  ['y8', 'Steel Frame Condo', '鋼骨豪宅', 'luxury_condo', 'lt2'],
  ['y9', 'Xiaoxiao Realty', '笑笑房屋', 'xiaoxiao_branch', 'xiaoxiao'],
]);

export const AREAS: Record<AreaId, AreaDef> = {
  wanhua: {
    id: 'wanhua',
    name: 'Wanhua',
    nameZh: '萬華',
    flavor: 'Old Taipei. Temples, stalls, and old-timers who still call it Monga 艋舺.',
    station: 'Longshan Temple',
    stationZh: '龍山寺',
    rival: 'miaokou',
    threat: 10,
    rivalBase: 3e8,
    lt1Id: 'a_biao',
    lt2Id: 'gui_yi',
    bossId: 'kun_bo',
    // Opening discounts apply only here; later districts retain the original template above.
    lots: wanhuaLots.map((lot) => ({ ...lot, price: ({ w1: 2e4, w2: 8.5e4, w3: 3.6e5 } as Record<string, number>)[lot.id] ?? lot.price })),
  },
  ximending: {
    id: 'ximending',
    name: 'Ximending',
    nameZh: '西門町',
    flavor: 'Movie street, tattoo street, and every teenager in Taipei.',
    station: 'Ximen',
    stationZh: '西門',
    rival: 'molong',
    threat: 25,
    rivalBase: 3e8 * 100 * 0.6,
    lt1Id: 'xiao_zhen',
    lt2Id: 'a_gan',
    bossId: 'a_jie',
    lots: ximendingLots,
  },
  zhongshan: {
    id: 'zhongshan',
    name: 'Zhongshan',
    nameZh: '中山・條通',
    flavor: 'Lantern-lit alleys of Japanese-style lounges and KTV.',
    station: 'Zhongshan',
    stationZh: '中山',
    rival: 'yuejian',
    threat: 50,
    rivalBase: 3e12,
    lt1Id: 'a_jian',
    lt2Id: 'coco',
    bossId: 'yue_jie',
    lots: zhongshanLots,
  },
  east: {
    id: 'east',
    name: 'East District',
    nameZh: '東區',
    flavor: 'Department stores, boutiques, and the best-dressed people in the city.',
    station: 'Zhongxiao Dunhua',
    stationZh: '忠孝敦化',
    rival: 'jintangchi',
    threat: 90,
    rivalBase: 3e14,
    lt1Id: 'da_kuai',
    lt2Id: 'vivi',
    bossId: 'jin_shao',
    lots: eastLots,
  },
  xinyi: {
    id: 'xinyi',
    name: 'Xinyi',
    nameZh: '信義',
    flavor: 'Glass towers, new money, and a skyscraper rising over everything.',
    station: 'Taipei City Hall',
    stationZh: '市政府',
    rival: 'tongtian',
    threat: 150,
    rivalBase: 3e16 * 0.75,
    lt1Id: 'secretary_lin',
    lt2Id: 'tie_ge',
    bossId: 'tian_dong',
    lots: xinyiLots,
  },
  xindian: {
    id: 'xindian',
    name: 'Xindian',
    nameZh: '新店',
    flavor: '???',
    station: 'Xindian',
    stationZh: '新店',
    rival: 'xiaoxiao',
    threat: 1200,
    rivalBase: 3e18,
    lt1Id: 'xiaoxiao_agent',
    lt2Id: 'xiaoxiao_agent',
    bossId: 'xiaoxiao_agent',
    lots: [],
    secret: true,
  },
};

export const AREA_ORDER: AreaId[] = ['wanhua', 'ximending', 'zhongshan', 'east', 'xinyi', 'xindian'];

export const ALL_LOTS: Record<string, LotDef> = Object.fromEntries(
  Object.values(AREAS).flatMap((a) => a.lots.map((l) => [l.id, l])),
);

export const FACTIONS: Record<FactionId, FactionDef> = {
  miaokou: { id: 'miaokou', name: 'Miaokou Gang', crest: '廟口幫', meaning: 'Temple Square Gang', colors: ['#E8382F', '#D4A72C'] },
  molong: { id: 'molong', name: 'Molong Society', crest: '墨龍會', meaning: 'Ink Dragons', colors: ['#1E1B2E', '#3DFF6E'] },
  yuejian: { id: 'yuejian', name: 'Yuejian Society', crest: '月見會', meaning: 'Moonview Society', colors: ['#3B2F8F', '#C9CCD6'] },
  jintangchi: { id: 'jintangchi', name: 'Jin Tangchi Group', crest: '金湯匙集團', meaning: 'Golden Spoon Group', colors: ['#D4A72C', '#F7B6D2'] },
  tongtian: { id: 'tongtian', name: 'Tongtian Development', crest: '通天建設', meaning: 'Sky-High Development', colors: ['#4A6FA5', '#9A9A9A'] },
  xiaoxiao: { id: 'xiaoxiao', name: 'Xiaoxiao Realty', crest: '笑笑房屋', meaning: 'Smile Realty', colors: ['#FFD34D', '#FFFFFF'] },
  agency: { id: 'agency', name: 'Hao Linju Realty', crest: '好鄰居房屋', meaning: 'Good Neighbor Realty', colors: ['#FF8A2B', '#FFFFFF'] },
  independent: { id: 'independent', name: 'Independent', crest: '獨行', meaning: 'Independent', colors: ['#7FD6E8', '#FFFFFF'] },
};
