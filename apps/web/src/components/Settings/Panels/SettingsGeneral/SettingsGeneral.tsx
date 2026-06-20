'use client';

import { Divider, FormMaxWidth } from '@podverse/ui';

import { SettingsLocaleSelector } from './SettingsLocaleSelector';
import { SettingsMediaTypeSelector } from './SettingsMediaTypeSelector';
import { SettingsThemeSelector } from './SettingsThemeSelector';

export function SettingsGeneral() {
  return (
    <FormMaxWidth>
      <SettingsLocaleSelector />
      <Divider withSpacing />
      <SettingsThemeSelector />
      <Divider withSpacing />
      <SettingsMediaTypeSelector />
    </FormMaxWidth>
  );
}
