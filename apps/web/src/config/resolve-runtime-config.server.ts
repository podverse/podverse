import {
  enrichWebRuntimeConfigWithCustomThemes,
  isCustomThemesHydrated,
} from './custom-themes.server';
import type { WebRuntimeConfig } from './runtime-config';
import { fetchWebRuntimeConfigFromSidecar } from './runtime-config.server';
import { getRuntimeConfig, hasRuntimeConfig, setRuntimeConfig } from './runtime-config-store';

/**
 * Returns runtime config warmed at startup when possible. Re-fetches sidecar only when
 * the in-process store was never set (e.g. dev worker without instrumentation). Custom
 * themes load at most once per process when NEXT_PUBLIC_CUSTOM_THEMES_URL is set.
 */
export async function resolveWebRuntimeConfigForRequest(): Promise<WebRuntimeConfig> {
  if (hasRuntimeConfig()) {
    return getRuntimeConfig();
  }

  let runtimeConfig = getRuntimeConfig();

  if (process.env.RUNTIME_CONFIG_URL) {
    try {
      runtimeConfig = await fetchWebRuntimeConfigFromSidecar();
    } catch {
      runtimeConfig = getRuntimeConfig();
    }
  }

  if (!isCustomThemesHydrated(runtimeConfig)) {
    runtimeConfig = await enrichWebRuntimeConfigWithCustomThemes(runtimeConfig);
    setRuntimeConfig(runtimeConfig);
    return runtimeConfig;
  }

  if (process.env.RUNTIME_CONFIG_URL) {
    setRuntimeConfig(runtimeConfig);
  }

  return runtimeConfig;
}
