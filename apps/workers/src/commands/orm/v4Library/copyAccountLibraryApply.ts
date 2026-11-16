import type { DTORemovedSource } from '@podverse/helpers';
import {
  ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS,
  DATABASE_CONSTANTS,
  DEFAULT_MAX_ADD_BY_RSS_FEEDS,
  formatGuidEnclosureUrl,
  getMediumEnumValue,
  queueResourceMigrationTier,
} from '@podverse/helpers';
import {
  ChannelAddByRSSDirectoryMatchService,
  generateRandomIdText,
  getDataSourceReadWrite,
} from '@podverse/orm';

import type {
  AddByRssCopyPlan,
  LibraryCopyGroup,
  LibraryGroupError,
  LocalCatalog,
  MigrationCapDecision,
  PendingRowKind,
  PendingRowStatus,
  V4EpisodeKey,
  V4LibrarySnapshot,
  V4MediaRefKey,
  V4PlaybackKey,
  V4PodcastKey,
} from './copyAccountLibraryLib.js';
import {
  addByRssCopyPlan,
  addByRssFeedUrlForCopy,
  clipPointerOutcome,
  combinedDistinctCount,
  countAddByRssFeeds,
  countAddByRssNotFeedUrl,
  countDirectoryFollows,
  directoryFollowCopyPlan,
  directoryFollowTotal,
  directoryFollowWritePlan,
  EMAIL_CASE_TWIN_RESOLVE_KEY,
  episodeDecision,
  extraMatchedDirectoryChannelIds,
  libraryCopyErrorClass,
  listPositionAt,
  mergedFollowKeys,
  orderedMembers,
  playbackLegacyId,
  playbackPendingStatus,
  PLAYLIST_RESOURCE_LIMIT,
  playlistRowsSubjectToResourceLimit,
  playlistsOverLimitFromSnapshot,
  podcastChannelIdText,
  queueCopyTrimLimit,
  shouldSetLibraryCopiedAt,
  splitAddByRssUrlsByDirectoryMatch,
  subscriptionPendingStatus,
  trimQueueToResourceLimit,
  v5SharableStatusForV4,
} from './copyAccountLibraryLib.js';
import { replayedPlaybackWins, zoneOfListPosition } from './replayLegacyRowsLib.js';

export type Queryable = {
  query: (sql: string, parameters?: unknown[]) => Promise<unknown>;
};

type ReadWriteSource = ReturnType<typeof getDataSourceReadWrite>;

/** A v4 user id and the account it resolved to. */
type FollowedAccount = { legacyId: string; idText: string };

type DirectoryFollowGroupResult = {
  followedAccounts: FollowedAccount[];
  pendingRows: number;
  directoryFollowCap: DirectoryFollowCap;
};

type ArchivedItemsGroupResult = {
  archivedItems: number;
  itemIds: Map<string, number>;
};

type ClipsGroupResult = {
  clips: number;
  clipIds: Map<string, number>;
  itemIds: Map<string, number>;
  pendingRows: number;
};

type PlaylistsGroupResult = {
  playlistMembers: number;
  playlistIdTexts: string[];
  itemIds: Map<string, number>;
  pendingRows: number;
  playlistsOverLimit: string[];
};

type PlaybackGroupResult = {
  playback: number;
  itemIds: Map<string, number>;
  pendingRows: number;
  queueTier: number | null;
  queueNeedsOperator: 0 | 1;
  historyTrimmed: number;
};

type CloseLibraryCopyResult = {
  legacyIdsMapped: number;
  libraryCopiedAtSet: boolean;
};

export type AddByRssCap = {
  count: number;
  action: 'copy' | 'needs_operator' | 'membership_status_missing';
  writeTier: number | null;
  /** Distinct canonical urls matched to a directory channel. */
  addByRssMatchedToDirectory: number;
  /** Non-blank values that are not an http(s) feed URL. */
  addByRssNotFeedUrl: number;
};

export type DirectoryFollowCap = {
  count: number;
  action: 'copy' | 'needs_operator';
  decision: MigrationCapDecision;
  writeTier: number | null;
};

export type ApplyLibraryCopyResult = {
  archivedItems: number;
  clips: number;
  playlistMembers: number;
  playback: number;
  pendingRows: number;
  legacyIdsMapped: number;
  groupErrors: LibraryGroupError[];
  needsOperatorGroups: string[];
  libraryCopiedAtSet: boolean;
  /**
   * The library was merged into the account the v4 user's email-case twin kept. That
   * account's `v4_library_copied_at` belongs to its own copy and is not written.
   */
  merged: boolean;
  addByRssCap: AddByRssCap;
  directoryFollowCap: DirectoryFollowCap;
  playlistsOverLimit: string[];
  /** Tier written on `max_queue_resources`, or null when nothing was written. */
  queueTier: number | null;
  /** 1 when the largest queue is past the last tier. */
  queueNeedsOperator: 0 | 1;
  /** History rows dropped so each queue fits its tier. */
  historyTrimmed: number;
};

/** Ids and positions only. No titles, urls, or emails. */
export type PendingRowContext = Record<string, string | number | boolean | null>;

export type PendingRow = {
  kind: PendingRowKind;
  legacyId: string;
  status: PendingRowStatus;
  reason: string;
  context: PendingRowContext;
};

/**
 * Rows the copy could not finish, keyed by kind and v4 id. A later row for the same key
 * replaces the earlier one, matching the table's unique key.
 */
export class PendingRows {
  private readonly rows = new Map<string, PendingRow>();

  add(row: PendingRow): void {
    this.rows.set(`${row.kind}\n${row.legacyId}`, row);
  }

  values(): PendingRow[] {
    return [...this.rows.values()];
  }
}

type LegacyKind = 'podcast' | 'episode' | 'mediaRef' | 'playlist' | 'user';

type V5Kind = 'channel' | 'item' | 'clip' | 'playlist' | 'account';

export type LegacyMapping = {
  legacyKind: LegacyKind;
  legacyId: string;
  v5Kind: V5Kind;
  v5IdText: string;
};

const URL_LIMIT = DATABASE_CONSTANTS.varchar_url;
const URI_LIMIT = DATABASE_CONSTANTS.varchar_uri;

