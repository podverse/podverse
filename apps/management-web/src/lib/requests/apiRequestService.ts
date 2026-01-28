import { request } from './_request';
import { config } from '../../config';

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
  private apiBase: string;
  private jwt?: string;

  constructor(jwt?: string) {
    const { protocol, host, port } = config.public.api.client;
    const { prefix, version } = config.public.api;
    const portPart = port ? `:${port}` : '';
    this.apiBase = `${protocol}://${host}${portPart}${prefix?.replace(/\/$/, '') || ''}${version || ''}`;
    if (jwt !== undefined) {
      this.jwt = jwt;
    }
  }

  async apiRequest<T>({
    path,
    method = 'GET',
    data,
    config: requestConfig = {},
    abort,
    userAgent,
  }: ApiRequestParams): Promise<T> {
    const mergedConfig = {
      ...requestConfig,
      ...(userAgent ? { userAgent } : {}),
      ...(this.jwt
        ? {
            headers: {
              ...(requestConfig.headers || {}),
              Cookie: `pv_mgmt_auth=${this.jwt}`,
            },
          }
        : {}),
    };

    const options =
      method === 'GET' ? { method, ...mergedConfig } : { method, data, ...mergedConfig };

    const response = await request<T>(`${this.apiBase}${path}`, options, abort);
    return response.data;
  }
}
