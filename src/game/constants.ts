/** Tuning knobs. Change these, then run `npm run sim` to check pacing. */
export const SAVE_VERSION = 3;

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

/* ---------- Draws ---------- */

/** Every Nth repelled shakedown leaves a scratch card behind. */
export const SHAKEDOWN_SCRATCH_EVERY = 4;
export const MAX_STARS = 5;
/** Stars at which the signature skill (★3) and commander aura (★5) get stronger. */
export const SKILL_STAR = 3;
export const AURA_STAR = 5;
export const SKILL_STAR_MULT = 1.25;
export const AURA_STAR_MULT = 1.5;
