import { getErrorMessage } from '@podverse/helpers/error';

import { classifySyncError, SyncJobTimeoutError } from './syncErrorClassification';
import type { SyncJobKind } from './syncJobKinds';

/**
 * The serial background sync runner.
 *
 * One job runs at a time so reconciliation can never saturate the network or the JS thread and make
 * the app feel slow. Nothing a user is waiting on belongs here — tapping Subscribe, opening a
 * screen, search, and playback all run immediately and unqueued.
 *
 * This module is deliberately free of React Native and Expo imports so the semantics that are easy
 * to get wrong (serialization, dedupe, growing totals, failure isolation) are unit-testable in node.
 * Triggers and job definitions live alongside it and may import anything.
 */

/** `user` work jumps ahead of opportunistic passes; within a level the queue is FIFO. */
export type SyncJobPriority = 'background' | 'user';

export type SyncJobContext = {
  /**
   * Aborted when the job exceeds its budget. Jobs that make requests should pass this through so a
   * timeout closes the socket instead of leaving it running unattended.
   */
  abortController: AbortController;
  /**
   * Queue follow-up work discovered while running. This is what makes the run total grow: a
   * subscriptions page finds there are five more pages and says so.
   */
  enqueue: (job: SyncJob | SyncJob[]) => void;
  timeoutMs: number;
};

export type SyncJob = {
  /** Collapses an equivalent job that is still waiting, instead of queueing a second copy. */
  dedupeKey: string;
  kind: SyncJobKind;
  labelKey: string;
  priority?: SyncJobPriority;
  run: (context: SyncJobContext) => Promise<void>;
  timeoutMs?: number;
};

export type SyncQueueStatus = 'idle' | 'paused' | 'running';

export type SyncQueueState = {
  activeKind: SyncJobKind | null;
  activeLabelKey: string | null;
  /** Jobs settled in the current run. Resets to zero when the queue drains. */
  completedCount: number;
  pendingCount: number;
  status: SyncQueueStatus;
  /**
   * Jobs accepted into the current run. This may grow while the run is in progress, because a job
   * can discover more work. A denominator that only ever increases is honest; a fixed one invented
   * up front is not.
   */
  totalCount: number;
};

export type SyncJobFailure = {
  /** Stable and untranslated, so it survives being read aloud to support. */
  errorCode: string;
  isOffline: boolean;
  kind: SyncJobKind;
  labelKey: string;
  message: string;
  occurredAtMs: number;
};

export type SyncQueue = {
  enqueue: (job: SyncJob | SyncJob[]) => void;
  getState: () => SyncQueueState;
  /**
   * Report reachability from the platform. Going offline parks the run where it is; coming back
   * resumes it, which is what makes connectivity restore a trigger rather than a special case.
   */
  setNetworkReachable: (isReachable: boolean) => void;
  subscribe: (listener: (state: SyncQueueState) => void) => () => void;
  /** Seam for a durable failure sink, so the log can attach without the queue knowing about it. */
  subscribeToFailures: (listener: (failure: SyncJobFailure) => void) => () => void;
  /** Drop pending work and return to idle. For sign-out and for test isolation. */
  reset: () => void;
};

/**
 * Ceiling on a single job. A serial queue is only as available as its head, so a request that hangs
 * would otherwise stall every job behind it for as long as the socket stays open.
 */
export const DEFAULT_SYNC_JOB_TIMEOUT_MS = 20000;

export type CreateSyncQueueOptions = {
  defaultTimeoutMs?: number;
};

const IDLE_STATE: SyncQueueState = {
  activeKind: null,
  activeLabelKey: null,
  completedCount: 0,
  pendingCount: 0,
  status: 'idle',
  totalCount: 0,
};

