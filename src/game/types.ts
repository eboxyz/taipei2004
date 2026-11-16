export type Phase = 'day' | 'night';
export type IncomeMode = Phase | 'average';

export type AreaId = 'wanhua' | 'ximending' | 'zhongshan' | 'east' | 'xinyi' | 'xindian';

export type FactionId =
  | 'miaokou'
  | 'molong'
  | 'yuejian'
  | 'jintangchi'
  | 'tongtian'
  | 'xiaoxiao'
  | 'agency'
  | 'independent';

export type CharClass = 'agent' | 'gangster';

/** 圍事 打手 小弟 軍師 (gangsters) · 房仲 代書 店長 會計 (agents) */
export type Role =
  | 'weishi'
  | 'dashou'
  | 'xiaodi'
  | 'junshi'
  | 'fangzhong'
  | 'daishu'
  | 'dianzhang'
  | 'kuaiji';

export type Rarity = 'N' | 'R' | 'SR' | 'SSR';
export type Rank = 'crew' | 'lieutenant' | 'boss';
export type Source = 'earned' | 'starter' | 'scratch' | 'temple' | 'lottery' | 'all' | 'npc';

export interface CategoryDef {
  id: string;
  name: string;
  nameZh: string;
  tag: Phase;
  /** LED dot-matrix fallback icon: rows of '#' (lit) and '.' (off). */
  led?: string[];
  ledColor?: string;
}

export type LotLock = 'lt1' | 'lt2' | 'xiaoxiao';

export interface LotDef {
  id: string;
  area: AreaId;
  name: string;
  nameZh: string;
  category: string;
  /** NT$ to buy. */
  price: number;
  /** NT$ per second at level 1, before multipliers. */
  income: number;
  lock?: LotLock;
}

export interface AreaDef {
  id: AreaId;
  name: string;
  nameZh: string;
  flavor: string;
  station: string;
  stationZh: string;
  rival: FactionId;
  /** Strength of rival shakedowns in this area. */
  threat: number;
  /** The rival gang's own entrenched stake (NT$) that can't be bought, only outgrown. */
  rivalBase: number;
  /** Character ids of the two lieutenants and the boss. */
  lt1Id: string;
  lt2Id: string;
  bossId: string;
  lots: LotDef[];
  secret?: boolean;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  crest: string;
  meaning: string;
  colors: [string, string];
}

export interface CharacterDef {
  id: string;
  name: string;
  nameZh: string;
  faction: FactionId;
  rarity: Rarity | 'NPC';
  role: Role | null;
  source: Source;
  look: string;
  skill: { name: string; text: string };
  female?: boolean;
}

export interface LotState {
  level: number;
  /** Total NT$ put into this lot (purchase + upgrades). Drives market share. */
  invested: number;
  manager?: string;
  security?: string;
}

export interface CharState {
  level: number;
  xp: number;
  stars: number;
}

export interface AreaProgress {
  lt1: boolean;
  lt2: boolean;
  boss: boolean;
}

/** Upgrade amount: one, ten, as many as you can afford, or up to the next ×2 milestone. */
export type BuyMode = 1 | 10 | 'max' | 'next';
export type FightKey = 'lt1' | 'lt2' | 'boss';

/** The three one-tap squad fills. */
export type SquadStyle = 'offense' | 'defense' | 'balanced';

/**
 * Squad slots by index: 0–1 front row, 2–4 back row,
 * 5 Lieutenant commander (SR or better), 6 Boss commander (SSR).
 */
export type Squad = (string | null)[];

export type DrawKind = 'scratch' | 'temple' | 'lottery';

export type Zodiac = 'rat' | 'ox' | 'tiger' | 'rabbit' | 'dragon' | 'snake' | 'horse' | 'goat' | 'monkey' | 'rooster' | 'dog' | 'pig';

export interface DrawState {
  /** Temple draws since the last SR or better. Every 10th is guaranteed SR+. */
  templePity: number;
  /** Lottery tickets since the last SSR. The 40th is guaranteed SSR. */
  lotteryPity: number;
  /** Local date (YYYY-MM-DD) of the last free temple visit. */
  lastFreeTemple: string | null;
  /** Today's fortune: the free visit's stick (as card rarity) speeds up street events for that day. */
  fortune: { day: string; rarity: Rarity } | null;
  count: Record<DrawKind, number>;
}

export interface Currencies {
  /** 刮刮樂 */
  scratch: number;
  /** 香油錢 */
  incense: number;
  /** 樂透 */
  lottery: number;
}

export type EventKind = 'procession' | 'recruit' | 'scratch' | 'tip';

/** A street event waiting at a map station. */
export interface StreetEvent {
  id: number;
  area: AreaId;
  kind: EventKind;
  /** Tips sometimes come from a cheerful Xiaoxiao agent. */
  xiaoxiao: boolean;
  /** Seconds before it moves on. */
  expiresIn: number;
}

