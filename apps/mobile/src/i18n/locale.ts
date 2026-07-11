import { getLocales } from 'expo-localization';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@podverse/helpers/locales';

const SUPPORTED_LOCALE_SET = new Set(SUPPORTED_LOCALES);

function getLanguagePrefix(localeCode: string): string {
  const [prefix] = localeCode.split('-');
  return prefix.toLowerCase();
}

export function resolveSupportedLocale(
  requestedLocale: string | null | undefined,
  fallbackLocale: string = DEFAULT_LOCALE
): string {
  if (requestedLocale && SUPPORTED_LOCALE_SET.has(requestedLocale)) {
    return requestedLocale;
  }

  if (requestedLocale) {
    const requestedPrefix = getLanguagePrefix(requestedLocale);
    const languageMatch = SUPPORTED_LOCALES.find((supportedLocale) => {
      return getLanguagePrefix(supportedLocale) === requestedPrefix;
    });
    if (languageMatch) {
      return languageMatch;
    }
  }

  if (SUPPORTED_LOCALE_SET.has(fallbackLocale)) {
    return fallbackLocale;
  }

  return DEFAULT_LOCALE;
}

export function detectDeviceLocale(): string {
  const locales = getLocales();
  for (const locale of locales) {
    const languageTag = locale.languageTag;
    if (!languageTag) {
      continue;
    }
    const resolvedLocale = resolveSupportedLocale(languageTag);
    if (SUPPORTED_LOCALE_SET.has(resolvedLocale)) {
      return resolvedLocale;
    }
  }

  return DEFAULT_LOCALE;
}
