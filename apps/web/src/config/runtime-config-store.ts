/* eslint-disable no-console */
import { getEffectiveUserAgent } from '@podverse/helpers';

import {
  webRuntimeConfigEnvKeys,
  type WebRuntimeConfig,
  type WebRuntimeConfigEnvKey,
} from './runtime-config';

declare global {
  var __PODVERSE_RUNTIME_CONFIG__: WebRuntimeConfig | undefined;
}

export const setRuntimeConfig = (runtimeConfig: WebRuntimeConfig): void => {
  globalThis.__PODVERSE_RUNTIME_CONFIG__ = runtimeConfig;
};

export const hasRuntimeConfig = (): boolean => globalThis.__PODVERSE_RUNTIME_CONFIG__ !== undefined;

function getEffectiveProxyUserAgent(): string {
  return getEffectiveUserAgent({
    userAgentRaw: process.env.NEXT_PUBLIC_PROXY_USER_AGENT,
    brandName: process.env.NEXT_PUBLIC_BRAND_NAME ?? '',
    suffix: ' Bot Local/Web-API/5',
  });
}

/**
 * Build runtime config from process.env (used at build/prerender time
 * when instrumentation hasn't run yet).
 */
function buildRuntimeConfigFromProcessEnv(): WebRuntimeConfig {
  const allKeys = [
    ...webRuntimeConfigEnvKeys.required,
    ...webRuntimeConfigEnvKeys.optional,
  ] as WebRuntimeConfigEnvKey[];

  const env = Object.fromEntries(
    allKeys.map((key) => [key, process.env[key]])
  ) as WebRuntimeConfig['env'];

  env.NEXT_PUBLIC_PROXY_USER_AGENT = getEffectiveProxyUserAgent();
  return { env };
}

export const getRuntimeConfig = (): WebRuntimeConfig => {
  const runtimeConfig = globalThis.__PODVERSE_RUNTIME_CONFIG__;
  if (!runtimeConfig) {
    // Build/prerender time: instrumentation hasn't run yet.
    // Fall back to process.env (same values as sidecar will serve).
    if (process.env.NODE_ENV !== 'production') {
      console.log('[runtime-config] Using build-time process.env fallback');
    }
    return buildRuntimeConfigFromProcessEnv();
  }
  return runtimeConfig;
};

export {};
