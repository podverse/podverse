'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { FormDropdown } from '@podverse/ui';

import { useLocalSettings } from '../../../../contexts/LocalSettings';
import { getValidThemes } from '../../../../utils/localSettings/uiTheme';

export const SettingsThemeSelector: React.FC = () => {
  const tSettings = useTranslations('settings');
  const { uiTheme, setUITheme } = useLocalSettings();
  const validThemes = getValidThemes();

  const options = validThemes.map((theme) => ({
    label: tSettings(`ui_theme.${theme}`),
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
