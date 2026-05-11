import type { AuthContext } from '@podverse/http-request-core';
import type { AxiosRequestConfig } from '@podverse/http-request-core';
import { request, toAuthHeaders } from '@podverse/http-request-core';

export type AbortOpts = { controller: AbortController; timeoutMs: number };

export type ApiClientBaseConfig = {
  protocol: string;
  host: string;
  port?: string | number;
  prefix?: string;
  version?: string;
};

export type RuntimeApiConfig = {
  public: {
    api: {
      prefix?: string;
      version?: string;
      ssr: { protocol: string; host: string; port?: string | number };
      client: { protocol: string; host: string; port?: string | number };
    };
  };
};

export interface ApiRequestParams {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  config?: AxiosRequestConfig;
  abort?: AbortOpts;
  userAgent?: string;
}

export class ManagementApiRequestService {
  private static defaultBase: ApiClientBaseConfig | undefined;

  private apiBase: string;
  private authContext?: AuthContext;

  static configureDefaultBase(base: ApiClientBaseConfig): void {
    this.defaultBase = base;
  }

  constructor(
    paramsOrJwt?: string | { base?: ApiClientBaseConfig; authContext?: AuthContext; jwt?: string }
  ) {
    const isLegacyJwt = typeof paramsOrJwt === 'string' || paramsOrJwt === undefined;
    const base =
      isLegacyJwt || paramsOrJwt?.base === undefined
        ? ManagementApiRequestService.defaultBase
        : paramsOrJwt.base;
    if (base === undefined) {
      throw new Error(
        'ManagementApiRequestService base URL is not configured. Call configureDefaultBase() or pass constructor params with base.'
      );
    }
    const authContext = isLegacyJwt ? undefined : paramsOrJwt?.authContext;
    const jwt = isLegacyJwt ? paramsOrJwt : paramsOrJwt?.jwt;

    const { protocol, host, port } = base;
    const portPart = port ? `:${port}` : '';
    this.apiBase = `${protocol}://${host}${portPart}${base.prefix?.replace(/\/$/, '') || ''}${base.version || ''}`;
    this.authContext =
      authContext ?? (jwt ? { mode: 'cookie', cookieName: 'pv_mgmt_auth', token: jwt } : undefined);
  }

  async apiRequest<T>({
    path,
    method = 'GET',
    data,
    config: requestConfig = {},
    abort,
    userAgent,
  }: ApiRequestParams): Promise<T> {
    const hasWindow =
      typeof globalThis !== 'undefined' &&
      'window' in globalThis &&
      (globalThis as { window?: unknown }).window !== undefined;
    const authHeaders = toAuthHeaders(this.authContext);
    const existingHeaders = (requestConfig.headers as Record<string, string> | undefined) ?? {};
    const mergedConfig = {
      ...requestConfig,
      ...(userAgent ? { userAgent } : {}),
      ...(hasWindow ? { withCredentials: true } : {}),
      headers: {
        ...existingHeaders,
        ...authHeaders,
      },
    };

    const options =
      method === 'GET' ? { method, ...mergedConfig } : { method, data, ...mergedConfig };

    const response = await request<T>(`${this.apiBase}${path}`, options, abort);
    return response.data;
  }
}

export const createManagementApiClientFromConfig = (params: {
  config: RuntimeApiConfig;
  useSSR?: boolean;
  authContext?: AuthContext;
  jwt?: string;
}): ManagementApiRequestService => {
  const { config, useSSR, authContext, jwt } = params;
  const hasWindow = (globalThis as { window?: unknown }).window !== undefined;
  const target =
    useSSR === undefined
      ? !hasWindow
        ? config.public.api.ssr
        : config.public.api.client
      : useSSR
        ? config.public.api.ssr
        : config.public.api.client;

  const base: ApiClientBaseConfig = {
    protocol: target.protocol,
    host: target.host,
    port: target.port,
    prefix: config.public.api.prefix,
    version: config.public.api.version,
  };

  ManagementApiRequestService.configureDefaultBase(base);

  return new ManagementApiRequestService({
    base: {
      ...base,
    },
    authContext,
    jwt,
  });
};
