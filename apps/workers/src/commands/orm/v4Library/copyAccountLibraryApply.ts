import type { DTORemovedSource } from '@podverse/helpers';
import { DATABASE_CONSTANTS, formatGuidEnclosureUrl, getMediumEnumValue } from '@podverse/helpers';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation';
import { generateRandomIdText, getDataSourceReadWrite } from '@podverse/orm';

import type {
  LocalCatalog,
  V4EpisodeKey,
  V4LibrarySnapshot,
  V4MediaRefKey,
  V4PlaybackKey,
  V4PlaylistKey,
} from './copyAccountLibraryLib.js';
import { episodeDecision, listPositionAt, podcastChannelIdText } from './copyAccountLibraryLib.js';

type Queryable = {
  query: (sql: string, parameters?: unknown[]) => Promise<unknown>;
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
    return result.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null);
  }
  return [];
}

async function query(db: Queryable, sql: string, parameters: unknown[] = []): Promise<Record<string, unknown>[]> {
  return rowsOf(await db.query(sql, parameters));
}

async function oneId(db: Queryable, sql: string, parameters: unknown[]): Promise<number | null> {
  const rows = await query(db, sql, parameters);
  const id = rows[0]?.id;
  return typeof id === 'number' ? id : null;
}

function podcastById(snapshot: V4LibrarySnapshot): Map<string, V4LibrarySnapshot['podcasts'][number]> {
  return new Map(snapshot.podcasts.map((podcast) => [podcast.id, podcast]));
}

function episodeById(snapshot: V4LibrarySnapshot): Map<string, V4EpisodeKey> {
  return new Map(snapshot.episodes.map((episode) => [episode.id, episode]));
}

function channelIdTextForEpisode(
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
 * Writes one library. Waiting rows are left for a later pass. Queue, history, and now
 * playing are written only when the item is Active.
 */
export async function applyLibraryCopy(
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog
): Promise<{ archivedItems: number; clips: number; playlistMembers: number; playback: number }> {
  const dataSource = getDataSourceReadWrite();
  return dataSource.transaction(async (manager) => {
    const db = manager as Queryable;
    const archivedStatusId = await oneId(db, `SELECT id FROM item_flag_status WHERE status = 'archived'`, []);
    const activeStatusId = await oneId(db, `SELECT id FROM item_flag_status WHERE status = 'active'`, []);
    const publicStatusId = await oneId(db, `SELECT id FROM sharable_status WHERE status = 'public'`, []);
    const privateStatusId = await oneId(db, `SELECT id FROM sharable_status WHERE status = 'private'`, []);
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
      [...catalog.channelIdTexts, ...catalog.channelByPodcastIndexId.values(), ...catalog.channelByFeedUrl.values(), ...catalog.channelByPodcastGuid.values(), ...catalog.absorbSurvivorByPodcastIndexId.values()]
    );

    await writeFollows(db, accountId, snapshot, catalog, channelIds);
    const itemIds = new Map<string, number>();
    const archived = await writeArchivedItems(db, snapshot, catalog, channelIds, itemIds, archivedStatusId);
    const clipIds = await writeClips(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      publicStatusId,
      privateStatusId
    );
    const members = await writePlaylists(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      publicStatusId,
      privateStatusId
    );
    const playback = await writePlayback(
      db,
      accountId,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      activeStatusId
    );
    await db.query(`UPDATE account SET v4_library_copied_at = NOW() WHERE id = $1 AND v4_library_copied_at IS NULL`, [
      accountId,
    ]);
    return { archivedItems: archived, clips: clipIds.size, playlistMembers: members, playback };
  });
}

