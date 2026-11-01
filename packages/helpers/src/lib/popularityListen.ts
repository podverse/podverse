import { isMusicMediumId } from './medium.js';

/**
 * Media seconds a non-music listen must reach when half the length is longer, or the length is
 * unknown. At 10 minutes, half the length equals this cap.
 */
export const POPULARITY_COUNTED_LISTEN_LONG_CAP_SECONDS = 300;

/**
 * Media seconds a music listen must reach when half the length is longer, or the length is
 * unknown. At 2 minutes, half the length equals this cap.
 */
export const POPULARITY_COUNTED_LISTEN_SHORT_CAP_SECONDS = 60;

/** Share of a known length after which a listen counts, when that comes before the cap. */
export const POPULARITY_COUNTED_LISTEN_MIN_FRACTION = 0.5;

/**
 * A player-loaded length replaces the RSS duration only inside this band. Half to double covers
 * a typical inserted-ad change and rejects a length that does not belong to that file.
 */
export const POPULARITY_PLAYER_DURATION_MIN_RATIO = 0.5;
export const POPULARITY_PLAYER_DURATION_MAX_RATIO = 2;

/**
 * Server seconds between one listener's new stored listens unless
 * `STATS_LISTEN_MIN_INTERVAL_SECONDS` sets another value.
 */
export const POPULARITY_DEFAULT_LISTEN_MIN_INTERVAL_SECONDS = 20;

/**
 * Stored listens per listener per UTC day unless `STATS_LISTEN_DAILY_STORED_CAP` sets another
 * value.
 */
export const POPULARITY_DEFAULT_DAILY_LISTEN_STORED_CAP = 300;

/**
 * Stored listens per listener per UTC day that count toward popularity unless
 * `STATS_LISTEN_DAILY_POPULARITY_CAP` sets another value.
 */
export const POPULARITY_DEFAULT_DAILY_LISTEN_POPULARITY_CAP = 100;

/**
 * Counted profile and playlist opens per listener per UTC day unless `STATS_OPEN_DAILY_CAP` sets
 * another value.
 */
export const POPULARITY_DEFAULT_DAILY_OPEN_CAP = 10;

/**
 * Days in which one listener adds to an entity's all-time total at most once, and the length of
 * the popularity cooldown after an opt-out, unless `STATS_ALL_TIME_RECOUNT_DAYS` sets another
 * value. The API refuses to start when it is above the event retention.
 */
export const POPULARITY_DEFAULT_ALL_TIME_RECOUNT_DAYS = 90;

/** Why a listener was left out of popularity. */
export const POPULARITY_FLAG_REASONS = ['stored_cap_reached', 'too_soon_minutes'] as const;

export type PopularityFlagReason = (typeof POPULARITY_FLAG_REASONS)[number];

/**
 * Too-soon minutes in one unbroken run that flag a listener unless `STATS_FLAG_TOO_SOON_MINUTES`
 * sets another value; 0 turns the signal off.
 */
export const POPULARITY_DEFAULT_FLAG_TOO_SOON_MINUTES = 30;

/** A too-soon minute more than this many minutes after the run's last one starts a new run. */
export const POPULARITY_FLAG_TOO_SOON_RUN_GAP_MINUTES = 2;

/**
 * Hours from a listener's first stored listen of a UTC day within which reaching the stored daily
 * cap flags the listener, unless `STATS_FLAG_STORED_CAP_WITHIN_HOURS` sets another value; 0 turns
 * the signal off.
 */
export const POPULARITY_DEFAULT_FLAG_STORED_CAP_WITHIN_HOURS = 3;

const MS_PER_HOUR = 3_600_000;

/** Whether `value` is one of `POPULARITY_FLAG_REASONS`. */
export function isPopularityFlagReason(value: unknown): value is PopularityFlagReason {
  for (const reason of POPULARITY_FLAG_REASONS) {
    if (value === reason) {
      return true;
    }
  }
  return false;
}

/**
 * The flat cap for `mediumId`. Music uses the short cap; every other medium, including a missing
 * one, uses the long cap.
 */
export function countedListenCapSeconds(mediumId: number | null | undefined): number {
  return isMusicMediumId(mediumId)
    ? POPULARITY_COUNTED_LISTEN_SHORT_CAP_SECONDS
    : POPULARITY_COUNTED_LISTEN_LONG_CAP_SECONDS;
}

