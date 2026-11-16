/** Tuning knobs. Change these, then run `npm run sim` to check pacing. */
import type { Rarity } from './types';

export const SAVE_VERSION = 9;

/** Upgrade cost multiplier per level. */
export const UPGRADE_GROWTH = 1.17;
/** First upgrade costs this fraction of the lot's purchase price. */
export const UPGRADE_BASE = 1.0;
/** Income doubles at each of these levels. */
export const MILESTONES = [10, 25, 50, 100] as const;

/** 1 real minute = 1 game hour. Day is 06:00–18:00. */
export const GAME_HOUR_MS = 60_000;
export const DAY_START = 6;
export const NIGHT_START = 18;
export const IN_PHASE_MULT = 1.5;
export const AVERAGE_PHASE_MULT = 1.25;

export const START_CASH = 5e4;
export const START_SAFE_HOURS = 4;
export const MAX_SAFE_HOURS = 24;

/** Rivals' stake in each lot they still hold, as a multiple of its price. */
export const RIVAL_STAKE = 1.5;
export const SHARE_THRESHOLDS = { lt1: 0.25, lt2: 0.5, boss: 0.75 } as const;

export const SHAKEDOWN_MIN_S = 150;
export const SHAKEDOWN_MAX_S = 300;
/** A repelled shakedown pays this many seconds of the lot's income (minimum NT$1,000). */
export const SHAKEDOWN_BONUS_SECONDS = 90;
export const SHAKEDOWN_XP = 20;
export const SHAKEDOWN_ATTEMPT_XP = 8;
/** Offline shakedowns are capped so long absences don't flood the summary. */
export const OFFLINE_SHAKEDOWN_CAP = 12;

/** Managers earn this much XP per minute of work. */
export const MANAGER_XP_PER_MIN = 1;

/** Price index gains. */
export const INDEX_PER_LOT = 1;
export const INDEX_PER_MILESTONE = 0.25;

/** Bookkeeper (in-run): collects the safe automatically while you play. */
export const ACCOUNTANT_COST = 4e5;
export const ACCOUNTANT_UNLOCK_LOTS = 3;

/* ---------- Turf Wars ---------- */

/** 5 army slots + Lieutenant commander + Boss commander. */
export const SQUAD_SIZE = 7;
export const FRONT_SLOTS = [0, 1] as const;
export const BACK_SLOTS = [2, 3, 4] as const;
export const LT_SLOT = 5;
export const BOSS_SLOT = 6;

/** Gangsters are stronger at night, agents by day. */
export const PHASE_BONUS = 0.2;
/** Stat bonus for every full 5% of market share above the fight's threshold. */
export const SHARE_BONUS_PER_STEP = 0.04;
/** Home Turf: Grit bonus per Security posted in the fight's area. */
export const HOME_TURF_GRIT = 0.03;
/** Same-faction bonus for 2 and 3+ crew from one faction. */
export const FACTION_BONUS = [0, 0, 0.05, 0.1] as const;
/** Quick claim is allowed at this multiple of the recommended power. */
export const QUICK_CLAIM_RATIO = 2;

export const FIGHT_XP_WIN = 30;
export const FIGHT_XP_FIRST_WIN = 60;
export const FIGHT_XP_LOSS = 12;
/** A rematch pays XP and a scratch card at most once per fight in this window (stops quick-win farming). */
export const REMATCH_COOLDOWN_MS = 5 * 60_000;

/* ---------- Draws ---------- */

/** Every Nth repelled shakedown leaves a scratch card behind. */
export const SHAKEDOWN_SCRATCH_EVERY = 4;
export const MAX_STARS = 5;
/** Stars at which the signature skill (★3) and commander aura (★5) get stronger. */
export const SKILL_STAR = 3;
export const AURA_STAR = 5;
export const SKILL_STAR_MULT = 1.25;
export const AURA_STAR_MULT = 1.5;

/* ---------- Full run ---------- */

/** Price index jump when you claim an area. */
export const CLAIM_INDEX = 10;
/** Unowned lots in a claimed area cost this much less. */
export const CLAIM_LOT_DISCOUNT = 0.25;
/** Zhongshan's night businesses earn this much at night (instead of IN_PHASE_MULT). */
export const ZHONGSHAN_NIGHT_MULT = 2;
/** East District's hot business type earns this multiple. */
export const HOT_MULT = 2;
export const EAST_HOT_ORDER = ['boutique', 'cafe', 'nightclub', 'department_store'] as const;

/** Face from a cash-out: floor(sqrt(best net worth / FACE_DIVISOR)) + per-claim and underdog bonuses. */
export const FACE_DIVISOR = 1e9;
export const FACE_PER_CLAIM = 2;
export const FACE_PER_UNDERDOG = 1;
/** Winning within this much of a fight's threshold counts as an underdog win. */
export const UNDERDOG_MARGIN = 0.05;

/* ---------- Run variety: headlines and commissions (new values; tune in the balance pass) ---------- */

/** Front pages offered at each cash-out. */
export const HEADLINE_OFFERS = 3;
export const TYPHOON_SAFE_HOURS = 4;
/** Night Market Fever: night businesses everywhere earn this at night, like Zhongshan. */
export const NIGHT_MARKET_MULT = 2;
export const ELECTION_INDEX_MULT = 1.5;
export const MRT_LOT_DISCOUNT = 0.3;
export const FESTIVAL_EVENT_RATE = 2;
export const FESTIVAL_PROCESSION_MULT = 2;
export const IDOL_RECRUIT_MULT = 2;
/** Stock Rally: properties count this much toward net worth (and so Face). */
export const STOCK_RALLY_PROPERTY = 1.5;
export const REARMED_STRENGTH = 1.15;
export const REARMED_FACE_PER_WIN = 1;
export const REARMED_INCENSE_MULT = 2;

export const COMMISSIONS_PER_RUN = 3;

/** Standing Orders: the share of what you earn (while the game is open) it may spend. */
export const ORDERS_SHARE = 0.5;
/** Standing Orders waits this many seconds of budget for the best buy; longer, and it takes the best one it can afford now. */
export const ORDERS_WAIT_S = 15;
/** Fast Ximending: claim it within this much game time of the run starting. */
export const FAST_XIMENDING_MS = 2 * 60 * 60_000;

/* ---------- Connections between systems (new values; tune in the balance pass) ---------- */

/** Locals: a Manager from the district's own gang earns this much more there. */
export const LOCAL_MANAGER_MULT = 1.25;
/** Locals: Security from the district's own gang counts this many times toward Home Turf there. */
export const LOCAL_GUARD_WEIGHT = 2;
/** Today's fortune: the free temple stick's grade (by card rarity) speeds up street events for the day. */
export const FORTUNE_EVENT_RATE: Record<Rarity, number> = { N: 1.25, R: 1.5, SR: 1.75, SSR: 2 };

/** Street events: one at a time, every few minutes, while the game is open. */
export const EVENT_MIN_S = 200;
export const EVENT_MAX_S = 360;
export const EVENT_LIFETIME_S = 90;

/** Xindian’s commuter economy pays extra while away. Safe capacity uses this rate too. */
export const XINDIAN_OFFLINE_MULT = 2;
