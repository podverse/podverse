import type { StatsListenRequestBody } from '@podverse/helpers-requests';
import type { ListenSessionReport } from '@podverse/playback-core';

const DAY_MS = 86_400_000;
const MAX_SECONDS_HEARD = 86_400;

/** Rows kept per account; the oldest by `countedAtMs` go first. */
export const STATS_LISTEN_OUTBOX_MAX_ROWS_PER_ACCOUNT = 500;
/** Rows sent per drain pass. */
export const STATS_LISTEN_DRAIN_BATCH_LIMIT = 50;
/** Outbox storage bound: a session the server has never seen is dropped this long after it counted. */
export const STATS_LISTEN_FIRST_REPORT_MAX_AGE_MS = 30 * DAY_MS;
/** An update-only row is dropped this long after it counted, inside the server's 7-day session lookup. */
export const STATS_LISTEN_UPDATE_MAX_AGE_MS = 6 * DAY_MS;

export type StatsListenOutboxRecord = {
  clientListenId: string;
  accountIdText: string;
  targetKind: 'item' | 'clip';
  targetIdText: string;
  secondsHeard: number;
  completed: boolean;
  firstReport: boolean;
  countedAtMs: number;
  updatedAtMs: number;
  /** Length of the file the player loaded, or null when that report had none. */
  mediaDurationSeconds: number | null;
};

export function statsListenOutboxRecordFromReport(input: {
  report: ListenSessionReport;
  accountIdText: string;
  nowMs: number;
}): StatsListenOutboxRecord {
  const { report, accountIdText, nowMs } = input;
  return {
    clientListenId: report.clientListenId,
    accountIdText,
    targetKind: report.target.kind,
    targetIdText: report.target.idText,
    secondsHeard: report.secondsHeard,
    completed: report.completed,
    firstReport: report.firstReport,
    countedAtMs: report.countedAtMs,
    updatedAtMs: nowMs,
    mediaDurationSeconds: positiveFileDuration(report.mediaDurationSeconds),
  };
}

function positiveFileDuration(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

/** Same session: larger seconds heard, completion sticks, earliest counted time, latest update. */
export function mergeStatsListenOutboxRecord(
  existing: StatsListenOutboxRecord | null,
  incoming: StatsListenOutboxRecord
): StatsListenOutboxRecord {
  if (existing === null) {
    return incoming;
  }
  return {
    clientListenId: existing.clientListenId,
    accountIdText: existing.accountIdText,
    targetKind: existing.targetKind,
    targetIdText: existing.targetIdText,
    secondsHeard: Math.max(existing.secondsHeard, incoming.secondsHeard),
    completed: existing.completed || incoming.completed,
    firstReport: existing.firstReport || incoming.firstReport,
    countedAtMs: Math.min(existing.countedAtMs, incoming.countedAtMs),
    updatedAtMs: incoming.updatedAtMs,
    mediaDurationSeconds:
      positiveFileDuration(incoming.mediaDurationSeconds) ??
      positiveFileDuration(existing.mediaDurationSeconds),
  };
}

export function isStatsListenOutboxRecordExpired(
  record: StatsListenOutboxRecord,
  nowMs: number
): boolean {
  const maxAgeMs = record.firstReport
    ? STATS_LISTEN_FIRST_REPORT_MAX_AGE_MS
    : STATS_LISTEN_UPDATE_MAX_AGE_MS;
  return nowMs - record.countedAtMs > maxAgeMs;
}

/** 401, 429, 5xx, and no response retry; any other failure status drops the row. */
export function classifyStatsListenSendFailure(status: number | null): 'drop' | 'retry' {
  if (status === null || status === 401 || status === 429 || status >= 500) {
    return 'retry';
  }
  return 'drop';
}

/** Request body for one listen report. The server stamps receive time; no listen-time field. */
export function toStatsListenRequestBody(record: StatsListenOutboxRecord): StatsListenRequestBody {
  const secondsHeard = Number.isFinite(record.secondsHeard)
    ? Math.min(MAX_SECONDS_HEARD, Math.max(0, Math.floor(record.secondsHeard)))
    : 0;
  const fileDuration = positiveFileDuration(record.mediaDurationSeconds);
  const base = {
    client_listen_id: record.clientListenId,
    seconds_heard: secondsHeard,
    completed: record.completed,
    ...(fileDuration === null ? {} : { media_duration_seconds: fileDuration }),
  };
  return record.targetKind === 'clip'
    ? { ...base, clip_id_text: record.targetIdText }
    : { ...base, item_id_text: record.targetIdText };
}

/** Ids to evict so at most `max` records remain, oldest `countedAtMs` first. */
export function selectStatsListenOutboxEvictions(
  records: readonly Pick<StatsListenOutboxRecord, 'clientListenId' | 'countedAtMs'>[],
  max: number
): string[] {
  const overflow = records.length - Math.max(0, max);
  if (overflow <= 0) {
    return [];
  }
  return [...records]
    .sort((left, right) => left.countedAtMs - right.countedAtMs)
    .slice(0, overflow)
    .map((record) => record.clientListenId);
}
