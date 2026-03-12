import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

export type { AxiosRequestConfig } from 'axios';

/** Config may include userAgent; when set it is sent as the User-Agent header (not passed through to axios). */
export type RequestConfig = AxiosRequestConfig & { userAgent?: string };

const requestInternal = async <T>(
  url: string,
  requestConfig?: RequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<AxiosResponse<T>> => {
  let timeoutId: NodeJS.Timeout | undefined;
  if (abort) {
    timeoutId = setTimeout(() => {
      abort.controller.abort();
    }, abort.timeoutMs);
  }

  try {
    const { userAgent, ...rest } = requestConfig ?? {};
    const method = rest.method || 'GET';
    const isJSONRequest = method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT';

    const axiosConfig: AxiosRequestConfig = {
      url,
      method,
      ...rest,
      headers: {
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
        ...(isJSONRequest ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
      ...(abort?.controller?.signal ? { signal: abort.controller.signal } : {}),
    };

    return await axios.request<T>(axiosConfig);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const request = async <T>(
  url: string,
  requestConfig?: RequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  const response = await requestInternal<T>(url, requestConfig, abort);
  return { status: response.status, data: response.data };
};

export const requestWithHeaders = async <T>(
  url: string,
  requestConfig?: RequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: AxiosResponse<T>['headers'] }> => {
  const response = await requestInternal<T>(url, requestConfig, abort);
  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  };
};

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
  if (error instanceof Error) {
    const errorWithStatusCode = error as ErrorWithStatusCode;
    if (errorWithStatusCode.statusCode) {
      throw new Error(`HTTP Error: ${errorWithStatusCode.statusCode} - ${error.message}`);
    } else {
      throw new Error(`Unknown Error: ${error.message}`);
    }
  } else {
    throw new Error('An unexpected error occurred');
  }
};
