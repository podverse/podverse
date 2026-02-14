import type { DTOAccount } from '@podverse/helpers';
import { SUPPORTED_LOCALES } from '@podverse/helpers';
import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';
import { getConfig } from '../config';

function getSupportedLocales(): string[] {
  const supportedLocalesEnv = getConfig().public.features.locales.supported;
  // At build time (prerender), config may be undefined - use all locales as fallback
  if (!supportedLocalesEnv || supportedLocalesEnv === 'all-available') {
    return [...SUPPORTED_LOCALES];
  }
  const requested = supportedLocalesEnv
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  return requested.filter((l) =>
    SUPPORTED_LOCALES.includes(l as (typeof SUPPORTED_LOCALES)[number])
  );
}

function getDefaultLocale(): string {
  const defaultLocale = getConfig().public.features.locales.default;
  // At build time (prerender), config may be undefined - use en-US as fallback
  return defaultLocale || SUPPORTED_LOCALES[0] || 'en-US';
}

async function detectLocale(ssrLoggedInAccount?: DTOAccount | null) {
  const supportedLocales = getSupportedLocales();
  const defaultLocale = getDefaultLocale();
  const cookieStore = await cookies();

  // 1. HIGHEST PRIORITY: Check account settings locale (if user is logged in)
  const accountLocale = ssrLoggedInAccount?.account_settings?.account_settings_locale?.locale;

  if (accountLocale) {
    // Try exact match first
    if (supportedLocales.includes(accountLocale)) {
      return accountLocale;
    }
    // Try base language match (e.g., 'en' from 'en-US')
    const baseAccountLocale = accountLocale.split('-')[0];
    if (baseAccountLocale && supportedLocales.includes(baseAccountLocale)) {
      return baseAccountLocale;
    }
  }

  // 2. Check if cookie locale is supported (explicit user choice)
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 3. Use configured default locale if it's supported
  if (supportedLocales.includes(defaultLocale)) {
    return defaultLocale;
  }

  // 4. Check Accept-Language header as fallback
  const hdrs = await headers();
  const acceptLanguage = hdrs.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map((lang) => {
        const firstPart = lang.split(';')[0];
        return firstPart ? firstPart.trim() : '';
      })
      .filter(Boolean);
    for (const lang of preferred) {
      if (supportedLocales.includes(lang)) {
        return lang;
      }
      const base = lang.split('-')[0];
      if (base && supportedLocales.includes(base)) {
        return base;
      }
    }
  }

  // 5. Last resort: first supported locale or default
  return supportedLocales[0] || SUPPORTED_LOCALES[0];
}

// Store the account in a module-level variable that can be set before calling getRequestConfig
let cachedAccount: DTOAccount | null = null;

export function setSSRAccountForLocale(account: DTOAccount | null) {
  cachedAccount = account;
}

export default getRequestConfig(async () => {
  const locale = await detectLocale(cachedAccount);
  if (!locale) {
    throw new Error('Failed to detect locale');
  }

  let originals;
  try {
    let localeOriginals;
    try {
      localeOriginals = (await import(`../../i18n/originals/${locale}.json`)).default;
    } catch {
      const base = locale.split('-')[0];
      if (base) {
        try {
          localeOriginals = (await import(`../../i18n/originals/${base}.json`)).default;
        } catch {
          localeOriginals = null;
        }
      } else {
        localeOriginals = null;
      }
    }

    const enOriginals = (await import('../../i18n/originals/en-US.json')).default;
    originals = localeOriginals ? { ...enOriginals, ...localeOriginals } : enOriginals;
  } catch {
    originals = (await import('../../i18n/originals/en-US.json')).default;
  }

  return {
    locale,
    messages: originals,
  };
});
