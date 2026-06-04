import { enrichManagementRuntimeConfigWithCustomThemes } from './custom-themes.server';
import { fetchManagementWebRuntimeConfigFromSidecar } from './runtime-config.server';
import { getRuntimeConfig, setRuntimeConfig } from './runtime-config-store';

/**
 * Loads runtime config and custom themes once per Node worker at startup.
 * Throws when NEXT_PUBLIC_CUSTOM_THEMES_URL is set but the pack cannot be loaded.
 */
export async function warmManagementWebRuntimeConfigAtStartup(): Promise<void> {
  let runtimeConfig = getRuntimeConfig();

  if (process.env.RUNTIME_CONFIG_URL) {
    runtimeConfig = await fetchManagementWebRuntimeConfigFromSidecar();
  }

  runtimeConfig = await enrichManagementRuntimeConfigWithCustomThemes(runtimeConfig);
  setRuntimeConfig(runtimeConfig);
}
