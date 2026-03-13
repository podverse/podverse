import 'server-only';

import { fetchWithTimeout } from '@podverse/helpers-backend';

import type { ManagementWebRuntimeConfig } from './runtime-config';

const getRuntimeConfigUrl = (): string => {
  const url = process.env.RUNTIME_CONFIG_URL;
  if (!url) {
    throw new Error('Missing RUNTIME_CONFIG_URL for runtime config sidecar.');
  }
  return url.replace(/\/$/, '');
};

let cachedRuntimeConfig: Promise<ManagementWebRuntimeConfig> | null = null;

const fetchManagementWebRuntimeConfigFromSidecarUncached =
  async (): Promise<ManagementWebRuntimeConfig> => {
    const baseUrl = getRuntimeConfigUrl();
    const response = await fetchWithTimeout(`${baseUrl}/runtime-config`, {
      cache: 'no-store',
      timeoutMs: 2000,
    });
    if (!response.ok) {
      throw new Error(`Runtime config sidecar returned ${response.status}.`);
    }
    const runtimeConfig: ManagementWebRuntimeConfig = await response.json();
    return runtimeConfig;
  };

export const fetchManagementWebRuntimeConfigFromSidecar =
  async (): Promise<ManagementWebRuntimeConfig> => {
    if (cachedRuntimeConfig !== null) {
      return cachedRuntimeConfig;
    }
    cachedRuntimeConfig = fetchManagementWebRuntimeConfigFromSidecarUncached();
    return cachedRuntimeConfig;
  };
