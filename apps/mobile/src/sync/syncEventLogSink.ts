import type { SyncEventLogAppend } from '../data/repositories';
import { syncEventLogRepository } from '../data/repositories';
import type { SyncJobFailure } from './syncQueue';
import { syncQueue } from './syncQueue';

/**
 * Persists what the sync indicator deliberately stays silent about.
 *
 * The queue exposes failures as a listener seam precisely so this can exist without the queue
 * knowing about storage: a failure still skips its job and lets the run continue, and appending an
 * entry changes nothing about that.
 */

export const toSyncEventLogAppend = (failure: SyncJobFailure): SyncEventLogAppend => {
  return {
    errorCode: failure.errorCode,
    jobKind: failure.kind,
    // The message falls back to the code when the failure carried no text of its own, and a row
    // that says the same thing twice reads as though it has more detail than it does.
    message: failure.message === failure.errorCode ? null : failure.message,
    occurredAt: failure.occurredAtMs,
    // Offline is a state, not a fault. Recording it as a failure tells a user on a train that they
    // did something wrong, when what happened is that the queue parked and will pick this back up.
    outcome: failure.isOffline ? 'skipped' : 'failure',
  };
};

/** Subscribe the store to the queue. Returns the detach function for the caller's cleanup. */
export const attachSyncEventLogSink = (): (() => void) => {
  return syncQueue.subscribeToFailures((failure) => {
    void syncEventLogRepository.append(toSyncEventLogAppend(failure));
  });
};
