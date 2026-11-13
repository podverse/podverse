import type { DTORemovedSource } from '@podverse/helpers';
import { DATABASE_CONSTANTS, formatGuidEnclosureUrl, getMediumEnumValue } from '@podverse/helpers';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation';
import { generateRandomIdText, getDataSourceReadWrite } from '@podverse/orm';

import type {
  LocalCatalog,
  PendingRowKind,
  PendingRowStatus,
  V4EpisodeKey,
  V4LibrarySnapshot,
  V4MediaRefKey,
  V4PlaybackKey,
  V4PlaylistKey,
} from './copyAccountLibraryLib.js';
import {
  episodeDecision,
  listPositionAt,
  playbackLegacyId,
  playbackPendingStatus,
  podcastChannelIdText,
  subscriptionPendingStatus,
} from './copyAccountLibraryLib.js';

export type Queryable = {
  query: (sql: string, parameters?: unknown[]) => Promise<unknown>;
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

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result.filter(
      (row): row is Record<string, unknown> => typeof row === 'object' && row !== null
    );
  }
  return [];
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
 * Writes one library. A row the copy cannot finish is recorded in `legacy_pending_row` for a
 * later replay, and every v4 id it resolved is upserted into `legacy_id_map`, in the same
 * transaction. Queue, history, and now playing are written only when the item is Active.
 */
