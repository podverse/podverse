'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';

import { ROUTES } from '../../../../constants/routes';
import { useAccount } from '../../../../contexts/Account';
import { SettingsSection } from '../../SettingsSection';

export function SettingsTerms() {
  const t = useTranslations('terms_acceptance');
  const { loggedInAccount } = useAccount();
  const agreedVersion = loggedInAccount?.account_terms_acceptance?.terms_version;
  if (agreedVersion === undefined || agreedVersion === '') {
    return null;
  }

  return (
    <SettingsSection>
      <h3>{t('header')}</h3>
      <NextLink href={ROUTES.TERMS}>
        {t('agreement_date', { agreement_date: agreedVersion })}
      </NextLink>
    </SettingsSection>
  );
}