function limit(value: string | null | undefined, max: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function isRow(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (!Array.isArray(result)) {
    return [];
  }
  return result.filter(isRow);
}

/**
 * Rows from `UPDATE ... RETURNING`. TypeORM returns `[rows, rowCount]` for an
 * UPDATE and the row list for a SELECT.
 */
function updateReturningRows(result: unknown): Record<string, unknown>[] {
  if (
    Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === 'number'
  ) {
    return result[0].filter(isRow);
  }
  return rowsOf(result);
}

export async function query(
  db: Queryable,
  sql: string,
  parameters: unknown[] = []
): Promise<Record<string, unknown>[]> {
  return rowsOf(await db.query(sql, parameters));
}

export async function oneId(
  db: Queryable,
  sql: string,
  parameters: unknown[]
): Promise<number | null> {
  const rows = await query(db, sql, parameters);
  const id = rows[0]?.id;
  return typeof id === 'number' ? id : null;
}

const LEGACY_USER_ACCOUNT_SQL = `
SELECT wanted.legacy_id, target.id, target.id_text
FROM unnest($1::varchar[]) AS wanted(legacy_id)
INNER JOIN LATERAL (
  SELECT candidate.id, candidate.id_text
  FROM (
    SELECT 0 AS rank, a.id, a.id_text
    FROM account a
    WHERE a.id_text = wanted.legacy_id
    UNION ALL
    SELECT 1 AS rank, a.id, a.id_text
    FROM legacy_id_map m
    INNER JOIN account a ON a.id_text = m.v5_id_text
    WHERE m.legacy_kind = 'user'
      AND m.legacy_id = wanted.legacy_id
      AND m.v5_kind = 'account'
      AND m.resolve_key = $2
      AND m.status = 'mapped'
  ) candidate
  ORDER BY candidate.rank
  LIMIT 1
) target ON true
`;

const EMAIL_CASE_TWIN_IDS_SQL = `
SELECT legacy_id
FROM legacy_id_map
WHERE legacy_kind = 'user'
  AND v5_kind = 'account'
  AND resolve_key = $2
  AND status = 'mapped'
  AND legacy_id = ANY($1::text[])
`;

export type LegacyUserAccount = { id: number; idText: string };

/**
 * The account each v4 user id resolves to: the account with that id, otherwise the account
 * named by the id's email-case twin row. Ids that resolve to neither are absent.
 */
export async function loadAccountsForLegacyUsers(
  db: Queryable,
  legacyIds: readonly string[]
): Promise<Map<string, LegacyUserAccount>> {
  const wanted = [...new Set(legacyIds.map((id) => id.trim()).filter((id) => id !== ''))];
  const accounts = new Map<string, LegacyUserAccount>();
  if (wanted.length === 0) {
    return accounts;
  }
  const rows = await query(db, LEGACY_USER_ACCOUNT_SQL, [wanted, EMAIL_CASE_TWIN_RESOLVE_KEY]);
  for (const row of rows) {
    if (
      typeof row.legacy_id === 'string' &&
      typeof row.id === 'number' &&
      typeof row.id_text === 'string'
    ) {
      accounts.set(row.legacy_id, { id: row.id, idText: row.id_text });
    }
  }
  return accounts;
}

/**
 * The account a library is written to. A merge writes an email-case twin's library into the
 * account the other letter case kept.
 */
export type LibraryTarget = { accountId: number; accountIdText: string; merge: boolean };

/** The account a v4 user's library is copied into, and whether it is a merge. */
export async function resolveLibraryTarget(
  db: Queryable,
  v4Id: string
): Promise<LibraryTarget | null> {
  const account = (await loadAccountsForLegacyUsers(db, [v4Id])).get(v4Id.trim());
  if (account === undefined) {
    return null;
  }
  return { accountId: account.id, accountIdText: account.idText, merge: account.idText !== v4Id };
}

/** The v4 user ids in `v4Ids` whose library merges into an email-case twin's account. */
export async function listEmailCaseTwinIds(
  db: Queryable,
  v4Ids: readonly string[]
): Promise<Set<string>> {
  const twins = new Set<string>();
  if (v4Ids.length === 0) {
    return twins;
  }
  const rows = await query(db, EMAIL_CASE_TWIN_IDS_SQL, [[...v4Ids], EMAIL_CASE_TWIN_RESOLVE_KEY]);
  for (const row of rows) {
    if (typeof row.legacy_id === 'string') {
      twins.add(row.legacy_id);
    }
  }
  return twins;
}

function podcastById(
  snapshot: V4LibrarySnapshot
): Map<string, V4LibrarySnapshot['podcasts'][number]> {
  return new Map(snapshot.podcasts.map((podcast) => [podcast.id, podcast]));
}

export function episodeById(snapshot: V4LibrarySnapshot): Map<string, V4EpisodeKey> {
  return new Map(snapshot.episodes.map((episode) => [episode.id, episode]));
}

export function channelIdTextForEpisode(
  episode: V4EpisodeKey,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog
): string | null {
  const podcastId = episode.podcastId?.trim() ?? '';
  if (podcastId === '') {
    return null;
  }
  const podcast = podcastById(snapshot).get(podcastId);
  return podcast === undefined ? null : podcastChannelIdText(podcast, catalog);
}

function removedSource(
  episode: V4EpisodeKey | undefined,
  snapshot: V4LibrarySnapshot
): DTORemovedSource {
  const podcast =
    episode?.podcastId === null || episode?.podcastId === undefined
      ? undefined
      : podcastById(snapshot).get(episode.podcastId);
  return {
    kind: 'item',
    item_title: episode?.title ?? null,
    channel_title: podcast?.title ?? null,
    pub_date: episode?.pubDate ?? null,
    soundbite_title: null,
  };
}

/**
 * Writes one library as separate commits: directory follows, Add by RSS, archived items,
 * clips, playlists, playback, then the legacy id map. A refusal rolls back only that group.
 * Pending rows stay in the group that recorded them. `v4_library_copied_at` is set when every
 * group committed and none was left for an operator. Queue, history, and now playing are
 * written only when the item is Active.
 *
 * A merge writes into an account that already holds its own copy. Caps come from the rows
 * already there plus the merged ones, and a stored tier above that stays. Playback joins the
 * existing queues by the replay's one-row-per-item rule. `v4_library_copied_at` is not written.
 */
export async function applyLibraryCopy(
  target: LibraryTarget,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog
): Promise<ApplyLibraryCopyResult> {
  const { accountId, merge } = target;
  const dataSource = getDataSourceReadWrite();
  const reads: Queryable = {
    query: async (sql, parameters) => {
      const result: unknown = await dataSource.query(sql, [...(parameters ?? [])]);
      return result;
    },
  };
  const archivedStatusId = await oneId(
    reads,
    `SELECT id FROM item_flag_status WHERE status = 'archived'`,
    []
  );
  const activeStatusId = await oneId(
    reads,
    `SELECT id FROM item_flag_status WHERE status = 'active'`,
    []
  );
  const publicStatusId = await oneId(
    reads,
    `SELECT id FROM sharable_status WHERE status = 'public'`,
    []
  );
  const unlistedStatusId = await oneId(
    reads,
    `SELECT id FROM sharable_status WHERE status = 'unlisted'`,
    []
  );
  if (
    archivedStatusId === null ||
    activeStatusId === null ||
    publicStatusId === null ||
    unlistedStatusId === null
  ) {
    throw new Error('Missing item status or sharable status rows.');
  }

  const channelIds = await loadIds(
    reads,
    `SELECT id, id_text FROM channel WHERE id_text = ANY($1::varchar[])`,
    [
      ...catalog.channelIdTexts,
      ...catalog.channelByPodcastIndexId.values(),
      ...catalog.channelByFeedUrl.values(),
      ...catalog.channelByPodcastGuid.values(),
      ...catalog.absorbSurvivorByPodcastIndexId.values(),
    ]
  );

  const groupErrors: LibraryGroupError[] = [];
  const needsOperatorGroups: string[] = [];
  let itemIds = new Map<string, number>();
  let clipIds = new Map<string, number>();

  const directoryFollowCap = directoryFollowCapFromSnapshot(snapshot);
  const directory = await runLibraryGroup<DirectoryFollowGroupResult>(
    'directory_follow',
    groupErrors,
    () => copyDirectoryFollowGroup(dataSource, target, snapshot, catalog, channelIds),
    { followedAccounts: [], pendingRows: 0, directoryFollowCap }
  );
  if (directory.directoryFollowCap.action === 'needs_operator') {
    needsOperatorGroups.push('directory_follow');
  }
  const addByRssCap = await runLibraryGroup(
    'add_by_rss',
    groupErrors,
    () => copyAddByRssGroup(dataSource, accountId, snapshot, merge),
    {
      count: countAddByRssFeeds(snapshot.addByRssUrls),
      action: 'copy',
      writeTier: null,
      addByRssMatchedToDirectory: 0,
      addByRssNotFeedUrl: countAddByRssNotFeedUrl(snapshot.addByRssUrls),
    }
  );
  if (addByRssCap.action === 'needs_operator') {
    needsOperatorGroups.push('add_by_rss');
  } else if (addByRssCap.action === 'membership_status_missing') {
    groupErrors.push({ group: 'add_by_rss', class: 'membership_status_missing' });
  }
  const archived = await runLibraryGroup<ArchivedItemsGroupResult>(
    'archived_items',
    groupErrors,
    () =>
      copyArchivedItemsGroup(
        dataSource,
        snapshot,
        catalog,
        channelIds,
        new Map(itemIds),
        archivedStatusId
      ),
    { archivedItems: 0, itemIds }
  );
  itemIds = archived.itemIds;
  const clips = await runLibraryGroup<ClipsGroupResult>(
    'clips',
    groupErrors,
    () =>
      copyClipsGroup(
        dataSource,
        accountId,
        snapshot,
        catalog,
        channelIds,
        new Map(itemIds),
        publicStatusId,
        unlistedStatusId
      ),
    { clips: 0, pendingRows: 0, itemIds, clipIds }
  );
  itemIds = clips.itemIds;
  clipIds = clips.clipIds;
  const playlistsOverLimit = playlistsOverLimitFromSnapshot(snapshot);
  const playlists = await runLibraryGroup<PlaylistsGroupResult>(
    'playlists',
    groupErrors,
    () =>
      copyPlaylistsGroup(
        dataSource,
        accountId,
        snapshot,
        catalog,
        channelIds,
        new Map(itemIds),
        clipIds,
        publicStatusId,
        unlistedStatusId
      ),
    { playlistMembers: 0, playlistIdTexts: [], pendingRows: 0, itemIds, playlistsOverLimit }
  );
  itemIds = playlists.itemIds;
  if (playlists.playlistsOverLimit.length > 0) {
    needsOperatorGroups.push('playlists');
  }
  const playback = await runLibraryGroup<PlaybackGroupResult>(
    'playback',
    groupErrors,
    () =>
      copyPlaybackGroup(
        dataSource,
        accountId,
        snapshot,
        catalog,
        channelIds,
        new Map(itemIds),
        clipIds,
        activeStatusId,
        merge
      ),
    {
      playback: 0,
      pendingRows: 0,
      itemIds,
      queueTier: null,
      queueNeedsOperator: 0,
      historyTrimmed: 0,
    }
  );
  itemIds = playback.itemIds;
  if (playback.queueNeedsOperator === 1) {
    needsOperatorGroups.push('playback');
  }
  const closed = await runLibraryGroup<CloseLibraryCopyResult>(
    'closeout',
    groupErrors,
    () =>
      closeLibraryCopy(
        dataSource,
        target,
        snapshot,
        catalog,
        channelIds,
        itemIds,
        clipIds,
        playlists.playlistIdTexts,
        directory.followedAccounts,
        groupErrors,
        needsOperatorGroups
      ),
    { legacyIdsMapped: 0, libraryCopiedAtSet: false }
  );
  const legacyIdsMapped = closed.legacyIdsMapped;
  const libraryCopiedAtSet = closed.libraryCopiedAtSet;

  return {
    archivedItems: archived.archivedItems,
    clips: clips.clips,
    playlistMembers: playlists.playlistMembers,
    playback: playback.playback,
    pendingRows:
      directory.pendingRows + clips.pendingRows + playlists.pendingRows + playback.pendingRows,
    legacyIdsMapped,
    groupErrors,
    needsOperatorGroups,
    libraryCopiedAtSet,
    merged: merge,
    addByRssCap,
    directoryFollowCap: directory.directoryFollowCap,
    playlistsOverLimit: playlists.playlistsOverLimit,
    queueTier: playback.queueTier,
    queueNeedsOperator: playback.queueNeedsOperator,
    historyTrimmed: playback.historyTrimmed,
  };
}

/** A throw is recorded for that group. The caller keeps `empty`, and the other groups still run. */
async function runLibraryGroup<T>(
  group: LibraryCopyGroup,
  groupErrors: LibraryGroupError[],
  work: () => Promise<T>,
  empty: T
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    groupErrors.push({ group, class: libraryCopyErrorClass(error) });
    return empty;
  }
}

