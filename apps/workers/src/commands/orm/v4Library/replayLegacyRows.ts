import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';

import { getDataSourceReadWrite, isValidNanoIdV2IdText } from '@podverse/orm';

import {
  assertLocalDatabase,
  hasOption,
  optionValue,
  readLocalCatalog,
  readV4References,
} from './copyAccountLibrary.js';
import type { LegacyMapping, Queryable } from './copyAccountLibraryApply.js';
import {
  activeTarget,
  episodeById,
  LIST_POSITION_STEP,
  loadAccountsForLegacyUsers,
  loadIds,
  mergePlaybackRow,
  oneId,
  PendingRows,
  query,
  queueFor,
  resolveItemId,
  writeArchivedItems,
  writeClips,
  writeLegacyIdMap,
  writePendingRows,
  writePlaylistMember,
} from './copyAccountLibraryApply.js';
import type {
  LocalCatalog,
  PendingRowStatus,
  V4EpisodeKey,
  V4LibrarySnapshot,
  V4MediaRefKey,
  V4PlaybackKey,
} from './copyAccountLibraryLib.js';
import { EMAIL_CASE_TWIN_RESOLVE_KEY, episodeDecision } from './copyAccountLibraryLib.js';
import type { ReplayCounts, ReplayResult, ReplayRowKind } from './replayLegacyRowsLib.js';
import {
  contextFlag,
  contextNumber,
  contextText,
  decideClipSwap,
  decideFollow,
  decidePlayback,
  decidePlaylistClip,
  decideSnapshotReattach,
  decideWaitingSnapshot,
  isPendingRowStatus,
  isReplayRowKind,
  playbackZoneOf,
  REPLAY_ROW_KINDS,
  resultFor,
  tallyReplay,
} from './replayLegacyRowsLib.js';

export const V4_REPLAY_LEGACY_ROWS_HELP = `v4ReplayLegacyRows

Finish rows the v4 library copy recorded in legacy_pending_row. Reads unresolved
rows and snapshot rows, least recently tried first. Each row runs in its own
transaction and its status and reason are updated in it.

  follow_account            follows once the followed account is copied
  follow_playlist           follows once the playlist's owner is copied
  playlist_clip             adds another user's clip once that user is copied
  history, queue,           written once the item is Active, with one row per
  now_playing               item or clip per queue; dropped once the feed is
                            settled and the item is still missing or not Active.
                            clip_not_copied waits until that clip exists, then
                            replaces the episode row or is inserted beside it
  snapshot_clip,            written once the feed parse finished or failed;
  snapshot_playlist_member  a snapshot reattaches once its show is local
  subscription              left as the copy recorded it

Clips and playlist members are never dropped. Refuses unless DB_HOST is local.

Flags:
  --dry-run     Run each row and roll it back; count only
  --limit n     Rows to read (default 500)
  --v4-id id    Only this account
  --help        Show this text

Requires V4_DATABASE_URL (read only) plus the Base and ORM worker env. The log
is counts per kind and outcome. No email, url, title, or id is logged.
`;

const DEFAULT_LIMIT = 500;

/** `--v4-id` of an email-case twin selects the kept account its library merged into. */
const PENDING_SQL = `
SELECT p.id, p.account_id, a.id_text AS account_id_text, p.row_kind, p.legacy_id, p.status, p.reason, p.context
FROM legacy_pending_row p
INNER JOIN account a ON a.id = p.account_id
WHERE p.row_kind <> 'subscription'
  AND (p.status = 'unresolved' OR (p.status = 'resolved' AND p.reason = 'snapshot'))
  AND (
    $1::varchar IS NULL
    OR a.id_text = $1
    OR a.id_text IN (
      SELECT m.v5_id_text FROM legacy_id_map m
      WHERE m.legacy_kind = 'user' AND m.legacy_id = $1 AND m.v5_kind = 'account'
        AND m.resolve_key = $3 AND m.status = 'mapped'
    )
  )
ORDER BY p.updated_at ASC, p.id ASC
LIMIT $2
`;

