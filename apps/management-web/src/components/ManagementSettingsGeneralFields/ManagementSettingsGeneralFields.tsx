'use client';

import { useTranslations } from 'next-intl';

import { Divider } from '@podverse/ui';

import type { UITheme } from '../../utils/uiTheme';
import { ManagementLocaleSelector } from '../ManagementLocaleSelector/ManagementLocaleSelector';
import { ManagementThemeSwitcher } from '../ManagementThemeSwitcher/ManagementThemeSwitcher';

import styles from './ManagementSettingsGeneralFields.module.scss';

export type ManagementSettingsGeneralFieldsProps = {
  /** Maps theme id to option label (same as previous Settings page `labelForTheme`). */
  themeOptionLabel: (theme: UITheme) => string;
};

/**
 * Language + theme controls aligned with web `SettingsGeneral`
 * (order: language, divider, theme; `FormDropdown` `label` prop; constrained width).
 */
export function ManagementSettingsGeneralFields({
  themeOptionLabel,
}: ManagementSettingsGeneralFieldsProps) {
  const t = useTranslations('settings');

  return (
    <div className={styles.content}>
      <ManagementLocaleSelector id="settings-locale" label={t('language.label')} />
      <Divider withSpacing />
      <ManagementThemeSwitcher
        id="settings-ui-theme"
        label={t('theme.label')}
        optionLabel={themeOptionLabel}
      />
    </div>
  );
}
