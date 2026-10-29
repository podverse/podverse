import { AppDbDataSourceRead } from '@management-api/orm/db/appDb.js';
import type { RemoteStubListQueryValidated } from '@management-api/schemas/feedRemoteStubs.js';

import {
  REMOTE_STUB_PROMOTE_JOB_TYPE,
  REMOTE_STUB_RECHECK_JOB_TYPE,
  REMOTE_STUB_REPOINT_JOB_TYPE,
} from '@podverse/orm';

export type RemoteStubPendingAction = 'recheck' | 'repoint' | 'promote';

export type RemoteStubAlias = {
  key_kind: 'feed_guid' | 'feed_url';
  key_value: string;
};

export type RemoteStubItemRow = {
  item_guid: string;
  title: string | null;
  pub_date: string | null;
  duration_seconds: number | null;
  resolved_at: string;
};

export type RemoteStubJobRow = {
  job_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  run_after: string;
  updated_at: string;
};

export type RemoteStubListRow = {
  id: number;
  index_provider: string;
  provider_feed_id: string;
  title: string | null;
  author: string | null;
  feed_url: string | null;
  feed_guid: string | null;
  medium_value: string | null;
  alias_count: number;
  item_stub_count: number;
  pending_action: RemoteStubPendingAction | null;
  resolved_at: string;
  created_at: string;
};

export type RemoteStubDetail = RemoteStubListRow & {
  image_url: string | null;
  aliases: RemoteStubAlias[];
  item_stubs: RemoteStubItemRow[];
  jobs: RemoteStubJobRow[];
};

const SORT_COLUMNS: Record<RemoteStubListQueryValidated['sort'], string> = {
  title: 's.title',
  provider_feed_id: 's.provider_feed_id',
  item_stub_count: 'item_stub_count',
  resolved_at: 's.resolved_at',
  created_at: 's.created_at',
};

/**
 * Dedupe keys are "<job type>:<stub id>" for re-check and re-point, and
 * "<job type>:<index provider>:<provider feed id>" for promote. The job type
 * parameters are the scheduler's REMOTE_STUB_*_JOB_TYPE constants.
 */
const PENDING_JOIN = `
LEFT JOIN LATERAL (
  SELECT j.job_type
  FROM scheduled_job j
  WHERE j.status IN ('pending', 'running')
    AND j.dedupe_key IN (
      $1 || ':' || s.id::text,
      $2 || ':' || s.id::text,
      $3 || ':' || s.index_provider || ':' || s.provider_feed_id
    )
  ORDER BY j.updated_at DESC, j.id DESC
  LIMIT 1
) pending ON true
`;

const STUB_COLUMNS = `
  s.id,
  s.index_provider,
  s.provider_feed_id,
  s.title,
  s.author,
  s.feed_url,
  s.feed_guid::text AS feed_guid,
  m.value AS medium_value,
  (
    SELECT COUNT(*)::int
    FROM remote_channel_stub_alias alias
    WHERE alias.remote_channel_stub_id = s.id
  ) AS alias_count,
  (
    SELECT COUNT(*)::int
    FROM remote_item_stub item_stub
    WHERE item_stub.remote_channel_stub_id = s.id
  ) AS item_stub_count,
  pending.job_type AS pending_job_type,
  s.resolved_at,
  s.created_at
`;

const ALIASES_SQL = `
SELECT key_kind, key_value
FROM remote_channel_stub_alias
WHERE remote_channel_stub_id = $1
ORDER BY key_kind, key_value
`;

const ITEM_STUBS_SQL = `
SELECT item_guid, title, pub_date, duration_seconds, resolved_at
FROM remote_item_stub
WHERE remote_channel_stub_id = $1
ORDER BY pub_date DESC NULLS LAST, id DESC
LIMIT 50
`;

const JOBS_SQL = `
SELECT
  j.job_type,
  j.status,
  j.attempts,
  j.max_attempts,
  j.last_error,
  j.run_after,
  j.updated_at
FROM scheduled_job j
WHERE j.dedupe_key IN (
  $1 || ':' || $4::text,
  $2 || ':' || $4::text,
  $3 || ':' || $5 || ':' || $6
)
ORDER BY j.updated_at DESC, j.id DESC
LIMIT 10
`;

