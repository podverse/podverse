'use client';

import { Divider } from '../../../Divider/Divider';
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
