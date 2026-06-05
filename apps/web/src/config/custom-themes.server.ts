import {
  enrichRuntimeConfigWithCustomThemes,
  getCustomThemeCssTextForRuntimeConfig,
  isCustomThemesHydrated,
} from '@podverse/ui/custom-themes/server';

import type { WebRuntimeConfig } from './runtime-config';

export { isCustomThemesHydrated };

export async function enrichWebRuntimeConfigWithCustomThemes(
  runtimeConfig: WebRuntimeConfig
): Promise<WebRuntimeConfig> {
  return enrichRuntimeConfigWithCustomThemes(runtimeConfig);
}

export function getCustomThemeCssText(runtimeConfig: WebRuntimeConfig): string {
  return getCustomThemeCssTextForRuntimeConfig(runtimeConfig.customThemes);
}
