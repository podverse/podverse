import { format, Locale } from 'date-fns';
import { enUS, es, fr, el } from 'date-fns/locale';

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

export const dateFnsLocaleMap: Record<string, Locale> = {
  en: enUS,
  es: es,
  fr: fr,
  'el-GR': el,
};

export function getDateFnsLocale(appLocale: string): Locale {
  return dateFnsLocaleMap[appLocale] || enUS;
}
