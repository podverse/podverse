import {
  getErrorCode,
  getErrorMessage,
  getErrorResponseBodyCode,
  getErrorResponseStatus,
} from '@podverse/helpers/error';

import { OfflineModeEnabledError } from '../prefs/offlineMode';

/**
 * Machine-readable outcome of a failed sync job.
 *
 * `code` is what gets written to the sync event log and what a user can read back to support. The
 * message they see is translated, so the code is the only stable part of a failure report.
 */
export type SyncErrorClassification = {
  code: string;
  /**
   * The request never reached the server. The queue pauses on this rather than working through the
   * rest of the run, and the log ignores it: being offline is a state, not a fault to report.
   */
  isOffline: boolean;
  /**
   * The request reached something, and that something said the app behind it is not serving.
   *
   * Kept separate from `isOffline` because the two callers want different answers from the same
   * error: the queue asks whether to park the rest of the run, and the connectivity machine asks
   * whether to blame the device or the server. Collapsing them would force one of the two to guess.
   */
  isServerUnreachable: boolean;
};

/** Thrown by the queue when a job outlives its budget, so the head of a serial queue cannot wedge. */
export class SyncJobTimeoutError extends Error {
  constructor(kind: string, timeoutMs: number) {
    super(`Sync job "${kind}" exceeded its ${timeoutMs}ms budget`);
    this.name = 'SyncJobTimeoutError';
  }
}

/** Axios reports a request that never got a response with one of these. */
const OFFLINE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'ERR_NETWORK',
  'ETIMEDOUT',
]);

/**
 * Gateway statuses. A load balancer answering on behalf of an app that is down proves the network
 * works and proves the app does not, which is a different fact from either a plain 5xx or silence.
 *
 * Kept out of `OFFLINE_ERROR_CODES` on purpose: that set holds axios transport codes, and these are
 * HTTP answers.
 */
const SERVER_UNREACHABLE_STATUSES = new Set([502, 503, 504]);

const looksLikeNetworkMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('network error') ||
    normalized.includes('network request failed') ||
    normalized.includes('timeout')
  );
};

/**
 * Sort a thrown value into a stable code plus what it says about the network.
 *
 * A request that produced no response at all is `isOffline`. A gateway status is
 * `isServerUnreachable`. Every other HTTP status counts as the server having answered, which is
 * evidence the network works no matter how unhappy the answer was — a 403 and a 500 both prove
 * there is a server on the other end.
 */
export const classifySyncError = (error: unknown): SyncErrorClassification => {
  if (error instanceof SyncJobTimeoutError) {
    return { code: 'sync_job_timeout', isOffline: false, isServerUnreachable: false };
  }

  if (error instanceof OfflineModeEnabledError) {
    return { code: 'offline_mode', isOffline: true, isServerUnreachable: false };
  }

  const status = getErrorResponseStatus(error);
  if (status !== undefined) {
    // The status says which layer refused and the body code says why it refused, so an API that
    // names its own failure keeps both: `http_403` alone leaves support asking which 403 this was.
    const bodyCode = getErrorResponseBodyCode(error);
    const code = bodyCode === undefined ? `http_${status}` : `http_${status}:${bodyCode}`;
    return {
      code,
      isOffline: false,
      isServerUnreachable: SERVER_UNREACHABLE_STATUSES.has(status),
    };
  }

  const errorCode = getErrorCode(error);
  if (errorCode === 'ERR_OFFLINE_MODE') {
    return { code: 'offline_mode', isOffline: true, isServerUnreachable: false };
  }

  if (errorCode !== undefined && OFFLINE_ERROR_CODES.has(errorCode)) {
    return { code: errorCode.toLowerCase(), isOffline: true, isServerUnreachable: false };
  }

  const message = getErrorMessage(error, '');
  if (looksLikeNetworkMessage(message)) {
    return { code: 'network_unreachable', isOffline: true, isServerUnreachable: false };
  }

  if (errorCode !== undefined) {
    return { code: errorCode.toLowerCase(), isOffline: false, isServerUnreachable: false };
  }

  return { code: 'unknown', isOffline: false, isServerUnreachable: false };
};