function positiveDurationSeconds(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

/**
 * Length the counted-listen rule uses. A player-loaded length wins when it is the only length,
 * or when it sits between half and double a known RSS duration. Outside that band the RSS
 * duration stands. Neither length yields null, and the medium's cap applies.
 */
export function resolveCountedListenDurationSeconds(input: {
  playerDurationSeconds: number | null | undefined;
  rssDurationSeconds: number | null | undefined;
}): number | null {
  const player = positiveDurationSeconds(input.playerDurationSeconds);
  const rss = positiveDurationSeconds(input.rssDurationSeconds);
  if (player !== null && rss !== null) {
    if (
      player >= rss * POPULARITY_PLAYER_DURATION_MIN_RATIO &&
      player <= rss * POPULARITY_PLAYER_DURATION_MAX_RATIO
    ) {
      return player;
    }
    return rss;
  }
  return player ?? rss;
}

/**
 * Whether a `too_soon` answer counts toward the too-soon signal. The check uses the RSS
 * duration, never a length claimed on the request. Honest listening of an item whose threshold
 * is shorter than `minIntervalSeconds` meets the floor inside one interval, so that answer is
 * left out. An unknown duration uses the cap and counts.
 */
export function countsTowardTooSoonSignal(input: {
  rssDurationSeconds: number | null;
  mediumId: number | null | undefined;
  minIntervalSeconds: number;
}): boolean {
  if (!(input.minIntervalSeconds > 0)) {
    return false;
  }
  return (
    getCountedListenThresholdSeconds(input.rssDurationSeconds, input.mediumId) >=
    input.minIntervalSeconds
  );
}

/**
 * True when the stored daily cap was reached within `withinHours` of the day's first stored
 * listen. A window of 0 or less is never reached.
 */
export function isStoredCapReachedFast(input: {
  firstStoredAt: Date;
  reachedAt: Date;
  withinHours: number;
}): boolean {
  if (input.withinHours <= 0) {
    return false;
  }
  return (
    input.reachedAt.getTime() - input.firstStoredAt.getTime() <= input.withinHours * MS_PER_HOUR
  );
}

/**
 * Seconds of media a listener must hear before a listen counts: the medium's cap or half the
 * length, whichever is smaller. An unknown, zero, negative, or non-finite duration uses the cap.
 */
export function getCountedListenThresholdSeconds(
  durationSeconds: number | null | undefined,
  mediumId: number | null | undefined
): number {
  const cap = countedListenCapSeconds(mediumId);
  const duration = positiveDurationSeconds(durationSeconds);
  if (duration === null) {
    return cap;
  }
  return Math.min(cap, duration * POPULARITY_COUNTED_LISTEN_MIN_FRACTION);
}

/**
 * True when `secondsHeard` (media seconds actually played, not wall-clock time and not seek
 * distance) meets the counted-listen rule for an item or clip of `durationSeconds`.
 */
export function isCountedListen(input: {
  secondsHeard: number;
  durationSeconds: number | null | undefined;
  mediumId: number | null | undefined;
}): boolean {
  if (!Number.isFinite(input.secondsHeard) || input.secondsHeard <= 0) {
    return false;
  }
  return (
    input.secondsHeard >=
    getCountedListenThresholdSeconds(input.durationSeconds, input.mediumId)
  );
}

/** Half-lives, in days, of the two taste scores: what someone likes now, and long-term taste. */
export const POPULARITY_TASTE_HALF_LIFE_DAYS = {
  recent: 14,
  longTerm: 180,
} as const;

/** Score added for each counted listen of a show, and again when that listen finishes. */
export const POPULARITY_TASTE_LISTEN_WEIGHT = 1;
export const POPULARITY_TASTE_COMPLETION_WEIGHT = 1;

const MS_PER_DAY = 86_400_000;

/**
 * Fades a stored taste score from `from` to `to` with `score × 0.5^(days / halfLifeDays)`.
 * When `to` is not after `from`, the score is returned unchanged. Readers fade every stored score
 * to the same moment before comparing them; the write path applies the same formula in SQL.
 */
export function fadeTasteScore(input: {
  score: number;
  from: Date;
  to: Date;
  halfLifeDays: number;
}): number {
  const elapsedMs = input.to.getTime() - input.from.getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return input.score;
  }
  return input.score * Math.pow(0.5, elapsedMs / MS_PER_DAY / input.halfLifeDays);
}

/** What the listen write path did with one report. */
export type PopularityListenResult =
  | 'counted'
  | 'updated'
  | 'unchanged'
  | 'daily_cap_reached'
  | 'too_soon'
  | 'below_threshold'
  | 'not_allowed'
  | 'not_found'
  | 'clip_source_removed';

/** What the open write path did with one profile or playlist open. */
export type PopularityOpenResult =
  'counted' | 'unchanged' | 'own_content' | 'daily_cap_reached' | 'not_allowed' | 'not_found';
