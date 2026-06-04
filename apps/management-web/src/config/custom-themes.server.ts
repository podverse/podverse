import {
  enrichRuntimeConfigWithCustomThemes,
  getCustomThemeCssTextForRuntimeConfig,
  isCustomThemesHydrated,
} from '@podverse/ui/custom-themes/server';

import type { ManagementWebRuntimeConfig } from './runtime-config';

export { isCustomThemesHydrated };

export async function enrichManagementRuntimeConfigWithCustomThemes(
  runtimeConfig: ManagementWebRuntimeConfig
): Promise<ManagementWebRuntimeConfig> {
  return enrichRuntimeConfigWithCustomThemes(runtimeConfig);
}

export function getCustomThemeCssText(runtimeConfig: ManagementWebRuntimeConfig): string {
  return getCustomThemeCssTextForRuntimeConfig(runtimeConfig.customThemes);
}
