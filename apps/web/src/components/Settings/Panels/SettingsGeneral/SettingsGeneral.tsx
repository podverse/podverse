'use client';

import { Divider } from '@podverse/ui';

import { SettingsLocaleSelector } from './SettingsLocaleSelector';
import { SettingsThemeSelector } from './SettingsThemeSelector';

export function SettingsGeneral() {
  return (
    <>
      <SettingsLocaleSelector />
      <Divider withSpacing />
      <SettingsThemeSelector />
    </>
  );
}
