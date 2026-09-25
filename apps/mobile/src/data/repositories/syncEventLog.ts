import { isObjectLike } from '@podverse/helpers/guards';

/**
 * Shape and retention rules for the on-device error log.
 *
 * Pure so the parts that are easy to get quietly wrong — the cap, the order things are evicted in,
 * the guarantee that a failure is never the row that gets dropped, and the text a user copies for
 * support — are testable in node. SQLite access lives in `syncEventLogRepository`.
 */

/** Small enough to stay invisible in device storage, big enough to cover a support conversation. */
export const SYNC_EVENT_LOG_CAP = 200;

/**
 * `skipped` covers a job the queue parked rather than ran — being offline is a state, not a fault,
 * and recording it as a failure would tell a user they did something wrong.
 *
 * `reconciled` is a directory follow the item list said is gone. The device dropped it on purpose,
 * so it is not a retryable failure and not an offline skip.
 */
export type SyncEventOutcome = 'failure' | 'reconciled' | 'skipped' | 'success';

/** Narrows a stored `outcome` column. Rows that fail this were not written by this app. */
export const isSyncEventOutcome = (value: string): value is SyncEventOutcome => {
  return (
    value === 'failure' || value === 'reconciled' || value === 'skipped' || value === 'success'
  );
};

/**
 * Structured context an entry may carry, in the order the detail screen and the copied report list
 * them. Keys are stable and untranslated: they appear verbatim in a report emailed to support.
 */
export const SYNC_EVENT_DETAIL_KEYS = [
  'http_status',
  'media_url',
  'engine_url',
  'feed_url',
  'item_title',
  'channel_title',
  'item_id_text',
  'channel_id_text',
  'clip_id_text',
  'soundbite_id_text',
  'chapter_id_text',
  'add_by_rss_id_text',
  'item_guid',
  'resource_kind',
  'source',
  'position_seconds',
  'error_kind',
  'native_code',
  'native_detail',
  'parse_status',
  'request_id',
] as const;

export type SyncEventDetailKey = (typeof SYNC_EVENT_DETAIL_KEYS)[number];

export type SyncEventLogDetails = Partial<Record<SyncEventDetailKey, string>>;

export type SyncEventLogEntry = {
  details: SyncEventLogDetails;
  /** Stable and untranslated. The only part of an entry a user can usefully quote to support. */
  errorCode: string | null;
  id: number;
  jobKind: string;
  message: string | null;
  occurredAt: number;
  outcome: SyncEventOutcome;
};

/** Userinfo in a feed-published URL is a credential and must not end up in a copied report. */
const URL_USERINFO_PATTERN = /^([a-z][a-z0-9+.-]*:\/\/)[^/?#@]*@/i;

const URL_DETAIL_KEYS: ReadonlySet<SyncEventDetailKey> = new Set([
  'engine_url',
  'feed_url',
  'media_url',
]);

export const redactUrlCredentials = (url: string): string => {
  return url.replace(URL_USERINFO_PATTERN, '$1');
};

/**
 * Drops empty values so a stored row only names what it actually knows, and strips URL
 * credentials so no caller can store one. Null when nothing is left.
 */
export const serializeSyncEventLogDetails = (
  details: SyncEventLogDetails | undefined
): string | null => {
  if (details === undefined) {
    return null;
  }
  const kept: SyncEventLogDetails = {};
  for (const key of SYNC_EVENT_DETAIL_KEYS) {
    const value = details[key]?.trim();
    if (value !== undefined && value.length > 0) {
      kept[key] = URL_DETAIL_KEYS.has(key) ? redactUrlCredentials(value) : value;
    }
  }
  return Object.keys(kept).length === 0 ? null : JSON.stringify(kept);
};

/** Reads a stored `details_json`. Unknown keys and non-string values are ignored, never thrown on. */
export const parseSyncEventLogDetails = (raw: string | null): SyncEventLogDetails => {
  if (raw === null) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isObjectLike(parsed)) {
    return {};
  }
  const details: SyncEventLogDetails = {};
  for (const key of SYNC_EVENT_DETAIL_KEYS) {
    const value = parsed[key];
    if (typeof value === 'string' && value.length > 0) {
      details[key] = value;
    }
  }
  return details;
};

/** Detail pairs in display order. */
export const listSyncEventLogDetails = (
  details: SyncEventLogDetails
): { key: SyncEventDetailKey; value: string }[] => {
  return SYNC_EVENT_DETAIL_KEYS.flatMap((key) => {
    const value = details[key];
    return value === undefined ? [] : [{ key, value }];
  });
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

/** Device context appended to a copied report. The caller reads it from the platform. */
export type SyncEventReportEnvironment = {
  appVersion: string;
  platform: string;
};

/**
 * Plain text for one entry, for the detail screen's copy action.
 *
 * Labels are the stable keys rather than translated words, and the timestamp is ISO: the reader is
 * a support conversation, not the device owner, and an ambiguous `03/08` helps nobody.
 */
export const formatSyncEventLogEntryReport = (
  entry: SyncEventLogEntry,
  environment: SyncEventReportEnvironment
): string => {
  const lines = [
    'Error report',
    `time: ${new Date(entry.occurredAt).toISOString()}`,
    `category: ${entry.jobKind}`,
    `outcome: ${entry.outcome}`,
    `code: ${entry.errorCode ?? '-'}`,
  ];
  if (entry.message !== null) {
    lines.push(`message: ${entry.message}`);
  }
  for (const { key, value } of listSyncEventLogDetails(entry.details)) {
    lines.push(`${key}: ${value}`);
  }
  lines.push(`app_version: ${environment.appVersion}`, `platform: ${environment.platform}`);
  return lines.join('\n');
};

/**
 * Plain text for the whole log, one entry per line with its details indented beneath it.
 *
 * Timestamps are ISO for the same reason as the single-entry report.
 */
export const formatSyncEventLogExport = (entries: readonly SyncEventLogEntry[]): string => {
  const header = `Error log (${entries.length})`;

  const lines = entries.flatMap((entry) => {
    const timestamp = new Date(entry.occurredAt).toISOString();
    const code = entry.errorCode ?? '-';
    const detail = entry.message === null ? '' : ` — ${entry.message}`;
    const summary = `${timestamp}  ${entry.outcome}  ${entry.jobKind}  ${code}${detail}`;
    const detailLines = listSyncEventLogDetails(entry.details).map(
      ({ key, value }) => `    ${key}: ${value}`
    );
    return [summary, ...detailLines];
  });

  return [header, ...lines].join('\n');
};
