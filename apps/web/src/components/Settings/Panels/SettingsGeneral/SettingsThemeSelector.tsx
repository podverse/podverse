'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { useLocalSettings } from '../../../../contexts/LocalSettings';
import type { UITheme } from '../../../../utils/localSettings/uiTheme';
import { getValidThemes } from '../../../../utils/localSettings/uiTheme';
import type { DropdownMenuItem } from '../../../Dropdown/Dropdown';
import { FormDropdown } from '../../../Form/FormDropdown';

export const SettingsThemeSelector: React.FC = () => {
  const tSettings = useTranslations('settings');
  const { uiTheme, setUITheme } = useLocalSettings();
  const validThemes = getValidThemes();

  const menuItems: DropdownMenuItem[] = validThemes.map((theme) => ({
    label: tSettings(`ui_theme.${theme}`),
    param: theme,
    value: theme,
  }));

  const handleChange = (value: string) => {
    if (!value || value === uiTheme) {
      return;
    }
    setUITheme(value as UITheme);
  };

  return (
    <FormDropdown
      label={tSettings('ui_theme.theme')}
      id="settings_theme_selector"
      menuItems={menuItems}
      value={uiTheme}
      onChange={handleChange}
    />
  );
};
