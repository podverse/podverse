import type { AxiosRequestConfig } from '@podverse/helpers-requests';
import type { OutboundRequestConfig } from '@podverse/helpers-requests/outbound-requests';
import {
  requestWithHeadersWithUserAgentForOutbound,
  requestWithUserAgentForOutbound,
} from '@podverse/helpers-requests/outbound-requests';

import { config } from '../config/index.js';

export const _request = async <T>(
  url: string,
  requestConfig?: AxiosRequestConfig & OutboundRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  return requestWithUserAgentForOutbound<T>(url, requestConfig, config.userAgent, abort);
};

export const _requestWithHeaders = async <T>(
  url: string,
  requestConfig?: AxiosRequestConfig & OutboundRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: Record<string, unknown> }> => {
  return requestWithHeadersWithUserAgentForOutbound<T>(url, requestConfig, config.userAgent, abort);
};
