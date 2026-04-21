/**
 * Shared time-duration constants. Use for semantic durations (expiration, TTL,
 * max age, display duration, rate limits). Keep ad-hoc delays (e.g. setTimeout)
 * as literals at call sites.
 */

/** Seconds per minute. */
export const SECONDS_PER_MINUTE = 60;

/** Minutes per hour. */
export const MINUTES_PER_HOUR = 60;

/** Hours per day. */
export const HOURS_PER_DAY = 24;

/** Seconds per hour. */
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

/** Seconds per day. */
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

/** Milliseconds per second. */
export const MS_PER_SECOND = 1000;

/** One minute in ms. */
export const ONE_MINUTE_MS = SECONDS_PER_MINUTE * MS_PER_SECOND;

/** Five minutes in ms. */
export const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;

/** Fifteen minutes in ms. */
export const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;

/** One hour in ms. */
export const ONE_HOUR_MS = MINUTES_PER_HOUR * ONE_MINUTE_MS;

/** One day in seconds (e.g. free trial expiration from env days, webpush TTL). */
export const ONE_DAY_SECONDS = SECONDS_PER_DAY;

/** One year in ms (e.g. auth cookie max age). */
export const ONE_YEAR_MS =
  365 * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

/** Default HTTP request timeout in ms. */
export const DEFAULT_HTTP_TIMEOUT_MS = 5000;

/**
 * Converts a jsonwebtoken-style `expiresIn` string (or seconds as decimal digits) to milliseconds
 * for cookie max-age alignment. Supports `s`, `m`, `h`, `d` suffixes (e.g. `365d`, `12h`, `3600` seconds).
 * Unknown shapes fall back to {@link ONE_YEAR_MS}.
 */
export function jwtExpiresInToMilliseconds(expiresIn: string): number {
  const s = expiresIn.trim().toLowerCase();
  const secondsOnly = /^(\d+)$/.exec(s);
  const secNum = secondsOnly?.[1];
  if (secNum !== undefined) {
    return parseInt(secNum, 10) * MS_PER_SECOND;
  }
  const unit = /^(\d+)\s*([smhd])$/.exec(s);
  if (!unit?.[1] || !unit[2]) {
    return ONE_YEAR_MS;
  }
  const n = parseInt(unit[1], 10);
  const mult = unit[2];
  switch (mult) {
    case 's':
      return n * MS_PER_SECOND;
    case 'm':
      return n * ONE_MINUTE_MS;
    case 'h':
      return n * ONE_HOUR_MS;
    case 'd':
      return n * HOURS_PER_DAY * ONE_HOUR_MS;
    default:
      return ONE_YEAR_MS;
  }
}

/** Default delay between poll attempts in ms (e.g. server-ready checks). */
export const DEFAULT_POLL_DELAY_MS = 1000;

/** How long toasts stay visible in ms. */
export const TOAST_DURATION_MS = 4000;

/** Media player seek forward amount in seconds. */
export const MEDIA_JUMP_FORWARD_SECONDS = 30;

/** Media player seek back amount in seconds. */
export const MEDIA_JUMP_BACK_SECONDS = 15;

/** Media player small increment/decrement in seconds. */
export const MEDIA_JUMP_INCREMENT_SECONDS = 1;

/** Live item listener poll interval in ms. */
export const LIVE_ITEM_POLL_INTERVAL_MS = 5000;

/** Max attempts when waiting for web app server ready (2 min at 1s interval). */
export const SERVER_READY_WAIT_MAX_ATTEMPTS_WEB = 120;

/** Max attempts when waiting for API server ready (3 min at 1s interval). */
export const SERVER_READY_WAIT_MAX_ATTEMPTS_API = 180;

/** Delay before shutdown in ms (lighthouse tooling). */
export const SHUTDOWN_DELAY_MS = 5000;
