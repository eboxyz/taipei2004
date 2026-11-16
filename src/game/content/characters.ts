import type { CharacterDef, CharClass, Rank, Rarity, Role } from '../types';

export const ROLES: Record<Role, { name: string; nameZh: string; cls: CharClass; row: 'front' | 'back' | 'either' }> = {
  weishi: { name: 'Bouncer', nameZh: '圍事', cls: 'gangster', row: 'front' },
  dashou: { name: 'Enforcer', nameZh: '打手', cls: 'gangster', row: 'front' },
  xiaodi: { name: 'Runner', nameZh: '小弟', cls: 'gangster', row: 'either' },
  junshi: { name: 'Strategist', nameZh: '軍師', cls: 'gangster', row: 'back' },
  fangzhong: { name: 'Broker', nameZh: '房仲', cls: 'agent', row: 'back' },
  daishu: { name: 'Scrivener', nameZh: '代書', cls: 'agent', row: 'back' },
  dianzhang: { name: 'Manager', nameZh: '店長', cls: 'agent', row: 'back' },
  kuaiji: { name: 'Accountant', nameZh: '會計', cls: 'agent', row: 'back' },
};

/** What a character does when posted as a lot Manager. */
export const MANAGER_PERKS: Partial<Record<Role, string>> = {
  fangzhong: 'Lots in this area cost 5% less',
  daishu: 'Upgrades on this lot cost 10% less',
  dianzhang: '+25% extra income on this lot',
  kuaiji: 'Safe holds 1 more hour',
};

export const RANK_OF: Record<Rarity, Rank> = { N: 'crew', R: 'crew', SR: 'lieutenant', SSR: 'boss' };

const c = (d: CharacterDef) => d;

