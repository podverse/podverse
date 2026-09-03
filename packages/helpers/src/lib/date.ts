import type { Locale } from 'date-fns';
import { format } from 'date-fns/format';
import { el } from 'date-fns/locale/el';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';

import { SUPPORTED_LOCALES } from './constants/locales.js';
import { ONE_DAY_MS } from './timeConstants.js';

/** date-fns locale module ids for SUPPORTED_LOCALES (en-US, es, fr, el for el-GR). Use for bundle restriction (e.g. Webpack ContextReplacementPlugin). */
export const DATE_FNS_LOCALE_IDS: readonly string[] = SUPPORTED_LOCALES.map((loc) =>
  loc === 'el-GR' ? 'el' : loc
);

const dateFnsLocales: Record<string, Locale> = {
  'en-US': enUS,
  en: enUS,
  es,
  fr,
  'el-GR': el,
};

export const dateFnsLocaleMap: Record<string, Locale> = dateFnsLocales;

export const formatDateAbbrev = (date: Date | number | string, localeString: string): string => {
  const d =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(typeof date === 'number' && date < 1e12 ? date * 1000 : date)
      : date;
  const locale = getDateFnsLocale(localeString);
  return format(d, 'MMM d yyyy', { locale });
};

export const formatDateTimeAbbrev = (
  date: Date | number | string,
  localeString: string
): string => {
  const d =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(typeof date === 'number' && date < 1e12 ? date * 1000 : date)
      : date;
  const formatter = new Intl.DateTimeFormat(localeString, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
  return formatter.format(d);
};

export function formatDateTimeAbbrevOrFallback(
  value: string | null | undefined,
  localeString: string,
  fallback: string
): string {
  if (value === null || value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return formatDateTimeAbbrev(value, localeString);
}

export const convertExpirationToDaysText = (expiration: string) => {
  const totalDays = Math.round(parseInt(expiration, 10) / 86400);
  return `${totalDays > 1 ? `${totalDays} days` : '24 hours'}`;
};

export function toDatetimeLocalInputValue(
  value: Date | number | string | null | undefined
): string {
  if (value === null || value === undefined) {
    return '';
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getDateFnsLocale(appLocale: string): Locale {
  return dateFnsLocaleMap[appLocale] ?? enUS;
}

/**
 * Add `monthsToAdd` calendar months to `baseDate` using UTC fields. Negative or
 * zero values are supported. Day-of-month is clamped to the target month's last
 * day (e.g. Jan 31 + 1 month -> Feb 28 in non-leap years, Feb 29 in leap years).
 * Time-of-day (hours/minutes/seconds/ms) is preserved in UTC.
 */
export function addUtcMonthsClamped(baseDate: Date, monthsToAdd: number): Date {
  const baseYear = baseDate.getUTCFullYear();
  const baseMonth = baseDate.getUTCMonth();
  const baseDay = baseDate.getUTCDate();

  const targetMonthIndex = baseMonth + monthsToAdd;
  const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(baseDay, daysInTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      clampedDay,
      baseDate.getUTCHours(),
      baseDate.getUTCMinutes(),
      baseDate.getUTCSeconds(),
      baseDate.getUTCMilliseconds()
    )
  );
}

/**
 * Returns the later of two Date values. Ties return `a` (stable for equal instants).
 */
export function laterOfDates(a: Date, b: Date): Date {
  return b.getTime() > a.getTime() ? b : a;
}

/**
 * The instant `days` before `from` — the cutoff a retention or staleness window compares against.
 *
 * Subtracts an absolute duration rather than stepping the calendar field, so a day is always 24
 * hours. Callers are deciding how long something is kept, and a window that quietly becomes 23 or 25
 * hours long twice a year because the server happens to observe daylight saving is a worse answer
 * than a fixed one. The stored timestamps this is compared against are UTC, where the distinction
 * does not exist at all.
 */
export function subtractDays(from: Date, days: number): Date {
  return new Date(from.getTime() - days * ONE_DAY_MS);
}

/**
 * Parse a date string to epoch milliseconds, or `null` when there is nothing usable to parse.
 *
 * Timestamps arrive as strings from every direction — an API response, a JSON row read back out of
 * a device database, a cookie — and any of them can be absent, empty, or written by a build that
 * formatted them differently. Comparing them means turning them into numbers first, and `Date.parse`
 * answers an unparseable string with `NaN`, which is worse than an absence: `NaN > x` is false and
 * so is `NaN < x`, so a bad value silently takes whichever branch the comparison happens to fall
 * into instead of being recognised as missing.
 *
 * Collapsing all three cases to `null` is what lets callers write one explicit check for "no
 * timestamp" and trust that anything else is a real number they can compare.
 */
export function toEpochMsOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** The coarsest unit that still describes a gap honestly, with the signed amount to render. */
export type RelativeTimeParts = {
  unit: Intl.RelativeTimeFormatUnit;
  value: number;
};

/**
 * Choose the unit and amount for "how long ago", leaving the wording to the caller.
 *
 * Only the arithmetic is shared, not the formatting, because the surfaces legitimately differ in
 * how they get a locale: one holds an `Intl.RelativeTimeFormat` it rebuilds when the user changes
 * language, another takes the ambient one. Returning parts lets each keep its own formatter while
 * the bucket boundaries stay one decision — otherwise the same notification reads "1 hour ago" on
 * one device and "60 minutes ago" on another.
 *
 * A negative value is the past, matching what `Intl.RelativeTimeFormat` expects. `null` means the
 * timestamp was unusable, which callers must render as nothing rather than pass along: that
 * formatter throws on a non-finite value, so an unparseable date is a crash and not a bad string.
 */
export function getRelativeTimeParts(
  value: string | null | undefined,
  nowMs: number = Date.now()
): RelativeTimeParts | null {
  const thenMs = toEpochMsOrNull(value);
  if (thenMs === null) {
    return null;
  }

  const seconds = Math.round((thenMs - nowMs) / 1000);
  if (Math.abs(seconds) < 60) {
    return { unit: 'second', value: seconds };
  }

  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) {
    return { unit: 'minute', value: minutes };
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return { unit: 'hour', value: hours };
  }

  return { unit: 'day', value: Math.round(hours / 24) };
}

/**
 * Normalize a value to an ISO date string or null.
 * Handles Date instances and strings (e.g. after JSON round-trip); invalid or empty values return null.
 */
export function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (value.trim() === '') return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toISOString' in value &&
    typeof (value as Date).toISOString === 'function'
  ) {
    return (value as Date).toISOString();
  }
  return null;
}
