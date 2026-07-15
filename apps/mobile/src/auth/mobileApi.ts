import { ApiRequestService } from '@podverse/helpers-requests';

import { getMobileConfig } from '../config';

/**
 * Builds an ApiRequestService from getMobileConfig().api.
 * ApiRequestService composes base as `${prefix.replace(/\/$/, '')}${version}` —
 * prefix must have no trailing slash and version a leading slash (`/api` + `/v2`).
 */
export const createMobileApiRequestService = (
  accessToken?: string | null
): ApiRequestService | null => {
  const { api } = getMobileConfig();
  if (api === null) {
    return null;
  }

  return new ApiRequestService({
    host: api.host,
    ...(api.port ? { port: api.port } : {}),
    prefix: api.prefix,
    protocol: api.protocol,
    version: api.version,
    ...(accessToken
      ? {
          authContext: {
            mode: 'bearer',
            token: accessToken,
          } as const,
        }
      : {}),
  });
};
