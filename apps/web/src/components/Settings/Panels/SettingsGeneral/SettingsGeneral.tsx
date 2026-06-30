'use client';

import { FormMaxWidth, FormStack } from '@podverse/ui';

import { SettingsLocaleSelector } from './SettingsLocaleSelector';
import { SettingsMediaTypeSelector } from './SettingsMediaTypeSelector';
import { SettingsThemeSelector } from './SettingsThemeSelector';

export function SettingsGeneral() {
  return (
    <FormMaxWidth>
      <FormStack>
        <SettingsLocaleSelector />
        <SettingsThemeSelector />
        <SettingsMediaTypeSelector />
      </FormStack>
    </FormMaxWidth>
  );
}
