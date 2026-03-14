import type { AxiosRequestConfig } from '@podverse/helpers-requests';
import { requestWithHeadersWithUserAgent, requestWithUserAgent } from '@podverse/helpers-requests';

import { config } from '../config/index.js';

export const _request = async <T>(
  url: string,
  requestConfig?: AxiosRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  return requestWithUserAgent<T>(url, requestConfig, config.userAgent, abort);
};

export const _requestWithHeaders = async <T>(
  url: string,
  requestConfig?: AxiosRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: Record<string, unknown> }> => {
  return requestWithHeadersWithUserAgent<T>(url, requestConfig, config.userAgent, abort);
};
