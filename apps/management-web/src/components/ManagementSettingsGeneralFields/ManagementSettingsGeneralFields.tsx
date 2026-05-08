'use client';

import { useTranslations } from 'next-intl';

import { Divider } from '@podverse/ui';

import { ManagementLocaleSelector } from '../ManagementLocaleSelector/ManagementLocaleSelector';
import { ManagementThemeSwitcher } from '../ManagementThemeSwitcher/ManagementThemeSwitcher';

import styles from './ManagementSettingsGeneralFields.module.scss';

/**
 * Language + theme controls aligned with web `SettingsGeneral`
 * (order: language, divider, theme; `FormDropdown` `eyebrow` prop; constrained width).
 */
export function ManagementSettingsGeneralFields() {
  const t = useTranslations('settings');

  return (
    <div className={styles.content}>
      <ManagementLocaleSelector id="settings-locale" eyebrow={t('language.label')} />
      <Divider withSpacing />
      <ManagementThemeSwitcher id="settings-ui-theme" />
    </div>
  );
}