/** This year's headline: one run-long twist, picked from three front pages at cash-out. */
export type HeadlineId = 'typhoon' | 'night_market' | 'election' | 'mrt' | 'festival' | 'idol' | 'stock_rally' | 'rearmed';

export interface Headline {
  id: HeadlineId;
  /** New MRT Line only: the district whose lots are cheaper. */
  area?: AreaId;
}

/** Optional goals for one run, each paying a lottery ticket. */
export type CommissionId = 'agents_only' | 'fast_ximending' | 'lv100' | 'repel10' | 'underdog' | 'full_district' | 'index130' | 'street5' | 'managers6';

export interface Commission {
  id: CommissionId;
  /** A counter's value when the run started, for goals counted "this run". */
  from: number;
  done: boolean;
}

export interface GameState {
  version: number;
  createdAt: number;
  /** Wall-clock ms when the state was last advanced. */
  lastSeen: number;
  cash: number;
  safe: number;
  lifetimeEarned: number;
  runEarned: number;
  bestNetWorth: number;
  /** 房價指數, starts at 100 each run. */
  index: number;
  lots: Record<string, LotState>;
  characters: Record<string, CharState>;
  areas: Record<AreaId, AreaProgress>;
  squad: Squad;
  /** When true the squad is rebuilt from your best cards before each fight. */
  /** Saves before v5 only: auto-fill, now retired. Cleared on load by `retireAutoSquad`. */
  squadAuto?: boolean;
  currencies: Currencies;
  /** 生肖, picked before the first draw. Tilts draws toward two roles. */
  zodiac: Zodiac | null;
  draws: DrawState;
  /** Binder pages (faction ids) whose completion reward has been paid. */
  binderPaid: FactionId[];
  run: {
    accountant: boolean;
    /** Areas claimed this run. */
    claims: number;
    /** First wins taken right at the share threshold this run (extra Face). */
    underdog: number;
    /** Game time (ms) this run started, for timed commissions. */
    startedAt: number;
    /** This run's headline. Run 1 has none, and it's null until one is picked. */
    headline: Headline | null;
    /** Three front pages waiting for a pick (after a cash-out). */
    offers: Headline[];
    commissions: Commission[];
    /** Street events taken this run. */
    events: number;
    /** Won a Turf War with only agents this run. */
    agentWin: boolean;
  };
  meta: {
    /** Legacy; the safe size now comes from Face upgrades. */
    safeHours: number;
    /** Unspent Face 面子. */
    face: number;
    /** All Face ever earned. */
    faceTotal: number;
    /** Squad slots unlocked (3–7). Permanent. */
    squadSlots: number;
    /** Cash-outs so far. */
    runs: number;
    /** Times Xinyi has been claimed (Chapter 1 clears). */
    chapterClears: number;
    /** Secret chapter completions across runs. */
    xindianClears: number;
    /** Face upgrade levels by id. */
    upgrades: Record<string, number>;
    /** Areas ever claimed, in any run. */
    claimedEver: AreaId[];
  };
  /** Automation switches (each needs its Face upgrade, and starts on when bought). */
  auto: {
    /** Standing Orders: spends its budget on the best buy anywhere, new lots included. */
    orders: boolean;
    /** Standing Orders spends in the next rival's district until that fight is ready. */
    focus: boolean;
    /** NT$ set aside for Standing Orders: a share of what you earn while the game is open. */
    budget: number;
    /** Duty Roster: keeps posts filled with free crew. */
    staff: boolean;
    /** Posts the Duty Roster filled ("lotId:slot:charId"); it may re-shuffle only these. */
    placed: string[];
    /** Crew size when the Duty Roster last looked, so a new character triggers a re-shuffle. */
    rosterSeen: number;
  };
  /** Game time (ms) when each fight's rematch rewards are ready again. */
  cooldowns: Record<string, number>;
  /** East District's hot business type right now. */
  hot: string | null;
  event: StreetEvent | null;
  /** Seconds until the next street event. */
  eventIn: number;
  settings: {
    numberFormat: 'cjk' | 'kmb';
    buyMode: BuyMode;
    battleSpeed: 1 | 2 | 4 | 8;
    battleAuto: boolean;
  };
  stats: {
    shakedownsRepelled: number;
    shakedownBonus: number;
    lotsBought: number;
    fightsWon: number;
    fightsLost: number;
  };
  /** Seconds until the next shakedown attempt. */
  shakedownIn: number;
}

export type GameEvent =
  | { kind: 'shakedown-repelled'; lotId: string; charId: string; bonus: number; scratch: boolean }
  | { kind: 'shakedown-unguarded'; lotId: string }
  | { kind: 'level-up'; charId: string; level: number }
  | { kind: 'milestone'; lotId: string; level: number }
  | { kind: 'auto-bought'; lotId: string }
  | { kind: 'commission'; id: CommissionId }
