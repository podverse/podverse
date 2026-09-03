/**
 * Shape and retention rules for the on-device sync event log.
 *
 * Pure so the parts that are easy to get quietly wrong — the cap, the order things are evicted in,
 * and the guarantee that a failure is never the row that gets dropped — are testable in node.
 * SQLite access lives in `syncEventLogRepository`.
 */

/** Small enough to stay invisible in device storage, big enough to cover a support conversation. */
export const SYNC_EVENT_LOG_CAP = 500;

/**
 * `skipped` covers a job the queue parked rather than ran — being offline is a state, not a fault,
 * and recording it as a failure would tell a user they did something wrong.
 */
export type SyncEventOutcome = 'failure' | 'skipped' | 'success';

/** Narrows a stored `outcome` column. Rows that fail this were not written by this app. */
export const isSyncEventOutcome = (value: string): value is SyncEventOutcome => {
  return value === 'failure' || value === 'skipped' || value === 'success';
};

export type SyncEventLogEntry = {
  /** Stable and untranslated. The only part of an entry a user can usefully quote to support. */
  errorCode: string | null;
  id: number;
  jobKind: string;
  message: string | null;
  occurredAt: number;
  outcome: SyncEventOutcome;
};

/** What the eviction rule reads. A full entry satisfies it. */
export type SyncEventEvictionCandidate = Pick<SyncEventLogEntry, 'id' | 'occurredAt' | 'outcome'>;

const compareOldestFirst = (
  a: SyncEventEvictionCandidate,
  b: SyncEventEvictionCandidate
): number => {
  if (a.occurredAt !== b.occurredAt) {
    return a.occurredAt - b.occurredAt;
  }
  // Two entries can land in the same millisecond, and eviction needs a total order or the row that
  // goes is whatever the query happened to return first.
  return a.id - b.id;
};

/**
 * Choose which rows to delete to get back to `cap`, oldest first.
 *
 * Failures go last. A log that dropped the one failure because forty channels synced fine answers
 * "why aren't my podcasts updating" with silence, which is the exact situation this log exists for.
 * Only a flood of *other failures* can push a failure out, and that is a report in itself.
 */
export const selectSyncEventEvictions = (
  candidates: readonly SyncEventEvictionCandidate[],
  cap: number = SYNC_EVENT_LOG_CAP
): number[] => {
  const excess = candidates.length - cap;
  if (excess <= 0) {
    return [];
  }

  const expendable = candidates.filter((entry) => entry.outcome !== 'failure');
  expendable.sort(compareOldestFirst);

  if (expendable.length >= excess) {
    return expendable.slice(0, excess).map((entry) => entry.id);
  }

  const failures = candidates.filter((entry) => entry.outcome === 'failure');
  failures.sort(compareOldestFirst);

  return [...expendable, ...failures.slice(0, excess - expendable.length)].map((entry) => entry.id);
};

/**
 * Plain text for handing to support.
 *
 * Timestamps are ISO rather than locale-formatted: the reader is a support conversation, not the
 * device owner, and an ambiguous `03/08` helps nobody.
 */
export const formatSyncEventLogExport = (entries: readonly SyncEventLogEntry[]): string => {
  const header = `Podverse sync log (${entries.length})`;

  const lines = entries.map((entry) => {
    const timestamp = new Date(entry.occurredAt).toISOString();
    const code = entry.errorCode ?? '-';
    const detail = entry.message === null ? '' : ` — ${entry.message}`;
    return `${timestamp}  ${entry.outcome}  ${entry.jobKind}  ${code}${detail}`;
  });

  return [header, ...lines].join('\n');
};
