import { format } from 'date-fns/format';
import type { Locale } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';
import { el } from 'date-fns/locale/el';

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

export const convertSecondsToDaysText = (seconds: string) => {
  const totalDays = Math.round(parseInt(seconds, 10) / 86400);
  return `${totalDays > 1 ? `${totalDays} days` : '24 hours'}`;
};

export function getDateFnsLocale(appLocale: string): Locale {
  return dateFnsLocaleMap[appLocale] ?? enUS;
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