/** The account's own v4 id and the v4 ids of email-case twins merged into it. */
const MERGED_OWNER_IDS_SQL = `
SELECT legacy_id FROM legacy_id_map
WHERE legacy_kind = 'user' AND v5_kind = 'account' AND v5_id_text = $1
  AND resolve_key = $2 AND status = 'mapped'
`;

type PendingRecord = {
  id: number;
  accountId: number;
  accountIdText: string;
  kind: ReplayRowKind;
  legacyId: string;
  status: PendingRowStatus;
  reason: string;
  context: Record<string, unknown>;
};

type StatusIds = { archived: number; active: number; public: number; unlisted: number };

type AccountScope = {
  accountId: number;
  snapshot: V4LibrarySnapshot;
  catalog: LocalCatalog;
  channelIds: Map<string, number>;
  statusIds: StatusIds;
};

type RowWork = {
  result: ReplayResult;
  pending: PendingRows;
  mappings: LegacyMapping[];
};

class DryRunRollback extends Error {
  readonly work: RowWork;

  constructor(rowWork: RowWork) {
    super('dry run');
    this.work = rowWork;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLimit(args: CommandLineArgs): number {
  const raw = optionValue(args, 'limit');
  if (raw === null) {
    return DEFAULT_LIMIT;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('--limit must be a positive whole number.');
  }
  return value;
}

function pendingRecord(row: Record<string, unknown>): PendingRecord | null {
  const id = Number(row.id);
  const kind = row.row_kind;
  const status = row.status;
  if (
    !Number.isSafeInteger(id) ||
    typeof row.account_id !== 'number' ||
    typeof row.account_id_text !== 'string' ||
    typeof row.legacy_id !== 'string' ||
    !isReplayRowKind(kind) ||
    !isPendingRowStatus(status)
  ) {
    return null;
  }
  return {
    id,
    accountId: row.account_id,
    accountIdText: row.account_id_text,
    kind,
    legacyId: row.legacy_id,
    status,
    reason: typeof row.reason === 'string' ? row.reason : '',
    context: isRecord(row.context) ? row.context : {},
  };
}

function sortForReplay(rows: PendingRecord[]): PendingRecord[] {
  const kindOrder = (kind: ReplayRowKind): number => REPLAY_ROW_KINDS.indexOf(kind);
  const accountOrder = new Map<number, number>();
  for (const row of rows) {
    if (!accountOrder.has(row.accountId)) {
      accountOrder.set(row.accountId, accountOrder.size);
    }
  }
  return [...rows].sort(
    (left, right) =>
      (accountOrder.get(left.accountId) ?? 0) - (accountOrder.get(right.accountId) ?? 0) ||
      kindOrder(left.kind) - kindOrder(right.kind)
  );
}

async function readStatusIds(db: Queryable): Promise<StatusIds> {
  const archived = await oneId(db, `SELECT id FROM item_flag_status WHERE status = 'archived'`, []);
  const active = await oneId(db, `SELECT id FROM item_flag_status WHERE status = 'active'`, []);
  const publicId = await oneId(db, `SELECT id FROM sharable_status WHERE status = 'public'`, []);
  const unlistedId = await oneId(
    db,
    `SELECT id FROM sharable_status WHERE status = 'unlisted'`,
    []
  );
  if (archived === null || active === null || publicId === null || unlistedId === null) {
    throw new Error('Missing item status or sharable status rows.');
  }
  return { archived, active, public: publicId, unlisted: unlistedId };
}

function referencedIds(rows: readonly PendingRecord[]): {
  episodeIds: string[];
  mediaRefIds: string[];
} {
  const episodeIds: string[] = [];
  const mediaRefIds: string[] = [];
  for (const row of rows) {
    const episodeId = contextText(row.context, 'episode_id');
    const mediaRefId = contextText(row.context, 'media_ref_id');
    if (episodeId !== null) {
      episodeIds.push(episodeId);
    }
    if (mediaRefId !== null) {
      mediaRefIds.push(mediaRefId);
    }
    if (row.kind === 'snapshot_clip') {
      mediaRefIds.push(row.legacyId);
    }
  }
  return { episodeIds, mediaRefIds };
}

async function readAccountScope(
  db: Queryable,
  connectionString: string,
  rows: readonly PendingRecord[],
  statusIds: StatusIds
): Promise<AccountScope> {
  const first = rows[0];
  if (first === undefined) {
    throw new Error('No rows for the account.');
  }
  const ids = referencedIds(rows);
  const needsV4 = ids.episodeIds.length > 0 || ids.mediaRefIds.length > 0;
  if (needsV4 && connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  const ownerIds = needsV4
    ? [
        first.accountIdText,
        ...(
          await query(db, MERGED_OWNER_IDS_SQL, [first.accountIdText, EMAIL_CASE_TWIN_RESOLVE_KEY])
        )
          .map((row) => row.legacy_id)
          .filter((id): id is string => typeof id === 'string'),
      ]
    : [];
  const references = needsV4
    ? await readV4References(connectionString, ownerIds, ids)
    : { mediaRefs: [], clips: [], episodes: [], podcasts: [] };
  const snapshot: V4LibrarySnapshot = {
    podcastIds: [],
    addByRssUrls: [],
    playlistFollowIds: [],
    userFollowIds: rows.filter((row) => row.kind === 'follow_account').map((row) => row.legacyId),
    playlists: [],
    queue: [],
    history: [],
    nowPlaying: [],
    ...references,
  };
  const catalog = await readLocalCatalog(snapshot);
  const channelIds = await loadIds(
    db,
    `SELECT id, id_text FROM channel WHERE id_text = ANY($1::varchar[])`,
    [
      ...catalog.channelIdTexts,
      ...catalog.channelByPodcastIndexId.values(),
      ...catalog.channelByFeedUrl.values(),
      ...catalog.channelByPodcastGuid.values(),
      ...catalog.absorbSurvivorByPodcastIndexId.values(),
    ]
  );
  return { accountId: first.accountId, snapshot, catalog, channelIds, statusIds };
}

function work(
  result: ReplayResult,
  pending = new PendingRows(),
  mappings: LegacyMapping[] = []
): RowWork {
  return { result, pending, mappings };
}

/** Creates the Archived item for one episode when the copy's rules call for one. */
async function archiveEpisode(
  db: Queryable,
  episode: V4EpisodeKey,
  scope: AccountScope,
  itemIds: Map<string, number>
): Promise<void> {
  await writeArchivedItems(
    db,
    { ...scope.snapshot, episodes: [episode] },
    scope.catalog,
    scope.channelIds,
    itemIds,
    scope.statusIds.archived
  );
}

/** The first free slot at or after `preferred`, or after the last member. */
async function playlistSlot(
  db: Queryable,
  playlistId: number,
  preferred: string | null
): Promise<string> {
  const rows = await query(
    db,
    `SELECT CASE
       WHEN $2::numeric IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM playlist_resource WHERE playlist_id = $1 AND list_position = $2::numeric)
       THEN $2::numeric
       ELSE COALESCE((SELECT max(list_position) FROM playlist_resource WHERE playlist_id = $1) + $3::numeric, 1)
     END::text AS position`,
    [playlistId, preferred, LIST_POSITION_STEP]
  );
  const position = rows[0]?.position;
  if (typeof position !== 'string') {
    throw new Error('Could not place the playlist member.');
  }
  return position;
}

async function playlistHas(
  db: Queryable,
  playlistId: number,
  column: 'item_id' | 'clip_id',
  id: number
): Promise<boolean> {
  const rows = await query(
    db,
    `SELECT 1 FROM playlist_resource WHERE playlist_id = $1 AND ${column} = $2 LIMIT 1`,
    [playlistId, id]
  );
  return rows.length > 0;
}

/** A follow of an email-case twin lands on the account the twin merged into. */
async function replayFollow(db: Queryable, row: PendingRecord): Promise<RowWork> {
  const followed = (await loadAccountsForLegacyUsers(db, [row.legacyId])).get(row.legacyId.trim());
  const decision = decideFollow({
    followedExists: followed !== undefined,
    isSelf: followed?.id === row.accountId,
  });
  if (decision.action === 'write' && followed !== undefined) {
    await db.query(
      `INSERT INTO account_following_account (account_id, following_account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [row.accountId, followed.id]
    );
    const mappings: LegacyMapping[] =
      followed.idText === row.legacyId
        ? [
            {
              legacyKind: 'user',
              legacyId: row.legacyId,
              v5Kind: 'account',
              v5IdText: row.legacyId,
            },
          ]
        : [];
    return work(resultFor(decision, row.status), undefined, mappings);
  }
  return work(resultFor(decision, row.status));
}

async function replayFollowPlaylist(db: Queryable, row: PendingRecord): Promise<RowWork> {
  const playlistId = await oneId(db, `SELECT id FROM playlist WHERE id_text = $1`, [row.legacyId]);
  if (playlistId === null) {
    return work(resultFor({ action: 'keep', reason: 'waiting_playlist' }, row.status));
  }
  await db.query(
    `INSERT INTO account_following_playlist (account_id, playlist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [row.accountId, playlistId]
  );
  return work({ status: 'resolved', reason: null, outcome: 'written' });
}

async function replayPlaylistClip(db: Queryable, row: PendingRecord): Promise<RowWork> {
  const playlistIdText = contextText(row.context, 'playlist_id');
  const mediaRefId = contextText(row.context, 'media_ref_id');
  const playlistId =
    playlistIdText === null
      ? null
      : await oneId(db, `SELECT id FROM playlist WHERE id_text = $1`, [playlistIdText]);
  const clipId =
    mediaRefId === null
      ? null
      : await oneId(db, `SELECT id FROM clip WHERE id_text = $1`, [mediaRefId]);
  const alreadyMember =
    playlistId !== null &&
    clipId !== null &&
    (await playlistHas(db, playlistId, 'clip_id', clipId));
  const decision = decidePlaylistClip({
    playlistExists: playlistId !== null,
    clipExists: clipId !== null,
    alreadyMember,
  });
  if (decision.action === 'write' && playlistId !== null && clipId !== null) {
    const position = await playlistSlot(db, playlistId, contextText(row.context, 'list_position'));
    await db.query(
      `INSERT INTO playlist_resource (playlist_id, list_position, clip_id) VALUES ($1, $2, $3)`,
      [playlistId, position, clipId]
    );
    await db.query(`UPDATE playlist SET item_count = COALESCE(item_count, 0) + 1 WHERE id = $1`, [
      playlistId,
    ]);
  }
  return work(resultFor(decision, row.status));
}

function playbackKey(row: PendingRecord): V4PlaybackKey {
  return {
    episodeId: contextText(row.context, 'episode_id'),
    mediaRefId: contextText(row.context, 'media_ref_id'),
    playbackPosition: contextNumber(row.context, 'playback_position'),
    mediaFileDuration: contextNumber(row.context, 'media_file_duration'),
    completed: contextFlag(row.context, 'completed'),
    orderChangedDate: contextText(row.context, 'order_changed_date'),
    queuePosition: contextNumber(row.context, 'queue_position'),
  };
}

function statementRows(result: unknown): Record<string, unknown>[] {
  if (
    Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === 'number'
  ) {
    return result[0].filter(isRecord);
  }
  if (!Array.isArray(result)) {
    return [];
  }
  return result.filter(isRecord);
}

function timeParameter(value: unknown): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  return 0;
}

function timestampParameter(value: unknown): Date | string | null {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  return null;
}

/**
 * Replaces the episode queue row with the clip, keeping that row's list position and
 * playback fields. The insert follows the delete in this transaction: one command would
 * still see the episode row's list position, so the clip could not reuse it.
 */
async function replaceItemWithClip(
  db: Queryable,
  queueId: number,
  itemId: number,
  clipId: number
): Promise<boolean> {
  const removed = statementRows(
    await db.query(
      `DELETE FROM queue_resource
       WHERE id = (
         SELECT id FROM queue_resource
         WHERE queue_id = $1 AND item_id = $2 AND clip_id IS NULL
         ORDER BY id
         LIMIT 1
       )
       RETURNING list_position::text AS list_position,
                 playback_position,
                 media_file_duration,
                 completed,
                 last_played_at`,
      [queueId, itemId]
    )
  );
  const row = removed[0];
  if (row === undefined) {
    return false;
  }
  if (typeof row.list_position !== 'string' || row.list_position.trim() === '') {
    throw new Error('Could not read the queue row being replaced.');
  }
  await db.query(
    `INSERT INTO queue_resource (
       queue_id, list_position, playback_position, media_file_duration, completed, clip_id, last_played_at
     ) VALUES ($1, $2::numeric, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING`,
    [
      queueId,
      row.list_position,
      timeParameter(row.playback_position),
      timeParameter(row.media_file_duration),
      row.completed === true,
      clipId,
      timestampParameter(row.last_played_at),
    ]
  );
  return true;
}

async function replayPlayback(
  db: Queryable,
  row: PendingRecord,
  kind: 'now_playing' | 'queue' | 'history',
  scope: AccountScope
): Promise<RowWork> {
  const key = playbackKey(row);
  const clipIds = await loadIds(
    db,
    `SELECT id, id_text FROM clip WHERE id_text = ANY($1::varchar[])`,
    key.mediaRefId === null ? [] : [key.mediaRefId]
  );
  const clipFound = key.mediaRefId !== null && clipIds.has(key.mediaRefId);
  const swap = decideClipSwap(row.reason, clipFound, contextFlag(row.context, 'item_stand_in'));
  if (swap === 'wait') {
    return work(resultFor({ action: 'keep', reason: 'clip_not_copied' }, row.status));
  }
  const outcome = await activeTarget(
    db,
    key,
    scope.snapshot,
    scope.catalog,
    scope.channelIds,
    new Map<string, number>(),
    clipIds,
    scope.statusIds.active
  );
  if (!('target' in outcome)) {
    return work(resultFor(decidePlayback({ active: false, ...outcome }), row.status));
  }
  const { target } = outcome;
  const zone = playbackZoneOf(kind);
  const queueId = await queueFor(db, scope.accountId, target.mediumId, new Map<number, number>());
  if (swap === 'swap' && target.clipId !== null) {
    const replaced = await replaceItemWithClip(db, queueId, target.episodeItemId, target.clipId);
    if (replaced) {
      return work(resultFor(decidePlayback({ active: true }), row.status));
    }
  }
  if (!(await mergePlaybackRow(db, queueId, zone, key, target))) {
    return work(resultFor({ action: 'resolve', reason: 'collapsed' }, row.status));
  }
  return work(resultFor(decidePlayback({ active: true }), row.status));
}

function episodeFor(scope: AccountScope, episodeId: string | null): V4EpisodeKey | undefined {
  return episodeId === null ? undefined : episodeById(scope.snapshot).get(episodeId);
}

/** Resolves the item for a snapshot, creating the Archived item when the rules call for one. */
async function snapshotItemId(
  db: Queryable,
  episodeId: string | null,
  scope: AccountScope,
  itemIds: Map<string, number>
): Promise<number | null> {
  const plan = decideSnapshotReattach(
    episodeDecision(episodeId, scope.snapshot, scope.catalog, 'attempted')
  );
  const episode = episodeFor(scope, episodeId);
  if (plan === 'keep' || episode === undefined) {
    return null;
  }
  if (plan === 'archive') {
    await archiveEpisode(db, episode, scope, itemIds);
  }
  return resolveItemId(db, episode, scope.snapshot, scope.catalog, scope.channelIds, itemIds);
}

async function replaySnapshotClip(
  db: Queryable,
  row: PendingRecord,
  scope: AccountScope
): Promise<RowWork> {
  const mediaRef = scope.snapshot.mediaRefs.find((entry) => entry.id === row.legacyId);
  const episodeId = contextText(row.context, 'episode_id') ?? mediaRef?.episodeId ?? null;
  const itemIds = new Map<string, number>();

  if (row.status === 'resolved') {
    const clips = await query(db, `SELECT id, item_id FROM clip WHERE id_text = $1`, [
      row.legacyId,
    ]);
    const clip = clips[0];
    if (clip === undefined) {
      return work(resultFor({ action: 'resolve', reason: 'clip_removed' }, row.status));
    }
    if (typeof clip.item_id === 'number') {
      return work(resultFor({ action: 'resolve', reason: 'reattached' }, row.status));
    }
    const itemId = await snapshotItemId(db, episodeId, scope, itemIds);
    if (itemId === null) {
      return work(resultFor({ action: 'keep', reason: 'snapshot' }, row.status));
    }
    await db.query(
      `UPDATE clip SET item_id = $2, removed_source = NULL, source_removed_at = NULL WHERE id = $1`,
      [clip.id, itemId]
    );
    return work(resultFor({ action: 'write', reason: 'reattached' }, row.status));
  }

  const clip = scope.snapshot.clips.find((entry) => entry.id === row.legacyId);
  if (clip === undefined) {
    return work(resultFor({ action: 'keep', reason: 'v4_row_missing' }, row.status));
  }
  const decision = episodeDecision(episodeId, scope.snapshot, scope.catalog, 'attempted');
  if (decideWaitingSnapshot(decision) === 'keep') {
    return work(resultFor({ action: 'keep', reason: 'waiting_parse' }, row.status));
  }
  const episode = episodeFor(scope, episodeId);
  if (decision === 'archive' && episode !== undefined) {
    await archiveEpisode(db, episode, scope, itemIds);
  }
  const pending = new PendingRows();
  const clipIds = await writeClips(
    db,
    scope.accountId,
    { ...scope.snapshot, clips: [clip] },
    scope.catalog,
    scope.channelIds,
    itemIds,
    scope.statusIds.public,
    scope.statusIds.unlisted,
    pending
  );
  const mappings: LegacyMapping[] = clipIds.has(clip.id)
    ? [{ legacyKind: 'mediaRef', legacyId: clip.id, v5Kind: 'clip', v5IdText: clip.id }]
    : [];
  return work(resultFor({ action: 'write', reason: 'replayed' }, row.status), pending, mappings);
}

async function replaySnapshotMember(
  db: Queryable,
  row: PendingRecord,
  scope: AccountScope
): Promise<RowWork> {
  const playlistIdText = contextText(row.context, 'playlist_id');
  const recordedPosition = contextText(row.context, 'list_position');
  const episodeId = contextText(row.context, 'episode_id');
  const mediaRefId = contextText(row.context, 'media_ref_id');
  const playlistId =
    playlistIdText === null
      ? null
      : await oneId(db, `SELECT id FROM playlist WHERE id_text = $1`, [playlistIdText]);
  if (playlistId === null || playlistIdText === null) {
    return work(resultFor({ action: 'resolve', reason: 'playlist_removed' }, row.status));
  }
  const itemIds = new Map<string, number>();

  if (row.status === 'resolved') {
    const snapshotId = await oneId(
      db,
      `SELECT id FROM playlist_resource
       WHERE playlist_id = $1 AND list_position = $2::numeric
         AND item_id IS NULL AND clip_id IS NULL AND item_soundbite_id IS NULL AND add_by_rss_hash_id IS NULL`,
      [playlistId, recordedPosition]
    );
    if (snapshotId === null) {
      return work(resultFor({ action: 'resolve', reason: 'member_removed' }, row.status));
    }
    const itemId = await snapshotItemId(db, episodeId, scope, itemIds);
    if (itemId === null) {
      return work(resultFor({ action: 'keep', reason: 'snapshot' }, row.status));
    }
    if (await playlistHas(db, playlistId, 'item_id', itemId)) {
      await db.query(`DELETE FROM playlist_resource WHERE id = $1`, [snapshotId]);
      await db.query(
        `UPDATE playlist SET item_count = GREATEST(COALESCE(item_count, 0) - 1, 0) WHERE id = $1`,
        [playlistId]
      );
      return work(resultFor({ action: 'resolve', reason: 'already_in_playlist' }, row.status));
    }
    await db.query(
      `UPDATE playlist_resource SET item_id = $2, removed_source = NULL, source_removed_at = NULL WHERE id = $1`,
      [snapshotId, itemId]
    );
    return work(resultFor({ action: 'write', reason: 'reattached' }, row.status));
  }

  const clipIds = await loadIds(
    db,
    `SELECT id, id_text FROM clip WHERE id_text = ANY($1::varchar[])`,
    mediaRefId === null ? [] : [mediaRefId]
  );
  const member: { kind: 'episode' | 'clip'; id: string } | null =
    episodeId !== null
      ? { kind: 'episode', id: episodeId }
      : mediaRefId !== null
        ? { kind: 'clip', id: mediaRefId }
        : null;
  if (member === null) {
    return work(resultFor({ action: 'resolve', reason: 'not_a_member' }, row.status));
  }
  if (member.kind === 'episode') {
    const decision = episodeDecision(member.id, scope.snapshot, scope.catalog, 'attempted');
    if (decideWaitingSnapshot(decision) === 'keep') {
      return work(resultFor({ action: 'keep', reason: 'waiting_parse' }, row.status));
    }
    const episode = episodeFor(scope, member.id);
    if (decision === 'archive' && episode !== undefined) {
      await archiveEpisode(db, episode, scope, itemIds);
    }
    const itemId =
      decision === 'gone'
        ? null
        : await resolveItemId(
            db,
            episode,
            scope.snapshot,
            scope.catalog,
            scope.channelIds,
            itemIds
          );
    if (itemId !== null && (await playlistHas(db, playlistId, 'item_id', itemId))) {
      return work(resultFor({ action: 'resolve', reason: 'already_in_playlist' }, row.status));
    }
  } else {
    const clipId = clipIds.get(member.id);
    if (clipId !== undefined && (await playlistHas(db, playlistId, 'clip_id', clipId))) {
      return work(resultFor({ action: 'resolve', reason: 'already_in_playlist' }, row.status));
    }
  }

  const pending = new PendingRows();
  const position = await playlistSlot(db, playlistId, recordedPosition);
  const mediaRefs = new Map<string, V4MediaRefKey>(
    scope.snapshot.mediaRefs.map((entry) => [entry.id, entry])
  );
  const wrote = await writePlaylistMember(
    db,
    { id: playlistId, idText: playlistIdText },
    position,
    member,
    scope.snapshot,
    scope.catalog,
    scope.channelIds,
    itemIds,
    clipIds,
    mediaRefs,
    pending
  );
  if (wrote) {
    await db.query(`UPDATE playlist SET item_count = COALESCE(item_count, 0) + 1 WHERE id = $1`, [
      playlistId,
    ]);
    return work(resultFor({ action: 'write', reason: 'replayed' }, row.status), pending);
  }
  if (pending.values().length > 0) {
    return work(resultFor({ action: 'keep', reason: 'waiting_parse' }, row.status), pending);
  }
  return work(resultFor({ action: 'resolve', reason: 'not_a_member' }, row.status));
}

async function replayRow(db: Queryable, row: PendingRecord, scope: AccountScope): Promise<RowWork> {
  switch (row.kind) {
    case 'follow_account':
      return replayFollow(db, row);
    case 'follow_playlist':
      return replayFollowPlaylist(db, row);
    case 'playlist_clip':
      return replayPlaylistClip(db, row);
    case 'now_playing':
    case 'queue':
    case 'history':
      return replayPlayback(db, row, row.kind, scope);
    case 'snapshot_clip':
      return replaySnapshotClip(db, row, scope);
    case 'snapshot_playlist_member':
      return replaySnapshotMember(db, row, scope);
  }
}

/**
 * Sets the row's status and reason, then upserts any rows the copy's write steps recorded,
 * which replace that status when they share the row's key.
 */
async function recordWork(db: Queryable, row: PendingRecord, rowWork: RowWork): Promise<void> {
  await db.query(`UPDATE legacy_pending_row SET status = $2, reason = $3 WHERE id = $1`, [
    row.id,
    rowWork.result.status,
    rowWork.result.reason,
  ]);
  await writePendingRows(db, row.accountId, rowWork.pending.values());
  await writeLegacyIdMap(db, rowWork.mappings);
}

function outcomeLabel(row: PendingRecord, rowWork: RowWork): string {
  const recorded = rowWork.pending
    .values()
    .find((entry) => entry.kind === row.kind && entry.legacyId === row.legacyId);
  if (recorded !== undefined && recorded.status === 'unresolved') {
    return 'kept';
  }
  if (recorded !== undefined && recorded.reason === 'snapshot') {
    return 'snapshot';
  }
  return rowWork.result.outcome;
}

/**
 * Replays rows the v4 library copy recorded in `legacy_pending_row`. Run on the same schedule
 * as `scheduledJobsRunDue` during the migration window, and once after the forced migration.
 */
export const v4ReplayLegacyRows = async (args: CommandLineArgs) => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_REPLAY_LEGACY_ROWS_HELP);
    return;
  }
  assertLocalDatabase();
  const dryRun = hasOption(args, 'dry-run');
  const limit = parseLimit(args);
  const v4Id = optionValue(args, 'v4-id');
  if (v4Id !== null && !isValidNanoIdV2IdText(v4Id)) {
    throw new Error('v4 id must be 7–15 characters.');
  }
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';

  const dataSource = getDataSourceReadWrite();
  const rows = sortForReplay(
    (await query(dataSource, PENDING_SQL, [v4Id, limit, EMAIL_CASE_TWIN_RESOLVE_KEY]))
      .map(pendingRecord)
      .filter((row): row is PendingRecord => row !== null)
  );
  const statusIds = await readStatusIds(dataSource);

  const counts: ReplayCounts = {};
  const byAccount = new Map<number, PendingRecord[]>();
  for (const row of rows) {
    const list = byAccount.get(row.accountId) ?? [];
    list.push(row);
    byAccount.set(row.accountId, list);
  }

  for (const accountRows of byAccount.values()) {
    let scope: AccountScope;
    try {
      scope = await readAccountScope(dataSource, connectionString, accountRows, statusIds);
    } catch (error) {
      for (const row of accountRows) {
        tallyReplay(counts, row.kind, 'failed');
      }
      getLogger().warn('v4 replay could not read an account scope', {
        rows: accountRows.length,
        error: error instanceof Error ? error.name : 'unknown',
      });
      continue;
    }
    for (const row of accountRows) {
      try {
        const rowWork = await dataSource.transaction(async (manager) => {
          const result = await replayRow(manager, row, scope);
          await recordWork(manager, row, result);
          if (dryRun) {
            throw new DryRunRollback(result);
          }
          return result;
        });
        tallyReplay(counts, row.kind, outcomeLabel(row, rowWork));
      } catch (error) {
        if (error instanceof DryRunRollback) {
          tallyReplay(counts, row.kind, outcomeLabel(row, error.work));
          continue;
        }
        tallyReplay(counts, row.kind, 'failed');
      }
    }
  }

  getLogger().info(dryRun ? 'v4 replay dry run finished' : 'v4 replay finished', {
    dryRun,
    rows: rows.length,
    accounts: byAccount.size,
    counts,
  });
};