type Queryable = {
  query: (sql: string, parameters?: unknown[]) => Promise<unknown>;
};

const JOB_TYPE_PARAMS = [
  REMOTE_STUB_RECHECK_JOB_TYPE,
  REMOTE_STUB_REPOINT_JOB_TYPE,
  REMOTE_STUB_PROMOTE_JOB_TYPE,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function searchSql(exact: number, like: number): string {
  return `(
    $${exact}::text IS NULL
    OR s.title ILIKE $${like} ESCAPE '\\'
    OR s.feed_url ILIKE $${like} ESCAPE '\\'
    OR s.provider_feed_id = $${exact}
    OR lower(s.feed_guid::text) = lower($${exact})
  )`;
}

function orderBySql(query: RemoteStubListQueryValidated): string {
  const column = SORT_COLUMNS[query.sort];
  const direction = query.order === 'asc' ? 'ASC' : 'DESC';
  return `${column} ${direction}, s.id DESC`;
}

function listSql(query: RemoteStubListQueryValidated): string {
  return `
SELECT
  ${STUB_COLUMNS}
FROM remote_channel_stub s
LEFT JOIN medium m ON m.id = s.medium_id
${PENDING_JOIN}
WHERE ${searchSql(4, 5)}
ORDER BY ${orderBySql(query)}
LIMIT $6 OFFSET $7
`;
}

function countSql(): string {
  return `
SELECT COUNT(*)::int AS total
FROM remote_channel_stub s
WHERE ${searchSql(1, 2)}
`;
}

const DETAIL_SQL = `
SELECT
  ${STUB_COLUMNS},
  s.image_url
FROM remote_channel_stub s
LEFT JOIN medium m ON m.id = s.medium_id
${PENDING_JOIN}
WHERE s.id = $4
`;

function readRequiredInt(value: unknown, label: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number(value);
  }
  throw new Error(`${label} is not an integer`);
}

function readRequiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is not a string`);
  }
  return value;
}

function readNullableString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`${label} is not a string`);
  }
  return value;
}

function readOptionalInt(value: unknown, label: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return readRequiredInt(value, label);
}

function readIsoTimestamp(value: unknown, label: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  throw new Error(`${label} is not a timestamp`);
}

function readOptionalIsoTimestamp(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return readIsoTimestamp(value, label);
}

function readKeyKind(value: unknown): RemoteStubAlias['key_kind'] {
  if (value === 'feed_guid' || value === 'feed_url') {
    return value;
  }
  throw new Error('remote_channel_stub_alias key_kind is not recognized');
}

function readPendingAction(value: unknown): RemoteStubPendingAction | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value === REMOTE_STUB_RECHECK_JOB_TYPE) {
    return 'recheck';
  }
  if (value === REMOTE_STUB_REPOINT_JOB_TYPE) {
    return 'repoint';
  }
  if (value === REMOTE_STUB_PROMOTE_JOB_TYPE) {
    return 'promote';
  }
  throw new Error('scheduled_job job_type is not a remote stub action');
}

async function queryRows(db: Queryable, sql: string, parameters: unknown[]): Promise<unknown[]> {
  const result = await db.query(sql, parameters);
  if (!Array.isArray(result)) {
    throw new Error('remote_channel_stub query did not return rows');
  }
  return result;
}

function mapListRow(value: unknown): RemoteStubListRow {
  if (!isRecord(value)) {
    throw new Error('remote_channel_stub row is not an object');
  }
  return {
    id: readRequiredInt(value.id, 'id'),
    index_provider: readRequiredString(value.index_provider, 'index_provider'),
    provider_feed_id: readRequiredString(value.provider_feed_id, 'provider_feed_id'),
    title: readNullableString(value.title, 'title'),
    author: readNullableString(value.author, 'author'),
    feed_url: readNullableString(value.feed_url, 'feed_url'),
    feed_guid: readNullableString(value.feed_guid, 'feed_guid'),
    medium_value: readNullableString(value.medium_value, 'medium_value'),
    alias_count: readRequiredInt(value.alias_count, 'alias_count'),
    item_stub_count: readRequiredInt(value.item_stub_count, 'item_stub_count'),
    pending_action: readPendingAction(value.pending_job_type),
    resolved_at: readIsoTimestamp(value.resolved_at, 'resolved_at'),
    created_at: readIsoTimestamp(value.created_at, 'created_at'),
  };
}

function mapAlias(value: unknown): RemoteStubAlias {
  if (!isRecord(value)) {
    throw new Error('remote_channel_stub_alias row is not an object');
  }
  return {
    key_kind: readKeyKind(value.key_kind),
    key_value: readRequiredString(value.key_value, 'key_value'),
  };
}

function mapItemStub(value: unknown): RemoteStubItemRow {
  if (!isRecord(value)) {
    throw new Error('remote_item_stub row is not an object');
  }
  return {
    item_guid: readRequiredString(value.item_guid, 'item_guid'),
    title: readNullableString(value.title, 'title'),
    pub_date: readOptionalIsoTimestamp(value.pub_date, 'pub_date'),
    duration_seconds: readOptionalInt(value.duration_seconds, 'duration_seconds'),
    resolved_at: readIsoTimestamp(value.resolved_at, 'resolved_at'),
  };
}

function mapJob(value: unknown): RemoteStubJobRow {
  if (!isRecord(value)) {
    throw new Error('scheduled_job row is not an object');
  }
  return {
    job_type: readRequiredString(value.job_type, 'job_type'),
    status: readRequiredString(value.status, 'status'),
    attempts: readRequiredInt(value.attempts, 'attempts'),
    max_attempts: readRequiredInt(value.max_attempts, 'max_attempts'),
    last_error: readNullableString(value.last_error, 'last_error'),
    run_after: readIsoTimestamp(value.run_after, 'run_after'),
    updated_at: readIsoTimestamp(value.updated_at, 'updated_at'),
  };
}

function searchParams(query: RemoteStubListQueryValidated): [string | null, string | null] {
  if (query.q === undefined) {
    return [null, null];
  }
  return [query.q, `%${escapeIlike(query.q)}%`];
}

export async function listRemoteStubs(
  query: RemoteStubListQueryValidated
): Promise<{ rows: RemoteStubListRow[]; total: number }> {
  const offset = (query.page - 1) * query.limit;
  const [exact, like] = searchParams(query);
  const [countRows, rows] = await Promise.all([
    queryRows(AppDbDataSourceRead, countSql(), [exact, like]),
    queryRows(AppDbDataSourceRead, listSql(query), [
      ...JOB_TYPE_PARAMS,
      exact,
      like,
      query.limit,
      offset,
    ]),
  ]);
  const countRow = countRows[0];
  const total =
    countRow === undefined
      ? 0
      : readRequiredInt(isRecord(countRow) ? countRow.total : undefined, 'total');
  return { rows: rows.map(mapListRow), total };
}

export async function getRemoteStub(id: number): Promise<RemoteStubDetail | null> {
  const rows = await queryRows(AppDbDataSourceRead, DETAIL_SQL, [...JOB_TYPE_PARAMS, id]);
  const first = rows[0];
  if (first === undefined) {
    return null;
  }
  if (!isRecord(first)) {
    throw new Error('remote_channel_stub row is not an object');
  }
  const listRow = mapListRow(first);
  const [aliases, itemStubs, jobs] = await Promise.all([
    queryRows(AppDbDataSourceRead, ALIASES_SQL, [id]),
    queryRows(AppDbDataSourceRead, ITEM_STUBS_SQL, [id]),
    queryRows(AppDbDataSourceRead, JOBS_SQL, [
      ...JOB_TYPE_PARAMS,
      id,
      listRow.index_provider,
      listRow.provider_feed_id,
    ]),
  ]);
  return {
    ...listRow,
    image_url: readNullableString(first.image_url, 'image_url'),
    aliases: aliases.map(mapAlias),
    item_stubs: itemStubs.map(mapItemStub),
    jobs: jobs.map(mapJob),
  };
}
