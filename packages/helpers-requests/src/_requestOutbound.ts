import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import { DEFAULT_HTTP_TIMEOUT_MS, resolveParserMaxFeedBodyBytes } from '@podverse/helpers';
import { injectTraceContext } from '@podverse/observability';

import type { RequestConfig } from './_request.js';
import {
  validateOutboundFetchUrl,
  validateOutboundRedirectLocation,
} from './outboundHttpPolicy.js';

/** Max response body size for outbound (RSS/chapters) fetches — guards memory use on hostile endpoints. */
export const DEFAULT_OUTBOUND_MAX_RESPONSE_BYTES = resolveParserMaxFeedBodyBytes(undefined);

export type OutboundRequestConfig = RequestConfig & {
  maxResponseBytes?: number;
};

const requestOutboundInternal = async <T>(
  url: string,
  requestConfig?: OutboundRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<AxiosResponse<T>> => {
  await validateOutboundFetchUrl(url);
  const resolvedMaxResponseBytes = resolveParserMaxFeedBodyBytes(
    process.env.PARSER_MAX_FEED_BODY_BYTES
  );

  const controller = abort?.controller ?? new AbortController();
  const timeoutMs = abort?.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const {
      userAgent,
      maxResponseBytes,
      beforeRedirect: userBeforeRedirect,
      signal: _ignoreUserSignal,
      ...rest
    } = requestConfig ?? {};
    const method = rest.method || 'GET';
    const isJSONRequest = method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT';

    const traceHeaders: Record<string, string> = {};
    injectTraceContext(traceHeaders);

    const axiosConfig: AxiosRequestConfig = {
      url,
      method,
      ...rest,
      headers: {
        ...traceHeaders,
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
        ...(isJSONRequest ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
      maxContentLength: maxResponseBytes ?? resolvedMaxResponseBytes,
      maxBodyLength: maxResponseBytes ?? resolvedMaxResponseBytes,
      beforeRedirect: (redirectOptions, responseDetails, requestDetails) => {
        validateOutboundRedirectLocation(redirectOptions);
        if (typeof userBeforeRedirect === 'function') {
          userBeforeRedirect(redirectOptions, responseDetails, requestDetails);
        }
      },
      signal: controller.signal,
    };

    return await axios.request<T>(axiosConfig);
  } finally {
    clearTimeout(timeoutId);
  }
};

/** Outbound-only: SSRF policy, redirect re-validation, response size limit, default timeout when abort is omitted. */
export const requestForOutbound = async <T>(
  url: string,
  requestConfig?: OutboundRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  const response = await requestOutboundInternal<T>(url, requestConfig, abort);
  return { status: response.status, data: response.data };
};

export const requestWithHeadersForOutbound = async <T>(
  url: string,
  requestConfig?: OutboundRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: AxiosResponse<T>['headers'] }> => {
  const response = await requestOutboundInternal<T>(url, requestConfig, abort);
  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  };
};

/** Same as requestWithUserAgent with outbound guardrails (parser/worker RSS and chapter fetches). */
export const requestWithUserAgentForOutbound = async <T>(
  url: string,
  requestConfig: OutboundRequestConfig | undefined,
  userAgent: string,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  return requestForOutbound<T>(url, { ...requestConfig, userAgent }, abort);
};

/** Same as requestWithHeadersWithUserAgent with outbound guardrails. */
export const requestWithHeadersWithUserAgentForOutbound = async <T>(
  url: string,
  requestConfig: OutboundRequestConfig | undefined,
  userAgent: string,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: AxiosResponse<T>['headers'] }> => {
  return requestWithHeadersForOutbound<T>(url, { ...requestConfig, userAgent }, abort);
};
