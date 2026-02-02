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

export const convertSecondsToDaysText = (seconds: string) => {
  const totalDays = Math.round(parseInt(seconds, 10) / 86400);
  return `${totalDays > 1 ? `${totalDays} days` : '24 hours'}`;
};

export function getDateFnsLocale(appLocale: string): Locale {
  return dateFnsLocaleMap[appLocale] ?? enUS;
}