export const createSyncQueue = (options: CreateSyncQueueOptions = {}): SyncQueue => {
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_SYNC_JOB_TIMEOUT_MS;

  const pending: SyncJob[] = [];
  const stateListeners = new Set<(state: SyncQueueState) => void>();
  const failureListeners = new Set<(failure: SyncJobFailure) => void>();

  let activeJob: SyncJob | null = null;
  let completedCount = 0;
  let totalCount = 0;
  let isDraining = false;
  let isPausedOffline = false;

  const readState = (): SyncQueueState => {
    if (activeJob === null && pending.length === 0) {
      return IDLE_STATE;
    }

    const isParked = activeJob === null && isPausedOffline;

    return {
      activeKind: activeJob?.kind ?? null,
      activeLabelKey: activeJob?.labelKey ?? null,
      completedCount,
      pendingCount: pending.length,
      status: isParked ? 'paused' : 'running',
      totalCount,
    };
  };

  const notify = (): void => {
    const state = readState();
    for (const listener of stateListeners) {
      listener(state);
    }
  };

  const reportFailure = (job: SyncJob, error: unknown): void => {
    const { code, isOffline } = classifySyncError(error);

    if (isOffline) {
      // Park the rest of the run instead of walking every remaining job into the same wall. The
      // pending jobs keep their place and resume when the platform says we are back.
      isPausedOffline = true;
    }

    const failure: SyncJobFailure = {
      errorCode: code,
      isOffline,
      kind: job.kind,
      labelKey: job.labelKey,
      message: getErrorMessage(error, code),
      occurredAtMs: Date.now(),
    };

    for (const listener of failureListeners) {
      listener(failure);
    }
  };

  const runJob = async (job: SyncJob): Promise<void> => {
    const timeoutMs = job.timeoutMs ?? defaultTimeoutMs;
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const budget = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        abortController.abort();
        reject(new SyncJobTimeoutError(job.kind, timeoutMs));
      }, timeoutMs);
    });

    try {
      const work = job.run({ abortController, enqueue, timeoutMs });
      // A timed-out job keeps running until its own abort lands; swallow whatever it settles with
      // so abandoning it cannot surface as an unhandled rejection.
      work.catch(() => undefined);
      await Promise.race([work, budget]);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const drain = async (): Promise<void> => {
    if (isDraining) {
      return;
    }
    isDraining = true;

    try {
      while (pending.length > 0 && !isPausedOffline) {
        const job = pending.shift();
        if (job === undefined) {
          break;
        }

        activeJob = job;
        notify();

        try {
          await runJob(job);
        } catch (error) {
          // One bad channel must not abort a library sync: record it and take the next job.
          reportFailure(job, error);
        }

        activeJob = null;
        completedCount += 1;
        notify();
      }
    } finally {
      isDraining = false;

      if (pending.length === 0) {
        completedCount = 0;
        totalCount = 0;
        notify();
      } else if (isPausedOffline) {
        notify();
      }
    }
  };

  const insert = (job: SyncJob): boolean => {
    // Dedupe against work that has not started. An equivalent job already running is left alone —
    // it began before whatever prompted this enqueue, so it may not reflect the newer state.
    if (pending.some((queued) => queued.dedupeKey === job.dedupeKey)) {
      return false;
    }

    if (job.priority === 'user') {
      const firstBackgroundIndex = pending.findIndex((queued) => queued.priority !== 'user');
      if (firstBackgroundIndex === -1) {
        pending.push(job);
      } else {
        pending.splice(firstBackgroundIndex, 0, job);
      }
    } else {
      pending.push(job);
    }

    totalCount += 1;
    return true;
  };

  const enqueue = (job: SyncJob | SyncJob[]): void => {
    const jobs = Array.isArray(job) ? job : [job];
    let shouldDrain = false;

    for (const candidate of jobs) {
      if (insert(candidate)) {
        shouldDrain = true;
      }
      if (candidate.priority === 'user' && isPausedOffline) {
        // Somebody asked for this on purpose, so try the network again rather than making them wait
        // for a reachability event that may never arrive.
        isPausedOffline = false;
        shouldDrain = true;
      }
    }

    if (!shouldDrain) {
      return;
    }

    notify();
    void drain();
  };

  return {
    enqueue,

    getState: readState,

    setNetworkReachable: (isReachable: boolean): void => {
      if (!isReachable) {
        isPausedOffline = true;
        notify();
        return;
      }

      if (!isPausedOffline) {
        return;
      }

      isPausedOffline = false;
      notify();
      void drain();
    },

    subscribe: (listener) => {
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    },

    subscribeToFailures: (listener) => {
      failureListeners.add(listener);
      return () => {
        failureListeners.delete(listener);
      };
    },

    reset: (): void => {
      pending.length = 0;
      completedCount = 0;
      totalCount = 0;
      isPausedOffline = false;
      notify();
    },
  };
};

/** The app's queue. Jobs are in-memory: a restart re-derives them from triggers. */
export const syncQueue = createSyncQueue();
