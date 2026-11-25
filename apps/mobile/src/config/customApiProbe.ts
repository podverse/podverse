import { request } from '@podverse/http-request-core';

import {
  customApiHealthUrl,
  isUnknownRecord,
  judgeCustomApiHealthResponse,
  normalizeCustomApiBaseUrl,
  readWebOriginFromHealthBody,
} from './customApiUrl';

/** Long enough for a cold TLS handshake, short enough that Save does not look stuck. */
const CUSTOM_API_PROBE_TIMEOUT_MS = 8000;

export type CustomApiProbeFailure =
  | { kind: 'invalid_url' }
  | { kind: 'unreachable' }
  | { kind: 'unexpected_status'; status: number }
  | { kind: 'unexpected_body' };

export type CustomApiProbeResult =
  | { ok: true; baseUrl: string; webOrigin: string | null }
  | { ok: false; failure: CustomApiProbeFailure };

const readHttpStatus = (error: unknown): number | null => {
  if (!isUnknownRecord(error)) {
    return null;
  }

  const response = error.response;
  if (!isUnknownRecord(response)) {
    return null;
  }

  return typeof response.status === 'number' ? response.status : null;
};

/**
 * Unauthenticated GET of `{base}/health`. No cookies and no bearer token: the check must not
 * carry a session to a server the user has not committed to yet. Redirects are not success.
 */
export const probeCustomApiBaseUrl = async (raw: string): Promise<CustomApiProbeResult> => {
  const baseUrl = normalizeCustomApiBaseUrl(raw);
  if (baseUrl === null) {
    return { ok: false, failure: { kind: 'invalid_url' } };
  }

  const controller = new AbortController();

  try {
    const { data, status } = await request<unknown>(
      customApiHealthUrl(baseUrl),
      {
        headers: { Accept: 'application/json' },
        maxRedirects: 0,
        method: 'GET',
        validateStatus: () => true,
        withCredentials: false,
      },
      { controller, timeoutMs: CUSTOM_API_PROBE_TIMEOUT_MS }
    );
    const verdict = judgeCustomApiHealthResponse(status, data);
    if (verdict.kind === 'ok') {
      return { ok: true, baseUrl, webOrigin: readWebOriginFromHealthBody(data) };
    }
    return { ok: false, failure: verdict };
  } catch (error: unknown) {
    const status = readHttpStatus(error);
    if (status === null) {
      return { ok: false, failure: { kind: 'unreachable' } };
    }
    const verdict = judgeCustomApiHealthResponse(status, undefined);
    if (verdict.kind === 'ok') {
      return { ok: false, failure: { kind: 'unexpected_body' } };
    }
    return { ok: false, failure: verdict };
  }
};