async function resolvedMappings(
  db: Queryable,
  input: {
    accountIdText: string;
    snapshot: V4LibrarySnapshot;
    catalog: LocalCatalog;
    channelIds: Map<string, number>;
    itemIds: Map<string, number>;
    clipIds: Map<string, number>;
    playlistIdTexts: string[];
    followedAccounts: FollowedAccount[];
  }
): Promise<LegacyMapping[]> {
  const mappings: LegacyMapping[] = [
    {
      legacyKind: 'user',
      legacyId: input.accountIdText,
      v5Kind: 'account',
      v5IdText: input.accountIdText,
    },
  ];
  for (const followed of input.followedAccounts) {
    // A follow resolved through an email-case twin already has that twin's map row.
    if (followed.legacyId !== followed.idText) {
      continue;
    }
    mappings.push({
      legacyKind: 'user',
      legacyId: followed.legacyId,
      v5Kind: 'account',
      v5IdText: followed.idText,
    });
  }
  for (const podcast of input.snapshot.podcasts) {
    const channelIdText = podcastChannelIdText(podcast, input.catalog);
    if (channelIdText !== null && input.channelIds.has(channelIdText)) {
      mappings.push({
        legacyKind: 'podcast',
        legacyId: podcast.id,
        v5Kind: 'channel',
        v5IdText: channelIdText,
      });
    }
  }
  const itemIdTexts = new Map<number, string>();
  const itemRows = await query(db, `SELECT id, id_text FROM item WHERE id = ANY($1::int[])`, [
    [...new Set(input.itemIds.values())],
  ]);
  for (const row of itemRows) {
    if (typeof row.id === 'number' && typeof row.id_text === 'string') {
      itemIdTexts.set(row.id, row.id_text);
    }
  }
  for (const [episodeId, itemId] of input.itemIds) {
    const itemIdText = itemIdTexts.get(itemId);
    if (itemIdText !== undefined) {
      mappings.push({
        legacyKind: 'episode',
        legacyId: episodeId,
        v5Kind: 'item',
        v5IdText: itemIdText,
      });
    }
  }
  for (const mediaRefId of input.clipIds.keys()) {
    mappings.push({
      legacyKind: 'mediaRef',
      legacyId: mediaRefId,
      v5Kind: 'clip',
      v5IdText: mediaRefId,
    });
  }
  for (const playlistIdText of input.playlistIdTexts) {
    mappings.push({
      legacyKind: 'playlist',
      legacyId: playlistIdText,
      v5Kind: 'playlist',
      v5IdText: playlistIdText,
    });
  }
  const unique = new Map<string, LegacyMapping>();
  for (const mapping of mappings) {
    unique.set(`${mapping.legacyKind}\n${mapping.legacyId}`, mapping);
  }
  return [...unique.values()];
}

export async function writeLegacyIdMap(
  db: Queryable,
  mappings: readonly LegacyMapping[]
): Promise<void> {
  if (mappings.length === 0) {
    return;
  }
  await db.query(
    `INSERT INTO legacy_id_map (legacy_kind, legacy_id, v5_kind, v5_id_text, status)
     SELECT legacy_kind, legacy_id, v5_kind, v5_id_text, 'mapped'
     FROM unnest($1::text[], $2::text[], $3::text[], $4::varchar[])
       AS mapping(legacy_kind, legacy_id, v5_kind, v5_id_text)
     ON CONFLICT (legacy_kind, legacy_id) DO UPDATE
       SET v5_kind = EXCLUDED.v5_kind,
           v5_id_text = EXCLUDED.v5_id_text,
           status = 'mapped'`,
    [
      mappings.map((mapping) => mapping.legacyKind),
      mappings.map((mapping) => mapping.legacyId),
      mappings.map((mapping) => mapping.v5Kind),
      mappings.map((mapping) => mapping.v5IdText),
    ]
  );
}

