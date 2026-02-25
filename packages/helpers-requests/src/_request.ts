import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

export type { AxiosRequestConfig } from 'axios';

const requestInternal = async <T>(
  url: string,
  requestConfig?: AxiosRequestConfig,
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
    const method = requestConfig?.method || 'GET';
    const isJSONRequest = method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT';

    const axiosConfig: AxiosRequestConfig = {
      url,
      method,
      ...requestConfig,
      headers: {
        ...(isJSONRequest ? { 'Content-Type': 'application/json' } : {}),
        ...requestConfig?.headers,
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
  requestConfig?: AxiosRequestConfig,
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
  requestConfig?: AxiosRequestConfig,
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
