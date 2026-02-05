import type { AxiosRequestConfig } from '@podverse/helpers-requests';
import { request, requestWithHeaders } from '@podverse/helpers-requests';
import { config } from '../config/index.js';

export const _request = async <T>(
  url: string,
  requestConfig?: AxiosRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  const headers = {
    ...requestConfig?.headers,
    'User-Agent': config.userAgent,
  };
  return request<T>(url, { ...requestConfig, headers }, abort);
};

export const _requestWithHeaders = async <T>(
  url: string,
  requestConfig?: AxiosRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: Record<string, unknown> }> => {
  const headers = {
    ...requestConfig?.headers,
    'User-Agent': config.userAgent,
  };
  return requestWithHeaders<T>(url, { ...requestConfig, headers }, abort);
};
