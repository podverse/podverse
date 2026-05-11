import type { AxiosResponse, RequestConfig } from '@podverse/http-request-core';
import {
  request as coreRequest,
  requestWithHeaders as coreRequestWithHeaders,
  throwRequestError as coreThrowRequestError,
} from '@podverse/http-request-core';

export type { AxiosRequestConfig } from '@podverse/http-request-core';
export type { RequestConfig } from '@podverse/http-request-core';

export const request = coreRequest;

export const requestWithHeaders = coreRequestWithHeaders;

/** Same as request but requires userAgent (for backend requests to 3rd-party domains that must send User-Agent). */
export const requestWithUserAgent = async <T>(
  url: string,
  requestConfig: RequestConfig | undefined,
  userAgent: string,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  return request<T>(url, { ...requestConfig, userAgent }, abort);
};

/** Same as requestWithHeaders but requires userAgent (for backend requests to 3rd-party domains that must send User-Agent). */
export const requestWithHeadersWithUserAgent = async <T>(
  url: string,
  requestConfig: RequestConfig | undefined,
  userAgent: string,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: AxiosResponse<T>['headers'] }> => {
  return requestWithHeaders<T>(url, { ...requestConfig, userAgent }, abort);
};

interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

export const throwRequestError = (error: unknown): never => {
  return coreThrowRequestError(error as ErrorWithStatusCode | unknown);
};
