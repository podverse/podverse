/* eslint-disable no-console */
import {
  type WebRuntimeConfig,
  type WebRuntimeConfigEnvKey,
  webRuntimeConfigEnvKeys,
} from './runtime-config';

declare global {
  var __PODVERSE_RUNTIME_CONFIG__: WebRuntimeConfig | undefined;
}

export const setRuntimeConfig = (runtimeConfig: WebRuntimeConfig): void => {
  globalThis.__PODVERSE_RUNTIME_CONFIG__ = runtimeConfig;
};

export const hasRuntimeConfig = (): boolean => globalThis.__PODVERSE_RUNTIME_CONFIG__ !== undefined;

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
    allKeys.map((key) => {
      const v = process.env[key];
      return [key, typeof v === 'string' ? v.trim() : v];
    })
  ) as WebRuntimeConfig['env'];
  return { env };
}

let hasLoggedFallback = false;

export const getRuntimeConfig = (): WebRuntimeConfig => {
  const runtimeConfig = globalThis.__PODVERSE_RUNTIME_CONFIG__;
  if (!runtimeConfig) {
    // Build/prerender or worker without instrumentation: fall back to process.env.
    // In dev, request handlers may run in a different process than instrumentation,
    // so globalThis is not shared and fallback is expected.
    if (process.env.NODE_ENV !== 'production' && !hasLoggedFallback) {
      hasLoggedFallback = true;
      console.log(
        '[runtime-config] Using process.env (sidecar config not set in this process; normal in dev if handlers run in a separate worker).'
      );
    }
    return buildRuntimeConfigFromProcessEnv();
  }
  return runtimeConfig;
};

export {};