export async function applyLibraryCopy(
  accountId: number,
  accountIdText: string,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog
): Promise<{
  archivedItems: number;
  clips: number;
  playlistMembers: number;
  playback: number;
  pendingRows: number;
  legacyIdsMapped: number;
}> {
  const dataSource = getDataSourceReadWrite();
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const archivedStatusId = await oneId(
      db,
      `SELECT id FROM item_flag_status WHERE status = 'archived'`,
      []
    );
    const activeStatusId = await oneId(
      db,
      `SELECT id FROM item_flag_status WHERE status = 'active'`,
      []
    );
    const publicStatusId = await oneId(
      db,
      `SELECT id FROM sharable_status WHERE status = 'public'`,
      []
    );
    const privateStatusId = await oneId(
      db,
      `SELECT id FROM sharable_status WHERE status = 'private'`,
      []
    );
    if (
      archivedStatusId === null ||
      activeStatusId === null ||
      publicStatusId === null ||
      privateStatusId === null
    ) {
      throw new Error('Missing item status or sharable status rows.');
    }

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

    const pending = new PendingRows();
    const followedAccounts = await writeFollows(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      pending
    );
    const itemIds = new Map<string, number>();
    const archived = await writeArchivedItems(
      db,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      archivedStatusId
    );
    const clipIds = await writeClips(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      publicStatusId,
      privateStatusId,
      pending
    );
    const { members, playlistIdTexts } = await writePlaylists(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      publicStatusId,
      privateStatusId,
      pending
    );
    const playback = await writePlayback(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      activeStatusId,
      pending
    );
    const mappings = await resolvedMappings(db, {
      accountIdText,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      playlistIdTexts,
      followedAccounts,
    });
    await writeLegacyIdMap(db, mappings);
    const pendingRows = pending.values();
    await writePendingRows(db, accountId, pendingRows);
    await db.query(
      `UPDATE account SET v4_library_copied_at = NOW() WHERE id = $1 AND v4_library_copied_at IS NULL`,
      [accountId]
    );
    return {
      archivedItems: archived,
      clips: snapshot.clips.filter((clip) => clipIds.has(clip.id)).length,
      playlistMembers: members,
      playback,
      pendingRows: pendingRows.length,
      legacyIdsMapped: mappings.length,
    };
  });
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
    followedAccounts: string[];
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
    mappings.push({
      legacyKind: 'user',
      legacyId: followed,
      v5Kind: 'account',
      v5IdText: followed,
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

/** Returns the followed account ids that are local and were written. */
async function writeFollows(
  db: Queryable,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  pending: PendingRows
): Promise<string[]> {
  const podcasts = podcastById(snapshot);
  for (const podcastId of new Set(snapshot.podcastIds)) {
    const legacyId = podcastId.trim();
    if (legacyId === '') {
      continue;
    }
    const podcast = podcasts.get(legacyId);
    const channelIdText = podcast === undefined ? null : podcastChannelIdText(podcast, catalog);
    const channelId = channelIdText === null ? undefined : channelIds.get(channelIdText);
    if (channelId === undefined) {
      pending.add({
        kind: 'subscription',
        legacyId,
        context: {},
        ...subscriptionPendingStatus(podcast),
      });
      continue;
    }
    await db.query(
      `INSERT INTO account_following_channel (account_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [accountId, channelId]
    );
  }
  for (const url of snapshot.addByRssUrls) {
    const feedUrl = limit(canonicalAddByRSSFeedUrl(url) ?? url, URL_LIMIT);
    if (feedUrl === null) {
      continue;
    }
    await db.query(
      `INSERT INTO account_following_add_by_rss_channel (account_id, feed_url) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [accountId, feedUrl]
    );
  }
  const playlistIds = await loadIds(
    db,
    `SELECT id, id_text FROM playlist WHERE id_text = ANY($1::varchar[])`,
    snapshot.playlistFollowIds
  );
  for (const playlistIdText of snapshot.playlistFollowIds) {
    const playlistId = playlistIds.get(playlistIdText);
    if (playlistId === undefined) {
      continue;
    }
    await db.query(
      `INSERT INTO account_following_playlist (account_id, playlist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [accountId, playlistId]
    );
  }
  const accountIds = await loadIds(
    db,
    `SELECT id, id_text FROM account WHERE id_text = ANY($1::varchar[])`,
    snapshot.userFollowIds
  );
  const followed: string[] = [];
  for (const accountIdText of snapshot.userFollowIds) {
    const legacyId = accountIdText.trim();
    if (legacyId === '') {
      continue;
    }
    const followedId = accountIds.get(accountIdText);
    if (followedId === undefined) {
      pending.add({
        kind: 'follow_account',
        legacyId,
        status: 'unresolved',
        reason: 'account_not_copied',
        context: {},
      });
      continue;
    }
    if (followedId === accountId) {
      continue;
    }
    await db.query(
      `INSERT INTO account_following_account (account_id, following_account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [accountId, followedId]
    );
    followed.push(accountIdText);
  }
  return followed;
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
  privateStatusId: number,
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
        clip.isPublic === false ? privateStatusId : publicStatusId,
        source === null ? null : JSON.stringify(source),
      ]
    );
    const clipId = typeof inserted[0]?.id === 'number' ? inserted[0].id : null;
    if (clipId !== null) {
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
         OR ($4::varchar IS NOT NULL AND i.guid_enclosure_url = $4)
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
  privateStatusId: number,
  pending: PendingRows
): Promise<{ members: number; playlistIdTexts: string[] }> {
  let members = 0;
  const playlistIdTexts: string[] = [];
  const mediaRefs = new Map(snapshot.mediaRefs.map((mediaRef) => [mediaRef.id, mediaRef]));
  for (const playlist of snapshot.playlists) {
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
        playlist.isPublic === false ? privateStatusId : publicStatusId,
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
  return { members, playlistIdTexts };
}

function orderedMembers(playlist: V4PlaylistKey): Array<{ kind: 'episode' | 'clip'; id: string }> {
  const episodes = new Set(playlist.episodeIds);
  const clips = new Set(playlist.mediaRefIds);
  const ordered: Array<{ kind: 'episode' | 'clip'; id: string }> = [];
  const seen = new Set<string>();
  const push = (kind: 'episode' | 'clip', id: string): void => {
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    ordered.push({ kind, id });
  };
  for (const id of playlist.orderIds) {
    if (episodes.has(id)) {
      push('episode', id);
    } else if (clips.has(id)) {
      push('clip', id);
    }
  }
  for (const id of playlist.episodeIds) {
    push('episode', id);
  }
  for (const id of playlist.mediaRefIds) {
    push('clip', id);
  }
  return ordered;
}

/**
 * Writes one member and reports whether a `playlist_resource` row was inserted. An official
 * clip, or a mediaRef v4 no longer has, is not a member and is not recorded.
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
      `INSERT INTO playlist_resource (playlist_id, list_position, clip_id) VALUES ($1, $2, $3)`,
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
       VALUES ($1, $2, $3::jsonb, NOW())`,
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
    `INSERT INTO playlist_resource (playlist_id, list_position, item_id) VALUES ($1, $2, $3)`,
    [playlist.id, position, itemId]
  );
  return true;
}

export type PlaybackTarget = { mediumId: number; itemId: number | null; clipId: number | null };

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

/**
 * One queue holds one row per item and one per clip. Now playing wins, then the upcoming
 * queue, then the newest history row. Extra v4 rows for that same item are not inserted.
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
  pending: PendingRows
): Promise<number> {
  const chosen = new Map<string, ChosenPlayback>();
  const consider = async (row: V4PlaybackKey, zone: PlaybackZone, sort: number): Promise<void> => {
    const outcome = await activeTarget(
      db,
      row,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
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
    const resourceKey =
      target.clipId !== null ? `clip:${target.clipId}` : `item:${target.itemId ?? ''}`;
    const key = `${target.mediumId}:${resourceKey}`;
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

  let written = 0;
  const queues = new Map<number, number>();
  for (const [mediumId, entries] of byMedium) {
    const queueId = await queueFor(db, accountId, mediumId, queues);
    const now = entries
      .filter((entry) => entry.zone === 'now')
      .sort((left, right) => left.sort - right.sort);
    const queueRows = [
      ...now.slice(1),
      ...entries
        .filter((entry) => entry.zone === 'upcoming')
        .sort((left, right) => left.sort - right.sort),
    ];
    const history = entries
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
  return written;
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
    target: { mediumId, itemId: clipId === undefined ? itemId : null, clipId: clipId ?? null },
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
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
