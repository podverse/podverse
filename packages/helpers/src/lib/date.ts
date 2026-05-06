import type { Locale } from 'date-fns';
import { format } from 'date-fns/format';
import { el } from 'date-fns/locale/el';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';

import { SUPPORTED_LOCALES } from './constants/locales.js';

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
