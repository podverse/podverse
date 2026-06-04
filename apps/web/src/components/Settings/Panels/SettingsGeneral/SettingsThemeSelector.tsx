'use client';

import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import { ALL_POSSIBLE_THEMES, FormDropdown } from '@podverse/ui';

import { useLocalSettings } from '../../../../contexts/LocalSettings';
import { getCustomThemeById, getValidThemes } from '../../../../utils/localSettings/uiTheme';

export const SettingsThemeSelector: React.FC = () => {
  const tSettings = useTranslations('settings');
  const locale = useLocale();
  const { uiTheme, setUITheme } = useLocalSettings();
  const validThemes = getValidThemes();
  const builtInThemes = new Set<string>(ALL_POSSIBLE_THEMES);

  const options = validThemes.map((theme) => ({
    label: (() => {
      if (builtInThemes.has(theme)) {
        return tSettings(`ui_theme.${theme}`);
      }
      const customTheme = getCustomThemeById(theme);
      if (customTheme?.labels?.[locale]) {
        return customTheme.labels[locale];
      }
      if (customTheme?.labels?.['en-US']) {
        return customTheme.labels['en-US'];
      }
      return customTheme?.id ?? theme;
    })(),
    value: theme,
  }));

  const handleChange = (value: string) => {
    if (!value || value === uiTheme) {
      return;
    }
    const next = validThemes.find((t) => t === value);
    if (next === undefined) {
      return;
    }
    setUITheme(next);
  };

  return (
    <FormDropdown
      id="settings_theme_selector"
      eyebrow={tSettings('ui_theme.theme')}
      options={options}
      value={uiTheme}
      onChange={handleChange}
    />
  );
};
