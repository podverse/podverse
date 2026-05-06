'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
  Card,
  fieldPrimitiveClasses,
  FormGroup,
  FormStack,
  Label,
  ManagementPageShell,
} from '@podverse/ui';

import { ManagementLocaleSelector } from '../../../components/ManagementLocaleSelector/ManagementLocaleSelector';
import { ManagementThemeSwitcher } from '../../../components/ManagementThemeSwitcher/ManagementThemeSwitcher';
import type { CurrentUser } from '../../../lib/requests/auth';
import { getCurrentUser } from '../../../lib/requests/auth';
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
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser>(initialUser);

  useEffect(() => {
    let cancelled = false;

    const verifySessionFallback = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) {
          return;
        }
        if (!currentUser) {
          router.replace('/');
          return;
        }
        setUser(currentUser);
      } catch {
        if (!cancelled) {
          router.replace('/');
        }
      }
    };

    void verifySessionFallback();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!user) {
    return null;
  }

  return (
    <ManagementPageShell subtitle={t('subtitle')} title={t('title')}>
      <FormStack>
        <Card variant="bordered">
          <FormGroup>
            <Label htmlFor="settings-ui-theme">{t('theme.label')}</Label>
            <ManagementThemeSwitcher
              id="settings-ui-theme"
              className={fieldPrimitiveClasses.input}
              ariaLabel={t('theme.label')}
              optionLabel={(th) => labelForTheme(t, th)}
            />
          </FormGroup>
        </Card>
        <Card variant="bordered">
          <FormGroup>
            <Label htmlFor="settings-locale">{t('language.label')}</Label>
            <ManagementLocaleSelector
              id="settings-locale"
              className={fieldPrimitiveClasses.input}
            />
          </FormGroup>
        </Card>
      </FormStack>
    </ManagementPageShell>
  );
}
