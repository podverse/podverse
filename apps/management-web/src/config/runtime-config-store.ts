/* eslint-disable no-console */
import {
  type ManagementWebRuntimeConfig,
  type ManagementWebRuntimeConfigEnvKey,
  managementWebRuntimeConfigEnvKeys,
} from './runtime-config';

declare global {
  var __PODVERSE_MANAGEMENT_RUNTIME_CONFIG__: ManagementWebRuntimeConfig | undefined;
}

export const setRuntimeConfig = (runtimeConfig: ManagementWebRuntimeConfig): void => {
  globalThis.__PODVERSE_MANAGEMENT_RUNTIME_CONFIG__ = runtimeConfig;
};

export const hasRuntimeConfig = (): boolean =>
  globalThis.__PODVERSE_MANAGEMENT_RUNTIME_CONFIG__ !== undefined;

/**
 * Build runtime config from process.env (e.g. build / prerender when
 * instrumentation and root layout have not set the store yet, or
 * E2E with full NEXT_PUBLIC_* in env).
 */
function buildRuntimeConfigFromProcessEnv(): ManagementWebRuntimeConfig {
  const allKeys = [
    ...managementWebRuntimeConfigEnvKeys.required,
    ...managementWebRuntimeConfigEnvKeys.optional,
  ] as ManagementWebRuntimeConfigEnvKey[];

  const env = Object.fromEntries(
    allKeys.map((key) => [key, process.env[key]])
  ) as ManagementWebRuntimeConfig['env'];

  return { env };
}

export const getRuntimeConfig = (): ManagementWebRuntimeConfig => {
  const runtimeConfig = globalThis.__PODVERSE_MANAGEMENT_RUNTIME_CONFIG__;
  if (!runtimeConfig) {
    // No store yet: prerender, or `RUNTIME_CONFIG_URL` not used; fall back to process.env
    // (use inline NEXT_PUBLIC_* in .env.local if not using the sidecar in this run).
    if (process.env.NODE_ENV !== 'production') {
      console.log('[runtime-config] Using build-time process.env fallback');
    }
    return buildRuntimeConfigFromProcessEnv();
  }
  return runtimeConfig;
};

export {};
