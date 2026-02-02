import type { AxiosRequestConfig } from '@podverse/helpers-requests';
import { request } from '@podverse/helpers-requests';
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
