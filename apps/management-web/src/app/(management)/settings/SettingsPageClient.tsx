'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { ManagementLocaleSelector } from '../../../components/ManagementLocaleSelector/ManagementLocaleSelector';
import { ManagementThemeSwitcher } from '../../../components/ManagementThemeSwitcher/ManagementThemeSwitcher';
import { Card } from '../../../components/ui/Card/Card';
import { FormGroup } from '../../../components/ui/Form/FormGroup';
import { FormLabel } from '../../../components/ui/Form/FormLabel';
import type { CurrentUser } from '../../../lib/requests/auth';
import { getCurrentUser } from '../../../lib/requests/auth';
import type { UITheme } from '../../../utils/uiTheme';

import formInputStyles from '../../../components/ui/Form/FormInput.module.scss';
import pageStyles from './page.module.scss';

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
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </div>
      <main>
        <div className={pageStyles.stack}>
          <Card variant="bordered">
            <FormGroup>
              <FormLabel htmlFor="settings-ui-theme">{t('theme.label')}</FormLabel>
              <ManagementThemeSwitcher
                id="settings-ui-theme"
                className={formInputStyles.formInput}
                ariaLabel={t('theme.label')}
                optionLabel={(th) => labelForTheme(t, th)}
              />
            </FormGroup>
          </Card>
          <Card variant="bordered">
            <FormGroup>
              <FormLabel htmlFor="settings-locale">{t('language.label')}</FormLabel>
              <ManagementLocaleSelector
                id="settings-locale"
                className={formInputStyles.formInput}
              />
            </FormGroup>
          </Card>
        </div>
      </main>
    </div>
  );
}
