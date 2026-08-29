import {
  getErrorCode,
  getErrorMessage,
  getErrorResponseBodyCode,
  getErrorResponseStatus,
} from '@podverse/helpers/error';

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

const looksLikeNetworkMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('network error') ||
    normalized.includes('network request failed') ||
    normalized.includes('timeout')
  );
};

/**
 * Sort a thrown value into a stable code plus whether it means "no network".
 *
 * HTTP statuses classify as reached-the-server even at 5xx: the server answered, so continuing the
 * run is reasonable. Only a request that produced no response at all pauses the queue.
 */
export const classifySyncError = (error: unknown): SyncErrorClassification => {
  if (error instanceof SyncJobTimeoutError) {
    return { code: 'sync_job_timeout', isOffline: false };
  }

  const status = getErrorResponseStatus(error);
  if (status !== undefined) {
    // The status says which layer refused and the body code says why it refused, so an API that
    // names its own failure keeps both: `http_403` alone leaves support asking which 403 this was.
    const bodyCode = getErrorResponseBodyCode(error);
    const code = bodyCode === undefined ? `http_${status}` : `http_${status}:${bodyCode}`;
    return { code, isOffline: false };
  }

  const errorCode = getErrorCode(error);
  if (errorCode !== undefined && OFFLINE_ERROR_CODES.has(errorCode)) {
    return { code: errorCode.toLowerCase(), isOffline: true };
  }

  const message = getErrorMessage(error, '');
  if (looksLikeNetworkMessage(message)) {
    return { code: 'network_unreachable', isOffline: true };
  }

  if (errorCode !== undefined) {
    return { code: errorCode.toLowerCase(), isOffline: false };
  }

  return { code: 'unknown', isOffline: false };
};
