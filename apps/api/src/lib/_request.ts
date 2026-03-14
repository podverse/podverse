import type { AxiosRequestConfig } from '@podverse/helpers-requests';
import { requestWithUserAgent } from '@podverse/helpers-requests';

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
