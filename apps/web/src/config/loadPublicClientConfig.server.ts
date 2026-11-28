import { cache } from 'react';

import type { PublicClientConfig } from '@podverse/helpers';
import { PUBLIC_CLIENT_CONFIG_TIMEOUT_MS } from '@podverse/helpers';

import { getSSRApiRequestService } from '../factories/apiRequestService';
import { getConfig } from './index';
import type { ResolvedWebConfig } from './publicClientConfig';
import { applyPublicClientConfig } from './publicClientConfig';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPublicClientConfig(value: unknown): value is PublicClientConfig {
  if (!isRecord(value)) {
    return false;
  }
  return isRecord(value.membership) && isRecord(value.playlistLimits) && isRecord(value.instance);
}

const loadPublicClientConfig = cache(async (): Promise<PublicClientConfig | null> => {
  try {
    const response = await getSSRApiRequestService().reqPublicClientConfigGet({
      controller: new AbortController(),
      timeoutMs: PUBLIC_CLIENT_CONFIG_TIMEOUT_MS,
    });
    if (!isPublicClientConfig(response.data)) {
      return null;
    }
    return response.data;
  } catch {
    return null;
  }
});

export async function getConfigResolved(): Promise<ResolvedWebConfig> {
  const remote = await loadPublicClientConfig();
  return applyPublicClientConfig(getConfig(), remote);
}
