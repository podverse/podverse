import { getErrorResponseBody, getErrorResponseStatus } from '@podverse/helpers/error';
import { getFiniteNumberProperty, getOwnPropertyValue } from '@podverse/helpers/guards';

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export const getRetryAfterMinutes = (retryAfterSeconds: number): number => {
  return Math.max(1, Math.ceil(retryAfterSeconds / 60));
};

/**
 * The shared string's argument is `minutes`, and mobile's i18next picks the plural form by
 * `count`, so both are passed.
 */
export const formatOpmlRetryAfterTime = (retryAfterSeconds: number, t: TranslateFn): string => {
  const minutes = getRetryAfterMinutes(retryAfterSeconds);
  return t('settings.opml.import_rate_limited_time', { count: minutes, minutes });
};

export const buildOpmlRateLimitMessage = (
  limit: number,
  retryAfterSeconds: number,
  t: TranslateFn
): string => {
  return t('settings.opml.import_rate_limited', {
    limit,
    time: formatOpmlRetryAfterTime(retryAfterSeconds, t),
  });
};

/** The window of every per-minute limit, used when a 429 body names no reset time. */
const RATE_LIMIT_DEFAULT_RETRY_AFTER_MS = 60000;
const RATE_LIMIT_MIN_RETRY_AFTER_MS = 1000;

/**
 * How long to wait before retrying a 429, in milliseconds, or null when the error is not a 429.
 * Reads `timeUntilResetMs`, then `retry_after_seconds`, then `minutesRemaining` from the body, and
 * never answers less than one second.
 */
export const getRateLimitRetryAfterMs = (error: unknown): number | null => {
  if (getErrorResponseStatus(error) !== 429) {
    return null;
  }

  const data = getErrorResponseBody(error);
  const timeUntilResetMs =
    data === undefined ? null : getFiniteNumberProperty(data, 'timeUntilResetMs');
  const retryAfterSeconds =
    data === undefined ? null : getFiniteNumberProperty(data, 'retry_after_seconds');
  const minutesRemaining =
    data === undefined ? null : getFiniteNumberProperty(data, 'minutesRemaining');

  const waitMs =
    timeUntilResetMs ??
    (retryAfterSeconds !== null ? retryAfterSeconds * 1000 : null) ??
    (minutesRemaining !== null ? minutesRemaining * 60000 : null) ??
    RATE_LIMIT_DEFAULT_RETRY_AFTER_MS;
  return Math.max(RATE_LIMIT_MIN_RETRY_AFTER_MS, waitMs);
};

/**
 * Parse a 429 response into a localized rate-limit message.
 * Returns null when the error is not a rate-limit response.
 */
export const handleRateLimitMessage = (error: unknown, t: TranslateFn): string | null => {
  if (getErrorResponseStatus(error) !== 429) {
    return null;
  }

  const data = getErrorResponseBody(error);
  const minutesRemaining =
    data === undefined ? null : getFiniteNumberProperty(data, 'minutesRemaining');
  const retryAfterSeconds =
    data === undefined ? null : getFiniteNumberProperty(data, 'retry_after_seconds');
  const tooManyRequests =
    data !== undefined && getOwnPropertyValue(data, 'tooManyRequests') === true;

  const fallbackMinutes =
    retryAfterSeconds !== null ? getRetryAfterMinutes(retryAfterSeconds) : null;
  const rateLimitMinutes =
    minutesRemaining !== null ? Math.max(1, Math.ceil(minutesRemaining)) : fallbackMinutes;

  if (!tooManyRequests && rateLimitMinutes === null) {
    return null;
  }

  if (rateLimitMinutes === null) {
    return t('misc.rate_limit.generic');
  }

  if (rateLimitMinutes === 1) {
    return t('misc.rate_limit.minute_remaining', { minutes: 1 });
  }

  return t('misc.rate_limit.minutes_remaining', { minutes: rateLimitMinutes });
};
