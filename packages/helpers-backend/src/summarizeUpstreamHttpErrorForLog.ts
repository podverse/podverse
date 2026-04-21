/**
 * Builds a log-safe summary for outbound HTTP failures (Axios-compatible errors).
 *
 * Never reads response bodies or request configs that may contain secrets (headers / auth payloads).
 */

function firstHeader(headers: Record<string, unknown>, nameLower: string): string | undefined {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === nameLower) {
      const v = headers[key];
      if (typeof v === 'string' && v.trim() !== '') {
        return v;
      }
      if (Array.isArray(v) && typeof v[0] === 'string') {
        return v[0];
      }
    }
  }
  return undefined;
}

/** Supports plain objects and Axios-style headers with `.get()`. */
function readIncomingHeader(headers: unknown, canonicalName: string): string | undefined {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }
  const lower = canonicalName.toLowerCase();
  const withGetter = headers as { get?: (key: string) => unknown };
  if (typeof withGetter.get === 'function') {
    const direct =
      withGetter.get(canonicalName) ?? withGetter.get(lower) ?? withGetter.get(lower.toUpperCase());
    if (typeof direct === 'string' && direct.trim() !== '') {
      return direct;
    }
  }
  return firstHeader(headers as Record<string, unknown>, lower);
}

function pickCorrelationId(headers: unknown): string | undefined {
  const ids = ['x-request-id', 'x-correlation-id', 'correlation-id', 'request-id'] as const;
  for (const id of ids) {
    const v = readIncomingHeader(headers, id);
    if (v !== undefined) {
      return v;
    }
  }
  return undefined;
}

function summarizeUrl(urlStr: string): Record<string, unknown> {
  try {
    const u = new URL(urlStr);
    const endpointClass = `${u.host}${u.pathname}`;
    return {
      endpointHost: u.host,
      endpointPath: u.pathname,
      endpointClass,
    };
  } catch {
    const sansQuery = urlStr.split('?')[0] ?? urlStr;
    return {
      endpointClass: sansQuery.slice(0, 200),
    };
  }
}

export type SummarizeUpstreamHttpErrorContext = {
  /** Full request URL — used only to derive host/pathname (query string is ignored). */
  requestUrl?: string;
};

/**
 * Summary suitable for JSON.stringify into log lines — no upstream response bodies or credentials.
 */
export function summarizeUpstreamHttpErrorForLog(
  error: unknown,
  context?: SummarizeUpstreamHttpErrorContext
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  const err = error as {
    message?: unknown;
    code?: unknown;
    response?: {
      status?: unknown;
      headers?: unknown;
    };
    config?: {
      url?: unknown;
      method?: unknown;
    };
  };

  if (typeof err.message === 'string') {
    summary.message = err.message;
  }

  if (typeof err.code === 'string') {
    summary.code = err.code;
  }

  const httpStatus = err.response?.status;
  if (typeof httpStatus === 'number') {
    summary.httpStatus = httpStatus;
  }

  const cid = pickCorrelationId(err.response?.headers);
  if (cid !== undefined) {
    summary.correlationId = cid;
  }

  const rawUrl =
    typeof context?.requestUrl === 'string'
      ? context.requestUrl
      : typeof err.config?.url === 'string'
        ? err.config.url
        : undefined;

  if (rawUrl !== undefined) {
    Object.assign(summary, summarizeUrl(rawUrl));
  }

  const method = err.config?.method;
  if (typeof method === 'string') {
    summary.method = method.toUpperCase();
  }

  return summary;
}
