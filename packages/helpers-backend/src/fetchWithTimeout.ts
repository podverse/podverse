/**
 * Fetch request cache mode (standard Fetch API).
 * Defined here so it is available without DOM lib.
 */
import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

import { injectTraceContext, isObservabilityInitialized } from '@podverse/observability';

export type RequestCache =
  | 'default'
  | 'force-cache'
  | 'no-cache'
  | 'no-store'
  | 'reload'
  | 'only-if-cached';

export type FetchWithTimeoutOptions = {
  body?: string;
  cache?: RequestCache;
  headers?: Record<string, string>;
  method?: string;
  timeoutMs?: number;
};

const TRACER_NAME = 'podverse.helpers-backend.http';

const fetchWithInjectedHeaders = async (
  url: string,
  options: FetchWithTimeoutOptions | undefined
): Promise<Response> => {
  const { body, cache, headers: inputHeaders, method = 'GET', timeoutMs } = options ?? {};
  const headers: Record<string, string> = { ...inputHeaders };
  injectTraceContext(headers);

  const controller = new AbortController();
  const timeoutId =
    timeoutMs !== undefined && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  try {
    const response = await fetch(url, {
      body,
      cache,
      headers,
      method,
      signal: controller.signal,
    });
    return response;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Fetches a URL with an optional timeout. Uses native fetch (Node 18+).
 * If timeoutMs is set, the request is aborted after that many milliseconds.
 * Injects W3C trace context when observability is initialized.
 */
export async function fetchWithTimeout(
  url: string,
  options?: FetchWithTimeoutOptions
): Promise<Response> {
  if (!isObservabilityInitialized()) {
    return fetchWithInjectedHeaders(url, options);
  }

  const method = options?.method ?? 'GET';
  let host = 'unknown';
  try {
    host = new URL(url).host;
  } catch {
    // Relative URLs are uncommon here; span name still identifies the call.
  }

  const tracer = trace.getTracer(TRACER_NAME);
  return tracer.startActiveSpan(`${method} ${host}`, { kind: SpanKind.CLIENT }, async (span) => {
    span.setAttribute('http.method', method);
    span.setAttribute('http.url', url);
    try {
      const response = await fetchWithInjectedHeaders(url, options);
      span.setAttribute('http.response.status_code', response.status);
      if (response.status >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      return response;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}
