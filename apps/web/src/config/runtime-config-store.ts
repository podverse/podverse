/* eslint-disable no-console */
import type { WebRuntimeConfig, WebRuntimeConfigEnvKey } from './runtime-config';
import { webRuntimeConfigEnvKeys } from './runtime-config';

const DEFAULT_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS = 86400;

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

function applyWebRuntimeEnvDefaults(env: WebRuntimeConfig['env']): WebRuntimeConfig['env'] {
  const rawCache = env.NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS;
  const resolvedCache =
    rawCache !== undefined && rawCache !== ''
      ? rawCache
      : String(DEFAULT_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS);
  const rawImageProxy = env.NEXT_PUBLIC_IMAGE_PROXY_ENABLED;
  const resolvedImageProxy =
    rawImageProxy !== undefined && rawImageProxy !== '' ? rawImageProxy : 'false';
  const rawNextImageOptimization = env.NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED;
  const resolvedNextImageOptimization =
    rawNextImageOptimization !== undefined && rawNextImageOptimization !== ''
      ? rawNextImageOptimization
      : 'false';
  return {
    ...env,
    NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS: resolvedCache,
    NEXT_PUBLIC_IMAGE_PROXY_ENABLED: resolvedImageProxy,
    NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED: resolvedNextImageOptimization,
  };
}

let hasLoggedFallback = false;

export const getRuntimeConfig = (): WebRuntimeConfig => {
  const runtimeConfig = globalThis.__PODVERSE_RUNTIME_CONFIG__;
  const baseEnv = runtimeConfig
    ? runtimeConfig.env
    : (() => {
        // Build/prerender or worker without instrumentation: fall back to process.env.
        // In dev, request handlers may run in a different process than instrumentation,
        // so globalThis is not shared and fallback is expected.
        if (process.env.NODE_ENV !== 'production' && !hasLoggedFallback) {
          hasLoggedFallback = true;
          console.log(
            '[runtime-config] Using process.env (sidecar config not set in this process; normal in dev if handlers run in a separate worker).'
          );
        }
        return buildRuntimeConfigFromProcessEnv().env;
      })();
  return { env: applyWebRuntimeEnvDefaults(baseEnv) };
};

export {};