async function loadIds(db: Queryable, sql: string, idTexts: string[]): Promise<Map<string, number>> {
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

async function writeFollows(
  db: Queryable,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>
): Promise<void> {
  for (const podcast of snapshot.podcasts) {
    const channelIdText = podcastChannelIdText(podcast, catalog);
    const channelId = channelIdText === null ? undefined : channelIds.get(channelIdText);
    if (channelId === undefined) {
      continue;
    }
    if (!snapshot.podcastIds.includes(podcast.id)) {
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
  const playlistIds = await loadIds(db, `SELECT id, id_text FROM playlist WHERE id_text = ANY($1::varchar[])`, snapshot.playlistFollowIds);
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
  const accountIds = await loadIds(db, `SELECT id, id_text FROM account WHERE id_text = ANY($1::varchar[])`, snapshot.userFollowIds);
  for (const accountIdText of snapshot.userFollowIds) {
    const followedId = accountIds.get(accountIdText);
    if (followedId === undefined || followedId === accountId) {
      continue;
    }
    await db.query(
      `INSERT INTO account_following_account (account_id, following_account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [accountId, followedId]
    );
  }
}

async function writeArchivedItems(
  db: Queryable,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  archivedStatusId: number
): Promise<number> {
  let created = 0;
  for (const episode of snapshot.episodes) {
    if (episodeDecision(episode.id, snapshot, catalog) !== 'archive') {
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
      [episode.id, channelId, guid, guidEnclosure, episode.pubDate, limit(episode.title, 255), archivedStatusId]
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

async function writeClips(
  db: Queryable,
  accountId: number,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  publicStatusId: number,
  privateStatusId: number
): Promise<Map<string, number>> {
  const clipIds = await loadIds(
    db,
    `SELECT id, id_text FROM clip WHERE id_text = ANY($1::varchar[])`,
    snapshot.clips.map((clip) => clip.id)
  );
  for (const clip of snapshot.clips) {
    if (clip.official || clipIds.has(clip.id)) {
      continue;
    }
    const decision = episodeDecision(clip.episodeId, snapshot, catalog);
    if (decision === 'waiting') {
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
    }
  }
  return clipIds;
}

async function resolveItemId(
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
  privateStatusId: number
): Promise<number> {
  let members = 0;
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
    let index = 0;
    for (const member of orderedMembers(playlist)) {
      const written = await writePlaylistMember(
        db,
        playlistId,
        index,
        member,
        snapshot,
        catalog,
        channelIds,
        itemIds,
        clipIds,
        mediaRefs
      );
      if (written) {
        members += 1;
        index += 1;
      }
    }
    await db.query(`UPDATE playlist SET item_count = $2 WHERE id = $1`, [playlistId, index]);
  }
  return members;
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

async function writePlaylistMember(
  db: Queryable,
  playlistId: number,
  index: number,
  member: { kind: 'episode' | 'clip'; id: string },
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  mediaRefs: Map<string, V4MediaRefKey>
): Promise<boolean> {
  const position = listPositionAt(1, index);
  if (member.kind === 'clip') {
    const clipId = clipIds.get(member.id);
    const mediaRef = mediaRefs.get(member.id);
    if (clipId === undefined) {
      return false;
    }
    if (mediaRef?.official === true) {
      return false;
    }
    await db.query(
      `INSERT INTO playlist_resource (playlist_id, list_position, clip_id) VALUES ($1, $2, $3)`,
      [playlistId, position, clipId]
    );
    return true;
  }
  const decision = episodeDecision(member.id, snapshot, catalog);
  if (decision === 'waiting') {
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
      [playlistId, position, JSON.stringify(removedSource(episode, snapshot))]
    );
    return true;
  }
  await db.query(
    `INSERT INTO playlist_resource (playlist_id, list_position, item_id) VALUES ($1, $2, $3)`,
    [playlistId, position, itemId]
  );
  return true;
}

type PlaybackTarget = { mediumId: number; itemId: number | null; clipId: number | null };

type PlaybackZone = 'now' | 'upcoming' | 'history';

type ChosenPlayback = {
  row: V4PlaybackKey;
  target: PlaybackTarget;
  zone: PlaybackZone;
  sort: number;
};

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
  activeStatusId: number
): Promise<number> {
  const chosen = new Map<string, ChosenPlayback>();
  const consider = async (row: V4PlaybackKey, zone: PlaybackZone, sort: number): Promise<void> => {
    const target = await activeTarget(
      db,
      row,
      snapshot,
      catalog,
      channelIds,
      itemIds,
      clipIds,
      activeStatusId
    );
    if (target === null) {
      return;
    }
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
    const now = entries.filter((entry) => entry.zone === 'now').sort((left, right) => left.sort - right.sort);
    const queueRows = [
      ...now.slice(1),
      ...entries.filter((entry) => entry.zone === 'upcoming').sort((left, right) => left.sort - right.sort),
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

async function activeTarget(
  db: Queryable,
  row: V4PlaybackKey,
  snapshot: V4LibrarySnapshot,
  catalog: LocalCatalog,
  channelIds: Map<string, number>,
  itemIds: Map<string, number>,
  clipIds: Map<string, number>,
  activeStatusId: number
): Promise<PlaybackTarget | null> {
  const mediaRefId = row.mediaRefId?.trim() ?? '';
  const clipId = mediaRefId === '' ? undefined : clipIds.get(mediaRefId);
  const episodeId = row.episodeId?.trim() || snapshot.mediaRefs.find((mediaRef) => mediaRef.id === mediaRefId)?.episodeId || '';
  if (episodeDecision(episodeId === '' ? null : episodeId, snapshot, catalog) !== 'resolved') {
    return null;
  }
  const episode = episodeId === '' ? undefined : episodeById(snapshot).get(episodeId);
  const itemId = await resolveItemId(db, episode, snapshot, catalog, channelIds, itemIds);
  if (itemId === null) {
    return null;
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
    return null;
  }
  return { mediumId, itemId: clipId === undefined ? itemId : null, clipId: clipId ?? null };
}

async function queueFor(
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

async function insertPlayback(
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