export async function writePendingRows(
  db: Queryable,
  accountId: number,
  rows: readonly PendingRow[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await db.query(
    `INSERT INTO legacy_pending_row (account_id, row_kind, legacy_id, context, status, reason)
     SELECT $1, row_kind, legacy_id, context::jsonb, status, reason
     FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[])
       AS pending(row_kind, legacy_id, context, status, reason)
     ON CONFLICT (account_id, row_kind, legacy_id) DO UPDATE
       SET context = EXCLUDED.context,
           status = EXCLUDED.status,
           reason = EXCLUDED.reason`,
    [
      accountId,
      rows.map((row) => row.kind),
      rows.map((row) => row.legacyId),
      rows.map((row) => JSON.stringify(row.context)),
      rows.map((row) => row.status),
      rows.map((row) => row.reason),
    ]
  );
}

export async function loadIds(
  db: Queryable,
  sql: string,
  idTexts: string[]
): Promise<Map<string, number>> {
  const unique = [...new Set(idTexts.filter((id) => id.trim() !== ''))];
  const ids = new Map<string, number>();
  if (unique.length === 0) {
    return ids;
  }
  const rows = await query(db, sql, [unique]);
  for (const row of rows) {
    if (typeof row.id_text === 'string' && typeof row.id === 'number') {
      ids.set(row.id_text, row.id);
    }
  }
  return ids;
}

const EXISTING_FOLLOW_KEYS_SQL = `
SELECT 'channel:' || channel_id::text AS key
FROM account_following_channel
WHERE account_id = $1
UNION ALL
SELECT 'playlist:' || p.id_text
FROM account_following_playlist f
INNER JOIN playlist p ON p.id = f.playlist_id
WHERE f.account_id = $1
UNION ALL
SELECT 'account:' || following_account_id::text
FROM account_following_account
WHERE account_id = $1
UNION ALL
SELECT CASE WHEN row_kind = 'follow_playlist' THEN 'playlist:' ELSE row_kind || ':' END || legacy_id
FROM legacy_pending_row
WHERE account_id = $1
  AND row_kind IN ('subscription', 'follow_playlist', 'follow_account')
`;

/**
 * The count the follow tier covers. A single copy counts the v4 ids. A merge counts the
 * account's follows and pending follows together with the merged ones, each once.
 */
async function directoryFollowCount(
  db: Queryable,
  target: LibraryTarget,
  snapshot: V4LibrarySnapshot,
  podcastChannels: ReadonlyArray<{ legacyId: string; channelId: number | null }>,
  extra: readonly number[],
  users: ReadonlyMap<string, LegacyUserAccount>
): Promise<number> {
  if (!target.merge) {
    return directoryFollowTotal({
      podcastIds: snapshot.podcastIds,
      playlistFollowIds: snapshot.playlistFollowIds,
      userFollowIds: snapshot.userFollowIds,
      extraMatchedChannelIds: extra,
    });
  }
  const existing = await query(db, EXISTING_FOLLOW_KEYS_SQL, [target.accountId]);
  const userIds = [...new Set(snapshot.userFollowIds.map((id) => id.trim()))].filter(
    (id) => id !== ''
  );
  return combinedDistinctCount(
    existing.map((row) => row.key).filter((key): key is string => typeof key === 'string'),
    mergedFollowKeys({
      podcasts: podcastChannels,
      extraChannelIds: extra,
      playlistFollowIds: snapshot.playlistFollowIds,
      users: userIds.map((legacyId) => ({
        legacyId,
        accountId: users.get(legacyId)?.id ?? null,
      })),
      selfAccountId: target.accountId,
    })
  );
}

/** Each distinct v4 podcast id and the local channel it resolves to, or null. */
function podcastChannelsFor(
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: ReadonlyMap<string, number>
): Array<{ legacyId: string; podcast: V4PodcastKey | undefined; channelId: number | null }> {
  const podcasts = podcastById(snapshot);
  const resolved: Array<{
    legacyId: string;
    podcast: V4PodcastKey | undefined;
    channelId: number | null;
  }> = [];
  const seen = new Set<string>();
  for (const podcastId of snapshot.podcastIds) {
    const legacyId = podcastId.trim();
    if (legacyId === '' || seen.has(legacyId)) {
      continue;
    }
    seen.add(legacyId);
    const podcast = podcasts.get(legacyId);
    const channelIdText = podcast === undefined ? null : podcastChannelIdText(podcast, catalog);
    const channelId = channelIdText === null ? undefined : channelIds.get(channelIdText);
    resolved.push({ legacyId, podcast, channelId: channelId ?? null });
  }
  return resolved;
}

/**
 * Channel, playlist, and account follows, plus matched Add by RSS channels, plus pending rows.
 * The tier is written first. A count past 10000 still inserts every follow and reports
 * needs_operator. A missing membership row does not stop the inserts. A followed v4 user
 * resolves to its own account or to the account its email-case twin kept; a follow of the
 * account itself is skipped.
 */
async function copyDirectoryFollowGroup(
  dataSource: ReadWriteSource,
  target: LibraryTarget,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>
): Promise<DirectoryFollowGroupResult> {
  const { accountId } = target;
  const matched = splitAddByRssUrlsByDirectoryMatch(
    snapshot.addByRssUrls,
    await directoryChannelIdByAddByRssUrl(snapshot.addByRssUrls)
  );
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const storedRows = await query(
      db,
      `SELECT max_follows
       FROM account_membership_status
       WHERE account_id = $1
       FOR UPDATE`,
      [accountId]
    );
    const storedRow = storedRows[0];
    const stored = storedRow === undefined ? null : storedFollowLimit(storedRow.max_follows);
    const pending = new PendingRows();
    const podcastChannels = podcastChannelsFor(snapshot, catalog, channelIds);
    const podcastChannelIds = new Set<number>();
    const channelInserts: number[] = [];
    for (const { legacyId, podcast, channelId } of podcastChannels) {
      if (channelId === null) {
        pending.add({
          kind: 'subscription',
          legacyId,
          context: {},
          ...subscriptionPendingStatus(podcast),
        });
        continue;
      }
      podcastChannelIds.add(channelId);
      channelInserts.push(channelId);
    }
    const extra = extraMatchedDirectoryChannelIds(matched.directoryChannelIds, podcastChannelIds);
    const accounts = await loadAccountsForLegacyUsers(db, snapshot.userFollowIds);
    const count = await directoryFollowCount(
      db,
      target,
      snapshot,
      podcastChannels,
      extra,
      accounts
    );
    const plan = directoryFollowWritePlan(count, stored);
    if (plan.writeTier !== null) {
      await db.query(
        `UPDATE account_membership_status
         SET max_follows = $2
         WHERE account_id = $1
           AND max_follows IS DISTINCT FROM -1
           AND (max_follows IS NULL OR max_follows < $2)`,
        [accountId, plan.writeTier]
      );
    }
    for (const channelId of channelInserts) {
      await db.query(
        `INSERT INTO account_following_channel (account_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [accountId, channelId]
      );
    }
    await insertDirectoryChannelFollows(db, accountId, extra);
    const directoryFollowCap: DirectoryFollowCap = {
      count,
      action: plan.action,
      decision: plan.decision,
      writeTier: plan.writeTier,
    };
    const playlistIds = await loadIds(
      db,
      `SELECT id, id_text FROM playlist WHERE id_text = ANY($1::varchar[])`,
      snapshot.playlistFollowIds
    );
    for (const playlistIdText of snapshot.playlistFollowIds) {
      const legacyId = playlistIdText.trim();
      if (legacyId === '') {
        continue;
      }
      const playlistId = playlistIds.get(playlistIdText);
      if (playlistId === undefined) {
        pending.add({
          kind: 'follow_playlist',
          legacyId,
          status: 'unresolved',
          reason: 'waiting_playlist',
          context: {},
        });
        continue;
      }
      await db.query(
        `INSERT INTO account_following_playlist (account_id, playlist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [accountId, playlistId]
      );
    }
    const followedAccounts: FollowedAccount[] = [];
    for (const accountIdText of snapshot.userFollowIds) {
      const legacyId = accountIdText.trim();
      if (legacyId === '') {
        continue;
      }
      const followed = accounts.get(legacyId);
      if (followed === undefined) {
        pending.add({
          kind: 'follow_account',
          legacyId,
          status: 'unresolved',
          reason: 'account_not_copied',
          context: {},
        });
        continue;
      }
      if (followed.id === accountId) {
        continue;
      }
      await db.query(
        `INSERT INTO account_following_account (account_id, following_account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [accountId, followed.id]
      );
      followedAccounts.push({ legacyId, idText: followed.idText });
    }
    const rows = pending.values();
    await writePendingRows(db, accountId, rows);
    return { followedAccounts, pendingRows: rows.length, directoryFollowCap };
  });
}

/** Count and tier for the log, from the snapshot ids alone. */
export function directoryFollowCapFromSnapshot(snapshot: V4LibrarySnapshot): DirectoryFollowCap {
  const count = countDirectoryFollows({
    podcastIds: snapshot.podcastIds,
    playlistFollowIds: snapshot.playlistFollowIds,
    userFollowIds: snapshot.userFollowIds,
  });
  const plan = directoryFollowCopyPlan(count);
  return { count, action: plan.action, decision: plan.decision, writeTier: plan.writeTier };
}

/** Same tier the copy would write, including matched Add by RSS channels and the stored column. */
export async function readDirectoryFollowCap(
  db: Queryable,
  target: LibraryTarget,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog
): Promise<DirectoryFollowCap> {
  const matched = splitAddByRssUrlsByDirectoryMatch(
    snapshot.addByRssUrls,
    await directoryChannelIdByAddByRssUrl(snapshot.addByRssUrls)
  );
  const podcasts = podcastById(snapshot);
  const channelIdTexts: string[] = [];
  for (const podcastId of new Set(snapshot.podcastIds)) {
    const legacyId = podcastId.trim();
    if (legacyId === '') {
      continue;
    }
    const podcast = podcasts.get(legacyId);
    const channelIdText = podcast === undefined ? null : podcastChannelIdText(podcast, catalog);
    if (channelIdText !== null) {
      channelIdTexts.push(channelIdText);
    }
  }
  const channelIds = await loadIds(
    db,
    `SELECT id, id_text FROM channel WHERE id_text = ANY($1::varchar[])`,
    channelIdTexts
  );
  const extra = extraMatchedDirectoryChannelIds(
    matched.directoryChannelIds,
    new Set(channelIds.values())
  );
  const count = await directoryFollowCount(
    db,
    target,
    snapshot,
    podcastChannelsFor(snapshot, catalog, channelIds),
    extra,
    target.merge
      ? await loadAccountsForLegacyUsers(db, snapshot.userFollowIds)
      : new Map<string, LegacyUserAccount>()
  );
  const storedRows = await query(
    db,
    `SELECT max_follows FROM account_membership_status WHERE account_id = $1`,
    [target.accountId]
  );
  const storedRow = storedRows[0];
  const stored = storedRow === undefined ? null : storedFollowLimit(storedRow.max_follows);
  const plan = directoryFollowWritePlan(count, stored);
  return {
    count,
    action: plan.action,
    decision: plan.decision,
    writeTier: plan.writeTier,
  };
}

function storedFollowLimit(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function integerOrNull(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function addByRssMembershipStored(rows: readonly Record<string, unknown>[]): {
  statusRowExists: boolean;
  stored: number | null;
} {
  const row = rows[0];
  if (row === undefined) {
    return { statusRowExists: false, stored: null };
  }
  return { statusRowExists: true, stored: integerOrNull(row.max_add_by_rss_feeds) };
}

function addByRssCapFromPlan(
  count: number,
  plan: AddByRssCopyPlan,
  addByRssMatchedToDirectory: number,
  addByRssNotFeedUrl: number
): AddByRssCap {
  if (plan.action !== 'copy') {
    return {
      count,
      action: plan.action,
      writeTier: null,
      addByRssMatchedToDirectory,
      addByRssNotFeedUrl,
    };
  }
  return {
    count,
    action: 'copy',
    writeTier: plan.writeTier,
    addByRssMatchedToDirectory,
    addByRssNotFeedUrl,
  };
}

type AddByRssDirectorySplit = {
  directoryChannelIds: number[];
  addByRssUrls: string[];
  count: number;
  addByRssMatchedToDirectory: number;
};

function addByRssDirectorySplit(
  urls: readonly string[],
  matchedChannelIdByUrl: ReadonlyMap<string, number>
): AddByRssDirectorySplit {
  const split = splitAddByRssUrlsByDirectoryMatch(urls, matchedChannelIdByUrl);
  const count = split.addByRssUrls.length;
  return {
    directoryChannelIds: split.directoryChannelIds,
    addByRssUrls: split.addByRssUrls,
    count,
    addByRssMatchedToDirectory: countAddByRssFeeds(urls) - count,
  };
}

/**
 * Directory channel id for each add-by-RSS url the directory match accepts.
 * The key is the canonical url `splitAddByRssUrlsByDirectoryMatch` looks up.
 * Reads in chunks and sends no guid.
 */
export async function directoryChannelIdByAddByRssUrl(
  urls: readonly string[]
): Promise<Map<string, number>> {
  const matched = new Map<string, number>();
  if (urls.length === 0) {
    return matched;
  }
  const service = new ChannelAddByRSSDirectoryMatchService();
  for (let index = 0; index < urls.length; index += ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS) {
    const chunk = urls.slice(index, index + ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS);
    const found = await service.getForFeedUrls(
      chunk.map((feedUrl) => ({ feedUrl, feedGuid: null }))
    );
    for (const url of chunk) {
      const row = found.get(url);
      if (row === undefined) {
        continue;
      }
      const canonical = addByRssFeedUrlForCopy(url);
      if (canonical === null || matched.has(canonical)) {
        continue;
      }
      matched.set(canonical, row.channel.id);
    }
  }
  return matched;
}

/**
 * The feed count the Add by RSS tier covers. A merge counts the account's feeds together
 * with the merged ones, each once.
 */
async function addByRssCount(
  db: Queryable,
  accountId: number,
  split: AddByRssDirectorySplit,
  merge: boolean
): Promise<number> {
  if (!merge) {
    return split.count;
  }
  const rows = await query(
    db,
    `SELECT feed_url FROM account_following_add_by_rss_channel WHERE account_id = $1`,
    [accountId]
  );
  return combinedDistinctCount(
    rows.map((row) => row.feed_url).filter((url): url is string => typeof url === 'string'),
    split.addByRssUrls
  );
}

/**
 * Unlocked read of the stored Add by RSS cap.
 * The tier uses the urls left after directory matches.
 */
export async function readAddByRssCap(
  db: Queryable,
  accountId: number,
  urls: readonly string[],
  merge: boolean
): Promise<AddByRssCap> {
  const split = addByRssDirectorySplit(urls, await directoryChannelIdByAddByRssUrl(urls));
  const count = await addByRssCount(db, accountId, split, merge);
  const rows = await query(
    db,
    `SELECT max_add_by_rss_feeds
     FROM account_membership_status
     WHERE account_id = $1`,
    [accountId]
  );
  const { statusRowExists, stored } = addByRssMembershipStored(rows);
  return addByRssCapFromPlan(
    count,
    addByRssCopyPlan(count, stored, statusRowExists),
    split.addByRssMatchedToDirectory,
    countAddByRssNotFeedUrl(urls)
  );
}

async function insertAddByRssFeeds(
  db: Queryable,
  accountId: number,
  urls: readonly string[]
): Promise<void> {
  for (const url of urls) {
    const feedUrl = addByRssFeedUrlForCopy(url);
    if (feedUrl === null) {
      continue;
    }
    await db.query(
      `INSERT INTO account_following_add_by_rss_channel (account_id, feed_url) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [accountId, feedUrl]
    );
  }
}

async function insertDirectoryChannelFollows(
  db: Queryable,
  accountId: number,
  channelIds: readonly number[]
): Promise<void> {
  for (const channelId of channelIds) {
    await db.query(
      `INSERT INTO account_following_channel (account_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [accountId, channelId]
    );
  }
}

/**
 * Add by RSS follows, directory follows for matched urls, and the stored feed cap.
 * This group records no pending rows.
 */
async function copyAddByRssGroup(
  dataSource: ReadWriteSource,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  merge: boolean
): Promise<AddByRssCap> {
  const split = addByRssDirectorySplit(
    snapshot.addByRssUrls,
    await directoryChannelIdByAddByRssUrl(snapshot.addByRssUrls)
  );
  const addByRssNotFeedUrl = countAddByRssNotFeedUrl(snapshot.addByRssUrls);
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const rows = await query(
      db,
      `SELECT max_add_by_rss_feeds
       FROM account_membership_status
       WHERE account_id = $1
       FOR UPDATE`,
      [accountId]
    );
    const { statusRowExists, stored } = addByRssMembershipStored(rows);
    const count = await addByRssCount(db, accountId, split, merge);
    const plan = addByRssCopyPlan(count, stored, statusRowExists);
    if (plan.action === 'needs_operator' || plan.action === 'membership_status_missing') {
      return addByRssCapFromPlan(count, plan, split.addByRssMatchedToDirectory, addByRssNotFeedUrl);
    }
    if (plan.clearStored) {
      await db.query(
        `UPDATE account_membership_status
         SET max_add_by_rss_feeds = NULL
         WHERE account_id = $1
           AND max_add_by_rss_feeds IS NOT NULL
           AND max_add_by_rss_feeds <= $2
           AND max_add_by_rss_feeds < $3
         RETURNING account_id`,
        [accountId, DEFAULT_MAX_ADD_BY_RSS_FEEDS, count]
      );
    } else if (plan.writeTier !== null) {
      const updated = updateReturningRows(
        await db.query(
          `UPDATE account_membership_status
           SET max_add_by_rss_feeds = $2
           WHERE account_id = $1
             AND (max_add_by_rss_feeds IS NULL OR max_add_by_rss_feeds < $2)
           RETURNING account_id`,
          [accountId, plan.writeTier]
        )
      );
      if (updated.length === 0) {
        return {
          count,
          action: 'membership_status_missing',
          writeTier: plan.writeTier,
          addByRssMatchedToDirectory: split.addByRssMatchedToDirectory,
          addByRssNotFeedUrl,
        };
      }
    }
    await insertDirectoryChannelFollows(db, accountId, split.directoryChannelIds);
    await insertAddByRssFeeds(db, accountId, split.addByRssUrls);
    return addByRssCapFromPlan(count, plan, split.addByRssMatchedToDirectory, addByRssNotFeedUrl);
  });
}

async function copyArchivedItemsGroup(
  dataSource: ReadWriteSource,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  archivedStatusId: number
): Promise<ArchivedItemsGroupResult> {
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const archivedItems = await writeArchivedItems(
      db,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      archivedStatusId
    );
    return { archivedItems, itemIds };
  });
}

async function copyClipsGroup(
  dataSource: ReadWriteSource,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  publicStatusId: number,
  unlistedStatusId: number
): Promise<ClipsGroupResult> {
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const pending = new PendingRows();
    const clipIds = await writeClips(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      publicStatusId,
      unlistedStatusId,
      pending
    );
    const rows = pending.values();
    await writePendingRows(db, accountId, rows);
    return {
      clips: snapshot.clips.filter((clip) => clipIds.has(clip.id)).length,
      clipIds,
      itemIds,
      pendingRows: rows.length,
    };
  });
}

async function copyPlaylistsGroup(
  dataSource: ReadWriteSource,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  publicStatusId: number,
  unlistedStatusId: number
): Promise<PlaylistsGroupResult> {
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const pending = new PendingRows();
    const written = await writePlaylists(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      publicStatusId,
      unlistedStatusId,
      pending
    );
    const rows = pending.values();
    await writePendingRows(db, accountId, rows);
    return {
      playlistMembers: written.members,
      playlistIdTexts: written.playlistIdTexts,
      itemIds,
      pendingRows: rows.length,
      playlistsOverLimit: written.playlistsOverLimit,
    };
  });
}

async function copyPlaybackGroup(
  dataSource: ReadWriteSource,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  activeStatusId: number,
  merge: boolean
): Promise<PlaybackGroupResult> {
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const pending = new PendingRows();
    const playback = await writePlayback(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      activeStatusId,
      pending,
      merge
    );
    const rows = pending.values();
    await writePendingRows(db, accountId, rows);
    return {
      playback: playback.written,
      itemIds,
      pendingRows: rows.length,
      queueTier: playback.queueTier,
      queueNeedsOperator: playback.queueNeedsOperator,
      historyTrimmed: playback.historyTrimmed,
    };
  });
}

/**
 * Writes the legacy id map, then sets `v4_library_copied_at` when the copy closed. A merge
 * never sets it: the column records the account's own copy.
 */
async function closeLibraryCopy(
  dataSource: ReadWriteSource,
  target: LibraryTarget,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  playlistIdTexts: string[],
  followedAccounts: FollowedAccount[],
  groupErrors: readonly { class: string }[],
  needsOperatorGroups: readonly string[]
): Promise<CloseLibraryCopyResult> {
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const mappings = await resolvedMappings(db, {
      accountIdText: target.accountIdText,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      playlistIdTexts,
      followedAccounts,
    });
    await writeLegacyIdMap(db, mappings);
    const libraryCopiedAtSet =
      !target.merge && shouldSetLibraryCopiedAt({ groupErrors, needsOperatorGroups });
    if (libraryCopiedAtSet) {
      await db.query(
        `UPDATE account SET v4_library_copied_at = NOW() WHERE id = $1 AND v4_library_copied_at IS NULL`,
        [target.accountId]
      );
    }
    return { legacyIdsMapped: mappings.length, libraryCopiedAtSet };
  });
}

export async function writeArchivedItems(
  db: Queryable,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  archivedStatusId: number
): Promise<number> {
  let created = 0;
  for (const episode of snapshot.episodes) {
    if (episodeDecision(episode.id, snapshot, catalog, 'attempted') !== 'archive') {
      continue;
    }
    if (itemIds.has(episode.id)) {
      continue;
    }
    const channelIdText = channelIdTextForEpisode(episode, snapshot, catalog);
    const channelId = channelIdText === null ? undefined : channelIds.get(channelIdText);
    if (channelId === undefined) {
      continue;
    }
    const guid = limit(episode.guid, DATABASE_CONSTANTS.varchar_uri);
    const enclosure = limit(episode.mediaUrl, URL_LIMIT);
    const guidEnclosure = enclosure === null ? null : formatGuidEnclosureUrl(enclosure);
    if (guid === null && guidEnclosure === null) {
      continue;
    }
    const inserted = await query(
      db,
      `INSERT INTO item (id_text, channel_id, guid, guid_enclosure_url, pub_date, title, item_flag_status_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id_text) DO NOTHING
       RETURNING id`,
      [
        episode.id,
        channelId,
        guid,
        guidEnclosure,
        episode.pubDate,
        limit(episode.title, 255),
        archivedStatusId,
      ]
    );
    const itemId = typeof inserted[0]?.id === 'number' ? inserted[0].id : null;
    if (itemId === null) {
      const existing = await oneId(db, `SELECT id FROM item WHERE id_text = $1`, [episode.id]);
      if (existing !== null) {
        itemIds.set(episode.id, existing);
      }
      continue;
    }
    itemIds.set(episode.id, itemId);
    created += 1;
    if (enclosure !== null) {
      const enclosureRows = await query(
        db,
        `INSERT INTO item_enclosure (item_id, type, item_enclosure_default) VALUES ($1, 'audio/mpeg', true) RETURNING id`,
        [itemId]
      );
      const enclosureId = enclosureRows[0]?.id;
      if (typeof enclosureId === 'number') {
        await db.query(
          `INSERT INTO item_enclosure_source (item_enclosure_id, uri) VALUES ($1, $2)`,
          [enclosureId, limit(enclosure, URI_LIMIT)]
        );
      }
    }
  }
  return created;
}

export async function writeClips(
  db: Queryable,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  publicStatusId: number,
  unlistedStatusId: number,
  pending: PendingRows
): Promise<Map<string, number>> {
  const clipIds = await loadIds(
    db,
    `SELECT id, id_text FROM clip WHERE id_text = ANY($1::varchar[])`,
    [...snapshot.clips, ...snapshot.mediaRefs].map((clip) => clip.id)
  );
  for (const clip of snapshot.clips) {
    if (clip.official || clipIds.has(clip.id)) {
      continue;
    }
    const context: PendingRowContext = { episode_id: clip.episodeId };
    const decision = episodeDecision(clip.episodeId, snapshot, catalog, 'attempted');
    if (decision === 'waiting') {
      pending.add({
        kind: 'snapshot_clip',
        legacyId: clip.id,
        status: 'unresolved',
        reason: 'waiting_parse',
        context,
      });
      continue;
    }
    const episode = clip.episodeId === null ? undefined : episodeById(snapshot).get(clip.episodeId);
    const itemId =
      decision === 'resolved' || decision === 'archive'
        ? await resolveItemId(db, episode, snapshot, catalog, channelIds, itemIds)
        : null;
    const source = itemId === null ? removedSource(episode, snapshot) : null;
    const inserted = await query(
      db,
      `INSERT INTO clip (
         id_text, account_id, item_id, start_time, end_time, title, sharable_status_id, removed_source, source_removed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8::jsonb IS NULL THEN NULL ELSE NOW() END)
       ON CONFLICT (id_text) DO NOTHING
       RETURNING id`,
      [
        clip.id,
        accountId,
        itemId,
        clip.startTime ?? 0,
        clip.endTime ?? null,
        limit(clip.title, 255),
        v5SharableStatusForV4(clip.isPublic) === 'public' ? publicStatusId : unlistedStatusId,
        source === null ? null : JSON.stringify(source),
      ]
    );
    const clipId = typeof inserted[0]?.id === 'number' ? inserted[0].id : null;
    if (clipId === null) {
      const existing = await oneId(db, `SELECT id FROM clip WHERE id_text = $1`, [clip.id]);
      if (existing !== null) {
        clipIds.set(clip.id, existing);
      }
      continue;
    }
    clipIds.set(clip.id, clipId);
    if (source !== null) {
      pending.add({
        kind: 'snapshot_clip',
        legacyId: clip.id,
        status: 'resolved',
        reason: 'snapshot',
        context,
      });
    }
  }
  return clipIds;
}

export async function resolveItemId(
  db: Queryable,
  episode: V4EpisodeKey | undefined,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>
): Promise<number | null> {
  if (episode === undefined) {
    return null;
  }
  const cached = itemIds.get(episode.id);
  if (cached !== undefined) {
    return cached;
  }
  const channelIdText = channelIdTextForEpisode(episode, snapshot, catalog);
  const channelId = channelIdText === null ? undefined : channelIds.get(channelIdText);
  if (channelId === undefined) {
    return null;
  }
  const enclosure = limit(episode.mediaUrl, URL_LIMIT);
  const rows = await query(
    db,
    `SELECT i.id
     FROM item i
     WHERE i.channel_id = $1
       AND (
         i.id_text = $2
         OR ($3::varchar IS NOT NULL AND i.guid = $3)
         OR ($4::varchar IS NOT NULL AND i.guid_enclosure_url_digest = decode(md5($4), 'hex'))
         OR (
           $5::varchar IS NOT NULL
           AND $6::timestamptz IS NOT NULL
           AND i.title = $5
           AND date_trunc('second', i.pub_date) = date_trunc('second', $6::timestamptz)
         )
       )
     LIMIT 1`,
    [
      channelId,
      episode.id,
      limit(episode.guid, DATABASE_CONSTANTS.varchar_uri),
      enclosure === null ? null : formatGuidEnclosureUrl(enclosure),
      limit(episode.title, 255),
      episode.pubDate,
    ]
  );
  const id = rows[0]?.id;
  if (typeof id !== 'number') {
    return null;
  }
  itemIds.set(episode.id, id);
  return id;
}

async function writePlaylists(
  db: Queryable,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  publicStatusId: number,
  unlistedStatusId: number,
  pending: PendingRows
): Promise<{ members: number; playlistIdTexts: string[]; playlistsOverLimit: string[] }> {
  let members = 0;
  const playlistIdTexts: string[] = [];
  const playlistsOverLimit: string[] = [];
  const mediaRefs = new Map(snapshot.mediaRefs.map((mediaRef) => [mediaRef.id, mediaRef]));
  for (const playlist of snapshot.playlists) {
    if (playlistRowsSubjectToResourceLimit(playlist, mediaRefs) > PLAYLIST_RESOURCE_LIMIT) {
      playlistsOverLimit.push(playlist.id);
      continue;
    }
    const mediumId = getMediumEnumValue(playlist.medium ?? null);
    const likesTaken =
      playlist.isDefault === true
        ? await oneId(
            db,
            `SELECT id FROM playlist WHERE account_id = $1 AND medium_id = $2 AND is_default_likes IS TRUE AND id_text <> $3`,
            [accountId, mediumId, playlist.id]
          )
        : null;
    await db.query(
      `INSERT INTO playlist (id_text, account_id, sharable_status_id, title, description, is_default_likes, medium_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id_text) DO NOTHING`,
      [
        playlist.id,
        accountId,
        v5SharableStatusForV4(playlist.isPublic) === 'public' ? publicStatusId : unlistedStatusId,
        limit(playlist.title, 255),
        limit(playlist.description, 2500),
        playlist.isDefault === true && likesTaken === null,
        mediumId,
      ]
    );
    const playlistId = await oneId(db, `SELECT id FROM playlist WHERE id_text = $1`, [playlist.id]);
    if (playlistId === null) {
      continue;
    }
    playlistIdTexts.push(playlist.id);
    let written = 0;
    // Every member keeps its own slot, so a member recorded as pending can be inserted at its
    // v4 place later without moving the others.
    for (const [index, member] of orderedMembers(playlist).entries()) {
      const wrote = await writePlaylistMember(
        db,
        { id: playlistId, idText: playlist.id },
        listPositionAt(1, index),
        member,
        snapshot,
        catalog,
        channelIds,
        itemIds,
        clipIds,
        mediaRefs,
        pending
      );
      if (wrote) {
        written += 1;
      }
    }
    members += written;
    await db.query(`UPDATE playlist SET item_count = $2 WHERE id = $1`, [playlistId, written]);
  }
  return { members, playlistIdTexts, playlistsOverLimit };
}

/**
 * Writes one member and reports whether that member is on the playlist. A row that is already
 * present stays. An official clip, or a mediaRef v4 no longer has, is not a member and is not
 * recorded.
 */
export async function writePlaylistMember(
  db: Queryable,
  playlist: { id: number; idText: string },
  position: string,
  member: { kind: 'episode' | 'clip'; id: string },
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  mediaRefs: Map<string, V4MediaRefKey>,
  pending: PendingRows
): Promise<boolean> {
  const legacyId = `${playlist.idText}:${member.id}`;
  if (member.kind === 'clip') {
    const clipId = clipIds.get(member.id);
    const mediaRef = mediaRefs.get(member.id);
    if (mediaRef === undefined || mediaRef.official) {
      return false;
    }
    if (clipId === undefined) {
      const context: PendingRowContext = {
        playlist_id: playlist.idText,
        list_position: position,
        media_ref_id: member.id,
      };
      if (mediaRef.owned) {
        pending.add({
          kind: 'snapshot_playlist_member',
          legacyId,
          status: 'unresolved',
          reason: 'waiting_parse',
          context,
        });
      } else {
        pending.add({
          kind: 'playlist_clip',
          legacyId,
          status: 'unresolved',
          reason: 'owner_not_copied',
          context,
        });
      }
      return false;
    }
    await db.query(
      `INSERT INTO playlist_resource (playlist_id, list_position, clip_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [playlist.id, position, clipId]
    );
    return true;
  }
  const context: PendingRowContext = {
    playlist_id: playlist.idText,
    list_position: position,
    episode_id: member.id,
  };
  const decision = episodeDecision(member.id, snapshot, catalog, 'attempted');
  if (decision === 'waiting') {
    pending.add({
      kind: 'snapshot_playlist_member',
      legacyId,
      status: 'unresolved',
      reason: 'waiting_parse',
      context,
    });
    return false;
  }
  const episode = episodeById(snapshot).get(member.id);
  const itemId =
    decision === 'gone'
      ? null
      : await resolveItemId(db, episode, snapshot, catalog, channelIds, itemIds);
  if (itemId === null) {
    await db.query(
      `INSERT INTO playlist_resource (playlist_id, list_position, removed_source, source_removed_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [playlist.id, position, JSON.stringify(removedSource(episode, snapshot))]
    );
    pending.add({
      kind: 'snapshot_playlist_member',
      legacyId,
      status: 'resolved',
      reason: 'snapshot',
      context,
    });
    return true;
  }
  await db.query(
    `INSERT INTO playlist_resource (playlist_id, list_position, item_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [playlist.id, position, itemId]
  );
  return true;
}

export type PlaybackTarget = {
  mediumId: number;
  /** Stored on the queue row when the row is not a clip. */
  itemId: number | null;
  clipId: number | null;
  /** Active item for the episode, including when the queue row stores the clip instead. */
  episodeItemId: number;
};

type PlaybackZone = 'now' | 'upcoming' | 'history';

type ChosenPlayback = {
  row: V4PlaybackKey;
  target: PlaybackTarget;
  zone: PlaybackZone;
  sort: number;
};

export type PlaybackOutcome =
  { target: PlaybackTarget } | { status: PendingRowStatus; reason: string };

const PENDING_KIND_BY_ZONE: Record<PlaybackZone, PendingRowKind> = {
  now: 'now_playing',
  upcoming: 'queue',
  history: 'history',
};

export function playbackContext(row: V4PlaybackKey): PendingRowContext {
  return {
    episode_id: row.episodeId,
    media_ref_id: row.mediaRefId,
    playback_position: row.playbackPosition ?? null,
    media_file_duration: row.mediaFileDuration ?? null,
    completed: row.completed === true,
    order_changed_date: row.orderChangedDate ?? null,
    queue_position: row.queuePosition ?? null,
  };
}

function trimmedId(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function allPlaybackRows(snapshot: V4LibrarySnapshot): V4PlaybackKey[] {
  return [...snapshot.queue, ...snapshot.history, ...snapshot.nowPlaying];
}

/** Episode ids named by a playback row that does not also name a mediaRef. */
function episodeIdsWithoutMediaRef(snapshot: V4LibrarySnapshot): Set<string> {
  const ids = new Set<string>();
  for (const row of allPlaybackRows(snapshot)) {
    if (trimmedId(row.mediaRefId) !== null) {
      continue;
    }
    const episodeId = trimmedId(row.episodeId);
    if (episodeId !== null) {
      ids.add(episodeId);
    }
  }
  return ids;
}

function playbackResourceKey(target: PlaybackTarget): string {
  return target.clipId !== null ? `clip:${target.clipId}` : `item:${target.itemId ?? ''}`;
}

/** Resource keys already in each of the account's queues, by medium. */
async function existingQueueKeys(
  db: Queryable,
  accountId: number
): Promise<Map<number, ReadonlySet<string>>> {
  const rows = await query(
    db,
    `SELECT q.medium_id, r.id, r.item_id, r.clip_id
     FROM queue_resource r
     INNER JOIN queue q ON q.id = r.queue_id
     WHERE q.account_id = $1`,
    [accountId]
  );
  const byMedium = new Map<number, Set<string>>();
  for (const row of rows) {
    if (typeof row.medium_id !== 'number') {
      continue;
    }
    const clipId = integerOrNull(row.clip_id);
    const itemId = integerOrNull(row.item_id);
    const key =
      clipId !== null
        ? `clip:${clipId}`
        : itemId !== null
          ? `item:${itemId}`
          : `row:${String(row.id)}`;
    const keys = byMedium.get(row.medium_id) ?? new Set<string>();
    keys.add(key);
    byMedium.set(row.medium_id, keys);
  }
  return byMedium;
}

/** Now playing first, then the upcoming queue, then history oldest first. */
function mergeOrder(
  entries: readonly ChosenPlayback[]
): Array<{ entry: ChosenPlayback; zone: PlaybackZone }> {
  const inZone = (zone: PlaybackZone): ChosenPlayback[] =>
    entries.filter((entry) => entry.zone === zone).sort((left, right) => left.sort - right.sort);
  const placed =
    (zone: PlaybackZone) =>
    (entry: ChosenPlayback): { entry: ChosenPlayback; zone: PlaybackZone } => ({ entry, zone });
  const now = inZone('now');
  return [
    ...now.slice(0, 1).map(placed('now')),
    ...now.slice(1).map(placed('upcoming')),
    ...inZone('upcoming').map(placed('upcoming')),
    ...inZone('history').map(placed('history')),
  ];
}

export const LIST_POSITION_STEP = '0.00000001';

/**
 * Upcoming rows go after the last upcoming row; a second now-playing row goes before the first.
 * History is placed by play time between its neighbors, oldest lowest.
 */
export async function queueSlot(
  db: Queryable,
  queueId: number,
  zone: PlaybackZone,
  playedAt: string | null
): Promise<string> {
  let sql: string;
  let parameters: unknown[];
  if (zone === 'now') {
    sql = `SELECT CASE
             WHEN NOT EXISTS (SELECT 1 FROM queue_resource WHERE queue_id = $1 AND list_position = 0) THEN 0
             WHEN min(list_position) IS NULL THEN 1
             WHEN min(list_position) - $2::numeric > 0 THEN min(list_position) - $2::numeric
             ELSE min(list_position) / 2
           END::text AS position
           FROM queue_resource WHERE queue_id = $1 AND list_position > 0`;
    parameters = [queueId, LIST_POSITION_STEP];
  } else if (zone === 'upcoming') {
    sql = `SELECT COALESCE(max(list_position) + $2::numeric, 1)::text AS position
           FROM queue_resource WHERE queue_id = $1 AND list_position > 0`;
    parameters = [queueId, LIST_POSITION_STEP];
  } else {
    sql = `WITH older AS (
             SELECT max(list_position) AS p FROM queue_resource
             WHERE queue_id = $1 AND list_position < 0
               AND $2::timestamptz IS NOT NULL AND last_played_at <= $2::timestamptz
           ), newer AS (
             SELECT min(q.list_position) AS p FROM queue_resource q, older
             WHERE q.queue_id = $1 AND q.list_position < 0 AND q.list_position > COALESCE(older.p, -10)
           )
           SELECT (CASE
             WHEN older.p IS NULL AND newer.p IS NULL THEN -1
             WHEN older.p IS NULL THEN newer.p - $3::numeric
             WHEN newer.p IS NULL AND older.p + $3::numeric < 0 THEN older.p + $3::numeric
             WHEN newer.p IS NULL THEN older.p / 2
             ELSE (older.p + newer.p) / 2
           END)::text AS position
           FROM older, newer`;
    parameters = [queueId, playedAt, LIST_POSITION_STEP];
  }
  const rows = await query(db, sql, parameters);
  const position = rows[0]?.position;
  if (typeof position !== 'string') {
    throw new Error('Could not place the queue row.');
  }
  return position;
}

/**
 * Adds one playback row to a queue that may already hold the same item or clip. The row that
 * ranks higher stays: now playing, then the upcoming queue, then the newer play. Returns false
 * when the queue's row stays.
 */
export async function mergePlaybackRow(
  db: Queryable,
  queueId: number,
  zone: PlaybackZone,
  row: V4PlaybackKey,
  target: PlaybackTarget
): Promise<boolean> {
  const existing = await query(
    db,
    `SELECT id, list_position::text AS list_position, last_played_at
     FROM queue_resource
     WHERE queue_id = $1
       AND (($2::int IS NOT NULL AND item_id = $2) OR ($3::int IS NOT NULL AND clip_id = $3))
     LIMIT 1`,
    [queueId, target.itemId, target.clipId]
  );
  const current = existing[0];
  if (current !== undefined) {
    const playedAt =
      current.last_played_at instanceof Date ? current.last_played_at.toISOString() : null;
    const position = typeof current.list_position === 'string' ? current.list_position : '0';
    const wins = replayedPlaybackWins(
      { zone, playedAt: row.orderChangedDate ?? null },
      { zone: zoneOfListPosition(position), playedAt }
    );
    if (!wins) {
      return false;
    }
    await db.query(`DELETE FROM queue_resource WHERE id = $1`, [current.id]);
  }
  const position = await queueSlot(db, queueId, zone, row.orderChangedDate ?? null);
  await insertPlayback(db, queueId, position, row, target);
  return true;
}

/**
 * One queue holds one row per item and one per clip. Now playing wins, then the upcoming
 * queue, then the newest history row. Extra v4 rows for that same item are not inserted.
 * Clips this account did not write are loaded once, so a playback mediaRef can point at
 * another account's clip. A merge adds the rows to the account's queues through
 * `mergePlaybackRow`; the queue cap covers both sets, each resource once.
 */
async function writePlayback(
  db: Queryable,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  activeStatusId: number,
  pending: PendingRows,
  merge: boolean
): Promise<{
  written: number;
  queueTier: number | null;
  queueNeedsOperator: 0 | 1;
  historyTrimmed: number;
}> {
  const mediaRefIds: string[] = [];
  const seenMediaRefIds = new Set<string>();
  for (const row of allPlaybackRows(snapshot)) {
    const mediaRefId = trimmedId(row.mediaRefId);
    if (mediaRefId === null || clipIds.has(mediaRefId) || seenMediaRefIds.has(mediaRefId)) {
      continue;
    }
    seenMediaRefIds.add(mediaRefId);
    mediaRefIds.push(mediaRefId);
  }
  const foundClips = await loadIds(
    db,
    `SELECT id, id_text FROM clip WHERE id_text = ANY($1::varchar[])`,
    mediaRefIds
  );
  const playbackClipIds = new Map(clipIds);
  for (const [idText, id] of foundClips) {
    playbackClipIds.set(idText, id);
  }
  const mediaRefs = new Map(snapshot.mediaRefs.map((mediaRef) => [mediaRef.id, mediaRef]));
  const episodesWithoutMediaRef = episodeIdsWithoutMediaRef(snapshot);
  const chosen = new Map<string, ChosenPlayback>();
  const consider = async (row: V4PlaybackKey, zone: PlaybackZone, sort: number): Promise<void> => {
    const outcome = await activeTarget(
      db,
      row,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      playbackClipIds,
      activeStatusId
    );
    if (!('target' in outcome)) {
      const legacyId = playbackLegacyId(row);
      if (legacyId !== null) {
        pending.add({
          kind: PENDING_KIND_BY_ZONE[zone],
          legacyId,
          ...outcome,
          context: playbackContext(row),
        });
      }
      return;
    }
    const { target } = outcome;
    const mediaRefId = trimmedId(row.mediaRefId);
    if (target.clipId === null && mediaRefId !== null) {
      const mediaRef = mediaRefs.get(mediaRefId);
      const pointer = clipPointerOutcome(mediaRefId, mediaRef, false);
      if (pointer.kind === 'stand_in') {
        const episodeId = trimmedId(row.episodeId) ?? trimmedId(mediaRef?.episodeId);
        pending.add({
          kind: PENDING_KIND_BY_ZONE[zone],
          legacyId: mediaRefId,
          status: pointer.status,
          reason: pointer.reason,
          context: {
            ...playbackContext(row),
            item_stand_in: episodeId === null || !episodesWithoutMediaRef.has(episodeId),
          },
        });
      }
    }
    const key = `${target.mediumId}:${playbackResourceKey(target)}`;
    const existing = chosen.get(key);
    if (existing !== undefined && !playbackWins(zone, sort, existing)) {
      return;
    }
    chosen.set(key, { row, target, zone, sort });
  };

  const upcoming = [...snapshot.queue].sort(
    (left, right) => (left.queuePosition ?? 0) - (right.queuePosition ?? 0)
  );
  for (const [index, row] of upcoming.entries()) {
    await consider(row, 'upcoming', index);
  }
  for (const row of snapshot.history) {
    const time = Date.parse(row.orderChangedDate ?? '');
    await consider(row, 'history', Number.isNaN(time) ? 0 : time);
  }
  for (const [index, row] of snapshot.nowPlaying.entries()) {
    await consider(row, 'now', index);
  }

  const byMedium = new Map<number, ChosenPlayback[]>();
  for (const entry of chosen.values()) {
    const list = byMedium.get(entry.target.mediumId) ?? [];
    list.push(entry);
    byMedium.set(entry.target.mediumId, list);
  }

  const present = merge
    ? await existingQueueKeys(db, accountId)
    : new Map<number, ReadonlySet<string>>();
  let largest = 0;
  for (const [mediumId, entries] of byMedium) {
    const keys = present.get(mediumId);
    const size =
      keys === undefined
        ? entries.length
        : combinedDistinctCount(
            keys,
            entries.map((entry) => playbackResourceKey(entry.target))
          );
    if (size > largest) {
      largest = size;
    }
  }
  const decision = queueResourceMigrationTier(largest);
  const storedRows = await query(
    db,
    `SELECT max_queue_resources
     FROM account_membership_status
     WHERE account_id = $1
     FOR UPDATE`,
    [accountId]
  );
  const storedRow = storedRows[0];
  const stored = storedRow === undefined ? null : storedFollowLimit(storedRow.max_queue_resources);
  let queueTier: number | null = null;
  if (decision.outcome === 'tier' && (stored === null || stored < decision.tier)) {
    const updated = updateReturningRows(
      await db.query(
        `UPDATE account_membership_status
         SET max_queue_resources = $2
         WHERE account_id = $1
           AND (max_queue_resources IS NULL OR max_queue_resources < $2)
         RETURNING max_queue_resources`,
        [accountId, decision.tier]
      )
    );
    if (updated.length > 0) {
      queueTier = decision.tier;
    }
  }
  const limit = queueCopyTrimLimit(stored, decision);
  const queueNeedsOperator = decision.outcome === 'needs_operator' ? 1 : 0;

  let written = 0;
  let historyTrimmed = 0;
  const queues = new Map<number, number>();
  if (byMedium.size > 0) {
    await db.query(`SET LOCAL podverse.queue_limit_bulk = 'on'`);
  }
  for (const [mediumId, entries] of byMedium) {
    const queueId = await queueFor(db, accountId, mediumId, queues);
    const keys = present.get(mediumId);
    if (keys !== undefined) {
      const fresh = entries.filter((entry) => !keys.has(playbackResourceKey(entry.target)));
      const shared = entries.filter((entry) => keys.has(playbackResourceKey(entry.target)));
      const trimmed = trimQueueToResourceLimit(fresh, Math.max(0, limit - keys.size));
      historyTrimmed += trimmed.historyTrimmed;
      for (const { entry, zone } of mergeOrder([...shared, ...trimmed.kept])) {
        if (await mergePlaybackRow(db, queueId, zone, entry.row, entry.target)) {
          written += 1;
        }
      }
      continue;
    }
    const trimmed = trimQueueToResourceLimit(entries, limit);
    historyTrimmed += trimmed.historyTrimmed;
    const now = trimmed.kept
      .filter((entry) => entry.zone === 'now')
      .sort((left, right) => left.sort - right.sort);
    const queueRows = [
      ...now.slice(1),
      ...trimmed.kept
        .filter((entry) => entry.zone === 'upcoming')
        .sort((left, right) => left.sort - right.sort),
    ];
    const history = trimmed.kept
      .filter((entry) => entry.zone === 'history')
      .sort((left, right) => left.sort - right.sort);
    if (now[0] !== undefined) {
      await insertPlayback(db, queueId, '0', now[0].row, now[0].target);
      written += 1;
    }
    for (const [index, entry] of queueRows.entries()) {
      await insertPlayback(db, queueId, listPositionAt(1, index), entry.row, entry.target);
      written += 1;
    }
    for (const [index, entry] of history.entries()) {
      await insertPlayback(db, queueId, listPositionAt(-1, index), entry.row, entry.target);
      written += 1;
    }
  }
  if (byMedium.size > 0) {
    await db.query(`SET LOCAL podverse.queue_limit_bulk = 'off'`);
  }
  return { written, queueTier, queueNeedsOperator, historyTrimmed };
}

function playbackWins(zone: PlaybackZone, sort: number, existing: ChosenPlayback): boolean {
  const rank: Record<PlaybackZone, number> = { history: 1, upcoming: 2, now: 3 };
  if (rank[zone] !== rank[existing.zone]) {
    return rank[zone] > rank[existing.zone];
  }
  if (zone === 'history') {
    return sort > existing.sort;
  }
  return sort < existing.sort;
}

export async function activeTarget(
  db: Queryable,
  row: V4PlaybackKey,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  activeStatusId: number
): Promise<PlaybackOutcome> {
  const mediaRefId = row.mediaRefId?.trim() ?? '';
  const clipId = mediaRefId === '' ? undefined : clipIds.get(mediaRefId);
  const episodeId =
    row.episodeId?.trim() ||
    snapshot.mediaRefs.find((mediaRef) => mediaRef.id === mediaRefId)?.episodeId ||
    '';
  const decision = episodeDecision(
    episodeId === '' ? null : episodeId,
    snapshot,
    catalog,
    'settled'
  );
  const notWritten = playbackPendingStatus(decision);
  if (notWritten !== null) {
    return notWritten;
  }
  const episode = episodeId === '' ? undefined : episodeById(snapshot).get(episodeId);
  const itemId = await resolveItemId(db, episode, snapshot, catalog, channelIds, itemIds);
  if (itemId === null) {
    return { status: 'unresolved', reason: 'item_not_found' };
  }
  const rows = await query(
    db,
    `SELECT c.medium_id
     FROM item i
     INNER JOIN channel c ON c.id = i.channel_id
     WHERE i.id = $1 AND i.item_flag_status_id = $2`,
    [itemId, activeStatusId]
  );
  const mediumId = rows[0]?.medium_id;
  if (typeof mediumId !== 'number') {
    const channelIdText =
      episode === undefined ? null : channelIdTextForEpisode(episode, snapshot, catalog);
    const settled = channelIdText !== null && catalog.settledChannelIdTexts.has(channelIdText);
    return { status: settled ? 'dropped' : 'unresolved', reason: 'item_not_active' };
  }
  return {
    target: {
      mediumId,
      itemId: clipId === undefined ? itemId : null,
      clipId: clipId ?? null,
      episodeItemId: itemId,
    },
  };
}

export async function queueFor(
  db: Queryable,
  accountId: number,
  mediumId: number,
  queues: Map<number, number>
): Promise<number> {
  const cached = queues.get(mediumId);
  if (cached !== undefined) {
    return cached;
  }
  const existing = await oneId(
    db,
    `SELECT id FROM queue WHERE account_id = $1 AND medium_id = $2`,
    [accountId, mediumId]
  );
  if (existing !== null) {
    queues.set(mediumId, existing);
    return existing;
  }
  const inserted = await query(
    db,
    `INSERT INTO queue (id_text, account_id, medium_id, is_active_queue) VALUES ($1, $2, $3, true) RETURNING id`,
    [generateRandomIdText(), accountId, mediumId]
  );
  const id = inserted[0]?.id;
  if (typeof id !== 'number') {
    throw new Error('Could not create the account queue.');
  }
  queues.set(mediumId, id);
  return id;
}

export async function insertPlayback(
  db: Queryable,
  queueId: number,
  position: string,
  row: V4PlaybackKey,
  target: PlaybackTarget
): Promise<void> {
  await db.query(
    `INSERT INTO queue_resource (
       queue_id, list_position, playback_position, media_file_duration, completed, item_id, clip_id, last_played_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING`,
    [
      queueId,
      position,
      row.playbackPosition ?? 0,
      row.mediaFileDuration ?? 0,
      row.completed === true,
      target.itemId,
      target.clipId,
      row.orderChangedDate,
    ]
  );
}
