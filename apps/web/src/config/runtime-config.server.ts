import type { WebRuntimeConfig } from './runtime-config';

import 'server-only';

async function fetchWithTimeout(
  url: string,
  options?: { cache?: RequestCache; timeoutMs?: number }
): Promise<Response> {
  const { cache, timeoutMs } = options ?? {};
  const controller = new AbortController();
  const timeoutId =
    timeoutMs && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    return await fetch(url, { cache, signal: controller.signal });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const getRuntimeConfigUrl = (): string => {
  const url = process.env.RUNTIME_CONFIG_URL;
  if (!url) {
    throw new Error('Missing RUNTIME_CONFIG_URL for runtime config sidecar.');
  }
  return url.replace(/\/$/, '');
};

let cachedRuntimeConfig: Promise<WebRuntimeConfig> | null = null;

const fetchWebRuntimeConfigFromSidecarUncached = async (): Promise<WebRuntimeConfig> => {
  const baseUrl = getRuntimeConfigUrl();
  const response = await fetchWithTimeout(`${baseUrl}/runtime-config`, {
    cache: 'no-store',
    timeoutMs: 2000,
  });
  if (!response.ok) {
    throw new Error(`Runtime config sidecar returned ${response.status}.`);
  }
  const runtimeConfig: WebRuntimeConfig = await response.json();
  return runtimeConfig;
};

export const fetchWebRuntimeConfigFromSidecar = async (): Promise<WebRuntimeConfig> => {
  if (cachedRuntimeConfig !== null) {
    return cachedRuntimeConfig;
  }
  cachedRuntimeConfig = fetchWebRuntimeConfigFromSidecarUncached();
  return cachedRuntimeConfig;
};
