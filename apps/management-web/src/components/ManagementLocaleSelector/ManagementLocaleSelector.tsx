'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { SUPPORTED_LOCALES } from '@podverse/helpers';

import { getConfig } from '../../config';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const LOCALE_COOKIE = 'NEXT_LOCALE';

function getSupportedLocaleCodesFromConfig(): string[] {
  const supported = getConfig().public.features.locales.supported;
  if (!supported || supported === 'all-available') {
    return [...SUPPORTED_LOCALES];
  }
  const requested = supported
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  return requested.filter((c) => SUPPORTED_LOCALES.includes(c));
}

function getLanguageLabel(t: (key: string) => string, code: string): string {
  switch (code) {
    case 'en-US':
      return t('languages.en-US');
    case 'es':
      return t('languages.es');
    case 'fr':
      return t('languages.fr');
    case 'el-GR':
      return t('languages.el-GR');
    default:
      return code;
  }
}

type ManagementLocaleSelectorProps = {
  id?: string;
  className?: string;
};

export function ManagementLocaleSelector({ id, className }: ManagementLocaleSelectorProps) {
  const t = useTranslations('language');
  const router = useRouter();
  const intlLocale = useLocale();
  const [value, setValue] = useState(intlLocale);

  useEffect(() => {
    setValue(intlLocale);
  }, [intlLocale]);

  const options = useMemo(() => {
    let codes = getSupportedLocaleCodesFromConfig();
    if (codes.length === 0) {
      codes = [SUPPORTED_LOCALES[0] ?? 'en-US'];
    }
    return codes.map((code) => ({
      value: code,
      label: getLanguageLabel(t, code),
    }));
  }, [t]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = e.target.value;
      if (next === intlLocale) {
        return;
      }
      setValue(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      void router.refresh();
    },
    [intlLocale, router]
  );

  return (
    <select
      id={id}
      className={className}
      aria-label={t('language')}
      value={value}
      onChange={onChange}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
