'use client';

import { useTranslations } from 'next-intl';

import { ManagementPageShell } from '@podverse/ui';

import { ManagementSettingsGeneralFields } from '../../../components/ManagementSettingsGeneralFields';
import { useManagementClientSessionGuard } from '../../../hooks/useManagementClientSessionGuard';
import type { CurrentUser } from '../../../lib/requests/auth';

export type SettingsPageClientProps = {
  initialUser: CurrentUser;
};

export function SettingsPageClient({ initialUser }: SettingsPageClientProps) {
  const t = useTranslations('settings');
  useManagementClientSessionGuard(initialUser);

  return (
    <ManagementPageShell subtitle={t('subtitle')} title={t('title')}>
      <ManagementSettingsGeneralFields />
    </ManagementPageShell>
  );
}
