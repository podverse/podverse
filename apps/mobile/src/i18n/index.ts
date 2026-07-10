import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE } from '@podverse/helpers/locales';

import { detectDeviceLocale, resolveSupportedLocale } from './locale';
import { MOBILE_I18N_RESOURCES } from './resources';

export async function initializeI18n(): Promise<void> {
  if (i18next.isInitialized) {
    return;
  }

  const deviceLocale = detectDeviceLocale();
  const initialLocale = resolveSupportedLocale(deviceLocale);

  await i18next.use(initReactI18next).init({
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
    keySeparator: '.',
    lng: initialLocale,
    ns: ['translation'],
    nsSeparator: false,
    defaultNS: 'translation',
    resources: MOBILE_I18N_RESOURCES,
    returnNull: false,
  });
}

export async function applyAccountLocaleOverride(
  accountLocale: string | null | undefined
): Promise<void> {
  const targetLocale = resolveSupportedLocale(accountLocale, detectDeviceLocale());
  if (i18next.language === targetLocale) {
    return;
  }

  await i18next.changeLanguage(targetLocale);
}
