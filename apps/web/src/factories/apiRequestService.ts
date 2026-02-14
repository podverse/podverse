import { ApiRequestService } from '@podverse/helpers-requests';
import { getConfig } from '../config';

let apiRequestServiceInstance: ApiRequestService | null = null;

export function getSSRApiRequestService(jwt?: string | null): ApiRequestService {
  const config = getConfig();
  return new ApiRequestService({
    protocol: config.public.api.ssr.protocol || '',
    host: config.public.api.ssr.host || '',
    port: config.public.api.ssr.port || '',
    prefix: config.public.api.prefix || '',
    version: config.public.api.version || '',
    ...(jwt ? { jwt } : {}),
  });
}

export const getApiRequestService = (): ApiRequestService => {
  if (!apiRequestServiceInstance) {
    const config = getConfig();
    apiRequestServiceInstance = new ApiRequestService({
      protocol: config.public.api.client.protocol || '',
      host: config.public.api.client.host || '',
      port: config.public.api.client.port || '',
      prefix: config.public.api.prefix || '',
      version: config.public.api.version || '',
    });
  }

  return apiRequestServiceInstance;
};
