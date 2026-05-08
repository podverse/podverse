'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import { SharableStatusEnum } from '@podverse/helpers';
import { FormDropdown } from '@podverse/ui';

import { useAccount } from '../../../../contexts/Account';
import { useConfig } from '../../../../contexts/Config';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { writeCookie } from '../../../../utils/cookie';

export const SettingsLocaleSelector: React.FC = () => {
  const config = useConfig();
  const apiRequestService = getApiRequestService();
  const tLanguage = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const { loggedInAccount, setLoggedInAccount } = useAccount();

  // Get supported locales from config
  const supportedLocalesConfig = config.public.features.locales.supported;
  const allLanguages = [
    { value: 'en-US', label: tLanguage('languages.en-US') },
    { value: 'es', label: tLanguage('languages.es') },
    { value: 'fr', label: tLanguage('languages.fr') },
    { value: 'el-GR', label: tLanguage('languages.el-GR') },
  ];

  // Filter to only supported locales
  let languages = allLanguages;
  if (supportedLocalesConfig !== 'all-available') {
    const supportedLocales = supportedLocalesConfig
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    languages = allLanguages.filter((l) => supportedLocales.includes(l.value));
  }

  const options = languages.map((l) => ({
    label: l.label,
    value: l.value,
  }));

  const handleChange = async (value: string) => {
    if (!value || value === locale) {
      return;
    }

    // Persist the chosen locale in a cookie
    try {
      writeCookie('NEXT_LOCALE', value);
    } catch {
      // swallow
    }

    // If user is logged in, update account with all 4 fields
    if (loggedInAccount) {
      try {
        const updatedAccount = await apiRequestService.reqAccountUpdate({
          display_name: loggedInAccount.account_profile?.display_name || null,
          bio: loggedInAccount.account_profile?.bio || null,
          sharable_status: loggedInAccount.sharable_status_id || SharableStatusEnum.Private,
          locale: value,
        });
        setLoggedInAccount(updatedAccount);
      } catch {
        // Continue with refresh even if API call fails
      }
    }

    try {
      router.refresh();
    } catch {
      window.location.reload();
    }
  };

  return (
    <FormDropdown
      id="settings_language_selector"
      eyebrow={tLanguage('language')}
      options={options}
      value={locale}
      onChange={handleChange}
    />
  );
};
