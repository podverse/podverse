import type { ManagementApiRequestService as PackageManagementApiRequestService } from '@podverse/management-api-requests';
import { createManagementApiClientFromConfig } from '@podverse/management-api-requests';

import { getConfig } from '../../config';

export type AbortOpts = { controller: AbortController; timeoutMs: number };

export interface ApiRequestParams {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  config?: Record<string, unknown>;
  abort?: AbortOpts;
  userAgent?: string;
}

export class ManagementApiRequestService {
  private client: PackageManagementApiRequestService;

  constructor(jwt?: string) {
    const config = getConfig();

    this.client = createManagementApiClientFromConfig({
      config,
      jwt,
    });
  }

  async apiRequest<T>({
    path,
    method = 'GET',
    data,
    config: requestConfig = {},
    abort,
    userAgent,
  }: ApiRequestParams): Promise<T> {
    return this.client.apiRequest<T>({
      path,
      method,
      data,
      config: requestConfig,
      abort,
      userAgent,
    });
  }
}
