import { request } from '@podverse/http-request-core';

import { getMobileConfig } from '../config';

/**
 * Unauthenticated reachability check against the API's health endpoint.
 *
 * Deliberately not routed through `authRequestWithRefresh`: a probe must run with auth in any
 * state, and a reachability question must never be the thing that spends a refresh token.
 */

/**
 * Bound on how long a probe may take.
 *
 * A probe that outlives its own backoff step tells you nothing you can act on, and this runs while
 * the network is already known to be unhappy, so it has to fail fast rather than sit on a socket.
 * Five seconds leaves room for a slow cellular handshake and stays far inside the sync queue's
 * per-job budget.
 */
export const CONNECTIVITY_PROBE_TIMEOUT_MS = 5000;

/**
 * True when the API answered. Reaching the server is the question, so a 4xx counts — only a
 * transport failure or a server that cannot serve its own health endpoint is a negative.
 *
 * Returns false when the app is running without API config (UI-only builds): there is no server to
 * be reachable, and claiming otherwise would let callers exit an offline state they cannot leave.
 */
export const probeServerReachable = async (): Promise<boolean> => {
  const { api } = getMobileConfig();
  if (api === null) {
    return false;
  }

  const controller = new AbortController();

  try {
    const { status } = await request<unknown>(
      `${api.baseUrl}/health`,
      {
        method: 'GET',
        // Any answer is evidence; let the status decide rather than an axios throw.
        validateStatus: () => true,
      },
      { controller, timeoutMs: CONNECTIVITY_PROBE_TIMEOUT_MS }
    );
    return status < 500;
  } catch {
    return false;
  }
};
