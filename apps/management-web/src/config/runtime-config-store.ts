/* eslint-disable no-console */
import {
  managementWebRuntimeConfigEnvKeys,
  type ManagementWebRuntimeConfig,
  type ManagementWebRuntimeConfigEnvKey,
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
 * Build runtime config from process.env (used at build/prerender time
 * when instrumentation hasn't run yet).
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
