import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

export type { AxiosRequestConfig, AxiosResponse } from 'axios';

export type RequestConfig = AxiosRequestConfig & { userAgent?: string };

export type AbortOptions = {
  controller: AbortController;
  timeoutMs: number;
};

export type RequestClientOptions = {
  jsonMethods?: ReadonlyArray<'POST' | 'PUT' | 'PATCH'>;
};

type RequestResult<T> = {
  status: number;
  data: T;
};

type RequestResultWithHeaders<T> = {
  status: number;
  data: T;
  headers: AxiosResponse<T>['headers'];
};

const requestInternal = async <T>(
  url: string,
  requestConfig?: RequestConfig,
  abort?: AbortOptions,
  options?: RequestClientOptions
): Promise<AxiosResponse<T>> => {
  let timeoutId: NodeJS.Timeout | undefined;
  if (abort) {
    timeoutId = setTimeout(() => {
      abort.controller.abort();
    }, abort.timeoutMs);
  }

  try {
    const { userAgent, ...rest } = requestConfig ?? {};
    const method = rest.method ?? 'GET';
    const normalizedMethod = method.toString().toUpperCase();
    const jsonMethods = options?.jsonMethods ?? ['POST', 'PUT', 'PATCH'];
    const isJSONRequest = jsonMethods.includes(normalizedMethod as 'POST' | 'PUT' | 'PATCH');

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
  abort?: AbortOptions,
  options?: RequestClientOptions
): Promise<RequestResult<T>> => {
  const response = await requestInternal<T>(url, requestConfig, abort, options);
  return { status: response.status, data: response.data };
};

export const requestWithHeaders = async <T>(
  url: string,
  requestConfig?: RequestConfig,
  abort?: AbortOptions,
  options?: RequestClientOptions
): Promise<RequestResultWithHeaders<T>> => {
  const response = await requestInternal<T>(url, requestConfig, abort, options);
  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  };
};

export const createRequestClient = (options?: RequestClientOptions) => {
  return {
    request: <T>(url: string, requestConfig?: RequestConfig, abort?: AbortOptions) =>
      request<T>(url, requestConfig, abort, options),
    requestWithHeaders: <T>(url: string, requestConfig?: RequestConfig, abort?: AbortOptions) =>
      requestWithHeaders<T>(url, requestConfig, abort, options),
  };
};

interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

export const throwRequestError = (error: unknown): never => {
  if (error instanceof Error) {
    const errorWithStatusCode = error as ErrorWithStatusCode;
    if (errorWithStatusCode.statusCode) {
      throw new Error(`HTTP Error: ${errorWithStatusCode.statusCode} - ${error.message}`);
    }

    throw new Error(`Unknown Error: ${error.message}`);
  }

  throw new Error('An unexpected error occurred');
};
