'use client';

import { useTranslations } from 'next-intl';

import { ManagementPageShell } from '@podverse/ui';

import { ManagementSettingsGeneralFields } from '../../../components/ManagementSettingsGeneralFields';
import { useManagementClientSessionGuard } from '../../../hooks/useManagementClientSessionGuard';
import type { CurrentUser } from '../../../lib/requests/auth';
import type { UITheme } from '../../../utils/uiTheme';

export type SettingsPageClientProps = {
  initialUser: CurrentUser;
};

function labelForTheme(
  t: (
    key:
      | 'theme.options.dark'
      | 'theme.options.light'
      | 'theme.options.dracula'
      | 'theme.options.violet'
  ) => string,
  theme: UITheme
): string {
  switch (theme) {
    case 'dark':
      return t('theme.options.dark');
    case 'light':
      return t('theme.options.light');
    case 'dracula':
      return t('theme.options.dracula');
    case 'violet':
      return t('theme.options.violet');
    default:
      return theme;
  }
}

export function SettingsPageClient({ initialUser }: SettingsPageClientProps) {
  const t = useTranslations('settings');
  useManagementClientSessionGuard(initialUser);

  return (
    <ManagementPageShell subtitle={t('subtitle')} title={t('title')}>
      <ManagementSettingsGeneralFields themeOptionLabel={(th) => labelForTheme(t, th)} />
    </ManagementPageShell>
  );
}
