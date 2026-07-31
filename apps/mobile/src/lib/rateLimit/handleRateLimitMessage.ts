import { getErrorResponseBody, getErrorResponseStatus } from '@podverse/helpers/error';
import { getFiniteNumberProperty, getOwnPropertyValue } from '@podverse/helpers/guards';

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export const getRetryAfterMinutes = (retryAfterSeconds: number): number => {
  return Math.max(1, Math.ceil(retryAfterSeconds / 60));
};

/** Mobile-friendly time phrase (i18next does not evaluate consumer ICU plural keys). */
export const formatOpmlRetryAfterTime = (retryAfterSeconds: number, t: TranslateFn): string => {
  const minutes = getRetryAfterMinutes(retryAfterSeconds);
  if (minutes === 1) {
    return t('features.opml.rate_limited_time_one');
  }
  return t('features.opml.rate_limited_time_other', { minutes });
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
