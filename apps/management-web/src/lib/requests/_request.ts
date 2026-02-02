import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';

export type { AxiosRequestConfig } from 'axios';

export const request = async <T>(
  url: string,
  requestConfig?: AxiosRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  let timeoutId: NodeJS.Timeout | undefined;
  if (abort) {
    timeoutId = setTimeout(() => {
      abort.controller.abort();
    }, abort.timeoutMs);
  }

  try {
    const isJSONRequest =
      requestConfig?.method?.toUpperCase() === 'POST' ||
      requestConfig?.method?.toUpperCase() === 'PUT' ||
      requestConfig?.method?.toUpperCase() === 'PATCH';

    const config: AxiosRequestConfig = {
      url,
      method: requestConfig?.method || 'GET',
      withCredentials: true,
      ...(requestConfig?.baseURL ? { baseURL: requestConfig.baseURL } : {}),
      ...(requestConfig?.params ? { params: requestConfig.params } : {}),
      ...(requestConfig?.data ? { data: requestConfig.data } : {}),
      ...(requestConfig?.timeout ? { timeout: requestConfig.timeout } : {}),
      ...(requestConfig?.responseType ? { responseType: requestConfig.responseType } : {}),
      ...(abort?.controller?.signal ? { signal: abort.controller.signal } : {}),
    };

    if (isJSONRequest) {
      config.headers = {
        'Content-Type': 'application/json',
        ...(requestConfig?.headers ? requestConfig.headers : {}),
      };
    } else if (requestConfig?.headers) {
      config.headers = requestConfig.headers;
    }

    const response = await axios.request<T>(config);
    return { status: response.status, data: response.data };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
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