export const CHARACTERS: Record<string, CharacterDef> = Object.fromEntries(
  [
    // Miaokou Gang 廟口幫
    c({ id: 'kun_bo', name: 'Kun-bo', nameZh: '坤伯', faction: 'miaokou', rarity: 'SSR', role: 'junshi', source: 'earned', look: '70s, bald, white undershirt, prayer beads, red plastic stool', skill: { name: 'Procession', text: 'Calls a troupe runner into the fight every 15 s' } }),
    c({ id: 'a_biao', name: 'A-Biao', nameZh: '阿彪', faction: 'miaokou', rarity: 'SR', role: 'dashou', source: 'earned', look: 'Aloha shirt, gold chain, flip-flops, string of firecrackers', skill: { name: 'Firecracker String', text: 'Hits every enemy' } }),
    c({ id: 'gui_yi', name: 'Gui-yi', nameZh: '桂姨', faction: 'miaokou', rarity: 'SR', role: 'kuaiji', source: 'earned', female: true, look: '60s, tight perm, glasses on a chain, abacus', skill: { name: 'Hush Money', text: 'Shields the weakest ally' } }),
    c({ id: 'a_shun', name: 'A-Shun', nameZh: '阿順', faction: 'miaokou', rarity: 'R', role: 'dashou', source: 'temple', look: 'Procession drummer, headband, drumsticks', skill: { name: 'War Drum', text: 'Strengthens the front row' } }),
    // Molong Society 墨龍會
    c({ id: 'a_jie', name: 'A-Jie', nameZh: '阿杰', faction: 'molong', rarity: 'SSR', role: 'dashou', source: 'earned', look: '22, bleached spiky hair, dragon tattoo sleeves', skill: { name: 'Scooter Crew', text: 'Whole army attacks 25% faster' } }),
    c({ id: 'xiao_zhen', name: 'Xiao Zhen', nameZh: '小針', faction: 'molong', rarity: 'SR', role: 'junshi', source: 'earned', female: true, look: 'Tattoo artist, half-shaved head, inked gloves', skill: { name: 'Bad Ink', text: 'Target enemy deals less damage' } }),
    c({ id: 'a_gan', name: 'A-Gan', nameZh: '阿桿', faction: 'molong', rarity: 'SR', role: 'xiaodi', source: 'earned', female: true, look: 'Arcade queen, oversized jersey, cup of tokens', skill: { name: 'Combo', text: 'Rapid five-hit flurry' } }),
    c({ id: 'a_hao', name: 'A-Hao', nameZh: '阿豪', faction: 'molong', rarity: 'R', role: 'xiaodi', source: 'scratch', look: 'Scooter runner, sticker-covered helmet', skill: { name: 'Wheelie', text: 'Dashes in to hit the back row' } }),
    c({ id: 'street_punk', name: 'Street Punk', nameZh: '街頭小弟', faction: 'molong', rarity: 'N', role: 'xiaodi', source: 'all', look: 'Generic punk in neutral colors', skill: { name: 'Brawl', text: 'Basic hits' } }),
    // Yuejian Society 月見會
    c({ id: 'yue_jie', name: 'Yue-jie', nameZh: '月姐', faction: 'yuejian', rarity: 'SSR', role: 'dianzhang', source: 'earned', female: true, look: 'Mama-san, silver-streaked updo, indigo qipao, fan', skill: { name: 'Last Call', text: 'Heals the army over time; charms one enemy at the start' } }),
    c({ id: 'a_jian', name: 'A-Jian', nameZh: '阿健', faction: 'yuejian', rarity: 'SR', role: 'weishi', source: 'earned', look: 'Head bartender, vest and bow tie, cocktail shaker', skill: { name: 'Last Orders', text: 'Enemies must hit him' } }),
    c({ id: 'coco', name: 'Coco', nameZh: '可可', faction: 'yuejian', rarity: 'SR', role: 'daishu', source: 'earned', female: true, look: 'Office-lady suit, charm-covered flip phone, clipboard', skill: { name: 'Fine Print', text: "Strips an enemy's defense" } }),
    // Jin Tangchi Group 金湯匙集團
    c({ id: 'jin_shao', name: 'Jin-shao', nameZh: '金少', faction: 'jintangchi', rarity: 'SSR', role: 'fangzhong', source: 'earned', look: 'Heir, pastel suit, popped collar, sunglasses on head', skill: { name: "Daddy's Money", text: 'Front row starts every fight shielded' } }),
    c({ id: 'da_kuai', name: 'Da-kuai', nameZh: '大塊', faction: 'jintangchi', rarity: 'SR', role: 'weishi', source: 'earned', look: 'Huge bodyguard, black suit, earpiece', skill: { name: 'Human Wall', text: 'Blocks every hit on the ally behind for 3 s' } }),
    c({ id: 'vivi', name: 'Vivi', nameZh: '薇薇', faction: 'jintangchi', rarity: 'SR', role: 'kuaiji', source: 'earned', female: true, look: 'Assistant, oversized sunglasses, PDA, credit cards', skill: { name: 'Company Card', text: 'Shields the whole back row' } }),
    c({ id: 'lao_liu', name: 'Lao Liu', nameZh: '老劉', faction: 'jintangchi', rarity: 'R', role: 'xiaodi', source: 'lottery', look: 'Chauffeur, white gloves, peaked cap', skill: { name: 'Getaway Car', text: 'Revives one ally, once per fight' } }),
    // Tongtian Development 通天建設
    c({ id: 'tian_dong', name: 'Tian-dong', nameZh: '田董', faction: 'tongtian', rarity: 'SSR', role: 'junshi', source: 'earned', look: 'Chairman, silver hair, double-breasted suit, hard hat', skill: { name: 'Permits', text: 'Army gains +5% stats every 15 s, stacking' } }),
    c({ id: 'secretary_lin', name: 'Secretary Lin', nameZh: '林秘書', faction: 'tongtian', rarity: 'SR', role: 'daishu', source: 'earned', female: true, look: 'Political aide, sharp bob, two flip phones', skill: { name: 'Zoning Change', text: 'Stuns the strongest enemy' } }),
    c({ id: 'tie_ge', name: 'Tie-ge', nameZh: '鐵哥', faction: 'tongtian', rarity: 'SR', role: 'dashou', source: 'earned', look: 'Site foreman, hard hat, reflective vest, rebar', skill: { name: 'Rebar Swing', text: 'Heavy hit with knockback' } }),
    // Player agency
    c({ id: 'a_cai', name: 'A-Cai', nameZh: '阿財', faction: 'agency', rarity: 'R', role: 'fangzhong', source: 'starter', look: 'Junior broker, white shirt, tie, flyers', skill: { name: 'Sweet Deal', text: 'Buys one enemy grunt out of the fight' } }),
    c({ id: 'hai_shu', name: 'Hai-shu', nameZh: '海叔', faction: 'agency', rarity: 'R', role: 'weishi', source: 'starter', look: 'Retired sailor, tank top, towel around his neck', skill: { name: 'Anchor', text: 'Takes hits for the ally next to him' } }),
    c({ id: 'a_di', name: 'A-Di', nameZh: '阿弟', faction: 'agency', rarity: 'N', role: 'xiaodi', source: 'starter', look: '18, bicycle runner, keys and lunchboxes', skill: { name: 'Errand Run', text: 'Fast hits' } }),
    c({ id: 'intern', name: 'The Intern', nameZh: '實習生', faction: 'agency', rarity: 'N', role: 'fangzhong', source: 'all', look: 'Lanyard, suit too big, terrified', skill: { name: 'Flyer Storm', text: 'Small damage to every enemy' } }),
    // Independents
    c({ id: 'bao_zhu', name: 'Bao-zhu', nameZh: '寶珠', faction: 'independent', rarity: 'SSR', role: 'fangzhong', source: 'lottery', female: true, look: 'Legendary flipper, huge perm, jade bangles, cash fanny pack', skill: { name: 'Old Money', text: "Agents' skills charge 40% faster" } }),
    c({ id: 'a_tai', name: 'A-Tai', nameZh: '阿太', faction: 'independent', rarity: 'SSR', role: 'dashou', source: 'temple', look: 'Techno Third Prince performer, glow sticks', skill: { name: 'Rave', text: "Doubles the army's night bonus" } }),
    c({ id: 'jackpot', name: 'Jackpot', nameZh: '頭獎哥', faction: 'independent', rarity: 'SSR', role: 'xiaodi', source: 'scratch', look: 'Betel-nut stand owner who hit the jackpot, gold everything', skill: { name: 'Lucky Streak', text: 'Any hit can crit big' } }),
    c({ id: 'chen_daishu', name: 'Chen Daishu', nameZh: '陳代書', faction: 'independent', rarity: 'SR', role: 'daishu', source: 'temple', female: true, look: 'Land scrivener, cardigan, seal stamps', skill: { name: 'Official Seal', text: 'Stuns and strips defense' } }),
    c({ id: 'lao_zhang', name: 'Lao Zhang', nameZh: '老張', faction: 'independent', rarity: 'SR', role: 'dianzhang', source: 'scratch', look: 'Night-market king, apron, giant wok', skill: { name: 'Night Market Feast', text: 'Heals everyone' } }),
    c({ id: 'a_xiong', name: 'A-Xiong', nameZh: '阿雄', faction: 'independent', rarity: 'SR', role: 'junshi', source: 'temple', look: 'Taxi driver, aviators, CB radio', skill: { name: 'Tip-off', text: 'Weakens the enemy commanders' } }),
    c({ id: 'lao_zhou', name: 'Lao Zhou', nameZh: '老周', faction: 'independent', rarity: 'SR', role: 'weishi', source: 'lottery', look: 'Retired detective, trench coat, toothpick', skill: { name: 'Off-Duty Badge', text: 'Big self-shield; enemies focus him' } }),
    // Xiaoxiao Realty: earned in Xindian; the familiar street-event agent joins first.
    c({ id: 'xiaoxiao_agent', name: 'Qiao-lin', nameZh: '喬霖', faction: 'xiaoxiao', rarity: 'SR', role: 'fangzhong', source: 'earned', look: 'Sunny-yellow blazer, smiley pin, smile a little too wide', skill: { name: 'Friendly Offer', text: 'Buys out a weakened rival grunt' } }),
    c({ id: 'a_yin', name: 'A-Yin', nameZh: '阿印', faction: 'xiaoxiao', rarity: 'SR', role: 'daishu', source: 'earned', look: 'Meticulous Taiwanese man, thirty, round glasses, yellow waistcoat, sleeve protectors, oversized seal stamp and document folder', skill: { name: 'Final Stamp', text: 'Stuns and strips defense' } }),
    c({ id: 'xiao_dong', name: 'Xiao-dong', nameZh: '笑董', faction: 'xiaoxiao', rarity: 'SSR', role: 'fangzhong', source: 'earned', look: 'Sunny Taiwanese chairman, fifty, immaculate white suit, yellow tie and pocket square, gold house-key pin, open property brochure', skill: { name: 'Closing Time', text: 'Charges agents’ skills; agents charge faster when commanding' } }),
  ].map((d) => [d.id, d]),
);

export const STARTERS = ['a_cai', 'hai_shu', 'a_di'] as const;
