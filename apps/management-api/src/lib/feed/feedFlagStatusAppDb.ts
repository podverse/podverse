import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@mgmt-api/orm/db/appDb.js';

export type FeedFlagLookupRow = {
  id: number;
  url: string;
  podcast_index_id: number;
  feed_flag_status_id: number;
  feed_flag_status_key: string;
  feed_flag_status_reason_id: number | null;
  feed_flag_status_reason_key: string | null;
  feed_flag_status_reason_note: string | null;
  channel_title: string | null;
};

const LOOKUP_BASE_SELECT = `
  SELECT
    f.id,
    f.url,
    f.podcast_index_id,
    f.feed_flag_status_id,
    ffs.status AS feed_flag_status_key,
    f.feed_flag_status_reason_id,
    ffr.reason AS feed_flag_status_reason_key,
    f.feed_flag_status_reason_note,
    c.title AS channel_title
  FROM feed f
  INNER JOIN feed_flag_status ffs ON ffs.id = f.feed_flag_status_id
  LEFT JOIN feed_flag_status_reason ffr ON ffr.id = f.feed_flag_status_reason_id
  LEFT JOIN channel c ON c.feed_id = f.id
`;

export async function findFeedByPodcastIndexId(
  podcastIndexId: number
): Promise<FeedFlagLookupRow | null> {
  const rows = (await AppDbDataSourceRead.query(
    `${LOOKUP_BASE_SELECT}
  WHERE f.podcast_index_id = $1
  LIMIT 1`,
    [podcastIndexId]
  )) as FeedFlagLookupRow[];
  return rows[0] ?? null;
}

export async function findFeedByInternalId(feedId: number): Promise<FeedFlagLookupRow | null> {
  const rows = (await AppDbDataSourceRead.query(
    `${LOOKUP_BASE_SELECT}
  WHERE f.id = $1
  LIMIT 1`,
    [feedId]
  )) as FeedFlagLookupRow[];
  return rows[0] ?? null;
}

export async function findFeedByUrl(url: string): Promise<FeedFlagLookupRow | null> {
  const rows = (await AppDbDataSourceRead.query(
    `${LOOKUP_BASE_SELECT}
  WHERE f.url = $1
  LIMIT 1`,
    [url]
  )) as FeedFlagLookupRow[];
  return rows[0] ?? null;
}

export type FeedFlagStatusOption = { id: number; status: string };
export type FeedFlagStatusReasonOption = { id: number; reason: string };

export async function listFeedFlagStatusOptions(): Promise<FeedFlagStatusOption[]> {
  return (await AppDbDataSourceRead.query(
    `SELECT id, status FROM feed_flag_status ORDER BY id ASC`
  )) as FeedFlagStatusOption[];
}

export async function listFeedFlagStatusReasonOptions(): Promise<FeedFlagStatusReasonOption[]> {
  return (await AppDbDataSourceRead.query(
    `SELECT id, reason FROM feed_flag_status_reason ORDER BY id ASC`
  )) as FeedFlagStatusReasonOption[];
}

/** Takedown row in `feed_flag_status` (sixth insert in base schema). */
export const FEED_FLAG_STATUS_TAKEDOWN_ID = 6;

export async function assertFlagStatusIdExists(id: number): Promise<boolean> {
  const rows = (await AppDbDataSourceRead.query(
    `SELECT 1::text AS c FROM feed_flag_status WHERE id = $1`,
    [id]
  )) as { c: string }[];
  return rows.length > 0;
}

export async function assertFlagStatusReasonIdExists(id: number): Promise<boolean> {
  const rows = (await AppDbDataSourceRead.query(
    `SELECT 1::text AS c FROM feed_flag_status_reason WHERE id = $1`,
    [id]
  )) as { c: string }[];
  return rows.length > 0;
}

/**
 * Returns the current feed row (flat) for audit, after update.
 */
export async function getFeedRowSnapshotById(
  feedId: number
): Promise<Record<string, unknown> | null> {
  const rows = (await AppDbDataSourceRead.query(
    `SELECT f.id, f.url, f.podcast_index_id, f.feed_flag_status_id, f.feed_flag_status_reason_id, f.feed_flag_status_reason_note
     FROM feed f WHERE f.id = $1`,
    [feedId]
  )) as Record<string, unknown>[];
  return rows[0] ? { ...rows[0] } : null;
}

export async function updateFeedFlagStatusInDb(
  feedId: number,
  feedFlagStatusId: number,
  feedFlagStatusReasonId: number | null,
  feedFlagStatusReasonNote: string | null
): Promise<void> {
  await AppDbDataSourceReadWrite.query(
    `UPDATE feed
     SET feed_flag_status_id = $1,
         feed_flag_status_reason_id = $2,
         feed_flag_status_reason_note = $3
     WHERE id = $4`,
    [feedFlagStatusId, feedFlagStatusReasonId, feedFlagStatusReasonNote, feedId]
  );
}
