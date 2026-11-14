import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';

import {
  Account,
  getDataSourceReadWrite,
  getV4MigrationFeedSettledByFeedId,
  isValidNanoIdV2IdText,
} from '@podverse/orm';

import type {
  AddByRssCap,
  ApplyLibraryCopyResult,
  DirectoryFollowCap,
} from './copyAccountLibraryApply.js';
import {
  applyLibraryCopy,
  directoryFollowCapFromSnapshot,
  readAddByRssCap,
} from './copyAccountLibraryApply.js';
import type {
  LibraryCopyReport,
  LocalCatalog,
  V4EpisodeKey,
  V4LibrarySnapshot,
  V4MediaRefKey,
  V4PlaybackKey,
  V4PlaylistKey,
  V4PodcastKey,
} from './copyAccountLibraryLib.js';
import {
  classifyLibraryCopy,
  matchedChannelIdTexts,
  parsePodcastIndexId,
  playlistsOverLimitFromSnapshot,
} from './copyAccountLibraryLib.js';

export const V4_COPY_ACCOUNT_LIBRARY_HELP = `v4CopyAccountLibrary

Copy one v4 library into the local v5 database. --dry-run writes nothing,
including v4_library_copied_at. Without it, the copy writes resolved rows,
archived items, and snapshots. A clip or playlist member with no item after
its feed parse has finished or failed is archived or snapshotted, not left
waiting. Queue, history, and now playing wait until the feed is settled: a
parse finished, or the migration retries are used up. Every row the copy
cannot finish is recorded in legacy_pending_row for a later replay, and each
v4 id it resolved is recorded in legacy_id_map. Each group commits on its own:
directory follows, Add by RSS, archived items, clips, playlists, and playback.
A refusal in one group rolls that group back and the other groups stay.
v4_library_copied_at is set only when every group committed and none was left
for an operator. Apply refuses unless DB_HOST is local.

Flags:
  --v4-id id    v4 users.id (required)
  --dry-run     Count only
  --help        Show this text

Requires V4_DATABASE_URL plus the Base and ORM worker env. The v5 account must
already exist and v4_library_copied_at must be null.

The log is the id and counts. No email, url, or title is logged.
  resolved      a local row already matches, or the playlist owner is local
  unresolved    waits on a show the seed parses, or on another account's copy
  archivedItem  the episode left its feed; the copy creates an Archived item
  snapshot      no v5 show or episode will exist; the clip or playlist row
                keeps the v4 titles and dates in removed_source
  notSeeded     a subscription to a podcast the seed skips
  dropped       not copied. Queue, history, and now playing keep only
                episodes still in a feed of a settled show
  pending       rows recorded in legacy_pending_row (overlaps the others)

Add by RSS over the default writes the smallest tier on max_add_by_rss_feeds
before the feed rows when no stored number already covers the count. At or
under the default, a stored number below the count is set to null and 100 is
not written. A stored number that already covers the count is left unchanged,
including a number above 10000. Past 10000, when no stored number covers the
count, the copy writes no Add by RSS rows and reports needs_operator. The copy
never writes a number above 10000.

Directory follows over the default are logged with the tier that would be
stored. No directory-follow column is written. Past 10000 copies no directory
follows and reports needs_operator. The account's other groups still copy.

A playlist that would hold more than 10000 resources is not copied and is
reported needs_operator. Other playlists on that account still copy. The copy
does not keep the first 10000 members.
`;

const USER_SQL = `
SELECT "subscribedPodcastIds" AS podcast_ids,
       "subscribedPlaylistIds" AS playlist_ids,
       "subscribedUserIds" AS user_ids,
       "addByRSSPodcastFeedUrls" AS add_by_rss_urls
FROM users
WHERE id = $1
`;

const PLAYLIST_SQL = `
SELECT id,
       "itemsOrder" AS items_order,
       title,
       description,
       ("isPublic" IS TRUE) AS is_public,
       ("isDefault" IS TRUE) AS is_default,
       medium::text AS medium
FROM playlists
WHERE "ownerId" = $1
`;

const PLAYLIST_EPISODE_SQL = `
SELECT "playlistsId" AS playlist_id, "episodesId" AS episode_id
FROM playlists_episodes_episodes
WHERE "playlistsId" = ANY($1::varchar[])
`;

const PLAYLIST_MEDIA_REF_SQL = `
SELECT "playlistsId" AS playlist_id, "mediaRefsId" AS media_ref_id
FROM playlists_media_refs_media_refs
WHERE "playlistsId" = ANY($1::varchar[])
`;

const QUEUE_SQL = `
SELECT "episodeId" AS episode_id,
       "mediaRefId" AS media_ref_id,
       "queuePosition" AS queue_position
FROM "userQueueItems"
WHERE "ownerId" = $1
`;

const HISTORY_SQL = `
SELECT "episodeId" AS episode_id,
       "mediaRefId" AS media_ref_id,
       "userPlaybackPosition" AS playback_position,
       "mediaFileDuration" AS media_file_duration,
       completed,
       "orderChangedDate" AS order_changed_date
FROM "userHistoryItems"
WHERE "ownerId" = $1
`;

const NOW_PLAYING_SQL = `
SELECT "episodeId" AS episode_id,
       "mediaRefId" AS media_ref_id,
       "userPlaybackPosition" AS playback_position
FROM "userNowPlayingItems"
WHERE "ownerId" = $1
`;

const MEDIA_REF_SQL = `
SELECT id,
       "episodeId" AS episode_id,
       ("isOfficialChapter" IS TRUE OR "isOfficialSoundBite" IS TRUE) AS official,
       ("ownerId" = $1) AS owned,
       title,
       "startTime" AS start_time,
       "endTime" AS end_time,
       ("isPublic" IS TRUE) AS is_public
FROM "mediaRefs"
WHERE "ownerId" = $1
   OR id = ANY($2::varchar[])
`;

const MEDIA_REF_BY_ID_SQL = `
SELECT id,
       "episodeId" AS episode_id,
       ("isOfficialChapter" IS TRUE OR "isOfficialSoundBite" IS TRUE) AS official,
       ("ownerId" = $1) AS owned,
       title,
       "startTime" AS start_time,
       "endTime" AS end_time,
       ("isPublic" IS TRUE) AS is_public
FROM "mediaRefs"
WHERE id = ANY($2::varchar[])
`;

const EPISODE_SQL = `
SELECT id,
       "podcastId" AS podcast_id,
       guid,
       "mediaUrl" AS media_url,
       title,
       "pubDate" AS pub_date,
       ("isPublic" IS TRUE) AS is_public
FROM episodes
WHERE id = ANY($1::varchar[])
`;

const PODCAST_SQL = `
SELECT DISTINCT ON (p.id)
       p.id,
       p."podcastIndexId" AS podcast_index_id,
       p.title AS title,
       p."podcastGuid"::text AS podcast_guid,
       NULLIF(btrim(f.url), '') AS authority_url,
       (p."isPublic" IS TRUE) AS is_public,
       p.flag_status::text AS flag_status
FROM podcasts p
LEFT JOIN "feedUrls" f
  ON f."podcastId" = p.id AND f."isAuthority" IS TRUE
WHERE p.id = ANY($1::varchar[])
ORDER BY p.id, f.url
`;

const UUID_TEXT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hasOption(args: CommandLineArgs, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(args, name);
}

export function optionValue(args: CommandLineArgs, name: string): string | null {
  const value = args[name];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function clipText(value: unknown, max: number): string | null {
  const text = textOrNull(value);
  if (text === null) {
    return null;
  }
  return text.length <= max ? text : text.slice(0, max);
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function flag(value: unknown): boolean {
  return value === true;
}

function pubDateIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

function integerOrNull(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function addToChannelSet(
  map: Map<string, Set<string>>,
  channelIdText: string,
  value: string | null
): void {
  if (value === null) {
    return;
  }
  const existing = map.get(channelIdText);
  if (existing === undefined) {
    map.set(channelIdText, new Set([value]));
    return;
  }
  existing.add(value);
}

async function queryV4(
  client: Client,
  sql: string,
  values: readonly unknown[]
): Promise<Record<string, unknown>[]> {
  const result = await client.query<Record<string, unknown>>(sql, values);
  return result.rows;
}

async function queryV5(
  sql: string,
  values: readonly unknown[]
): Promise<Record<string, unknown>[]> {
  const result: unknown = await getDataSourceReadWrite().query(sql, [...values]);
  return rowsOf(result);
}

function keysOf<T>(
  rows: Record<string, unknown>[],
  toKey: (row: Record<string, unknown>, id: string) => T
): T[] {
  const keys: T[] = [];
  for (const row of rows) {
    const id = textOrNull(row.id);
    if (id !== null) {
      keys.push(toKey(row, id));
    }
  }
  return keys;
}

function mediaRefKey(row: Record<string, unknown>, id: string): V4MediaRefKey {
  return {
    id,
    episodeId: textOrNull(row.episode_id),
    official: flag(row.official),
    owned: flag(row.owned),
    title: clipText(row.title, 255),
    startTime: integerOrNull(row.start_time),
    endTime: integerOrNull(row.end_time),
    isPublic: flag(row.is_public),
  };
}

function episodeKey(row: Record<string, unknown>, id: string): V4EpisodeKey {
  return {
    id,
    podcastId: textOrNull(row.podcast_id),
    guid: textOrNull(row.guid),
    mediaUrl: textOrNull(row.media_url),
    title: textOrNull(row.title),
    pubDate: pubDateIso(row.pub_date),
    isPublic: flag(row.is_public),
  };
}

function podcastKey(row: Record<string, unknown>, id: string): V4PodcastKey {
  return {
    id,
    podcastIndexId: textOrNull(row.podcast_index_id),
    podcastGuid: textOrNull(row.podcast_guid),
    authorityUrl: textOrNull(row.authority_url),
    isPublic: flag(row.is_public),
    flagStatus: textOrNull(row.flag_status),
    title: clipText(row.title, 255),
  };
}

/**
 * Reads the v4 mediaRefs, episodes, and podcasts behind a set of ids, for rows recorded in
 * `legacy_pending_row`. `owned` is relative to `v4Id`. Episodes include those the mediaRefs
 * point at.
 */
export async function readV4References(
  connectionString: string,
  v4Id: string,
  ids: { episodeIds: string[]; mediaRefIds: string[] }
): Promise<Pick<V4LibrarySnapshot, 'mediaRefs' | 'clips' | 'episodes' | 'podcasts'>> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const mediaRefIds = uniqueTexts(ids.mediaRefIds);
    const mediaRefRows =
      mediaRefIds.length === 0
        ? []
        : await queryV4(client, MEDIA_REF_BY_ID_SQL, [v4Id, mediaRefIds]);
    const episodeIds = uniqueTexts([
      ...ids.episodeIds,
      ...mediaRefRows.map((row) => textOrNull(row.episode_id)),
    ]);
    const episodeRows =
      episodeIds.length === 0 ? [] : await queryV4(client, EPISODE_SQL, [episodeIds]);
    const podcastIds = uniqueTexts(episodeRows.map((row) => textOrNull(row.podcast_id)));
    const podcastRows =
      podcastIds.length === 0 ? [] : await queryV4(client, PODCAST_SQL, [podcastIds]);
    const mediaRefs = keysOf(mediaRefRows, mediaRefKey);
    return {
      mediaRefs,
      clips: mediaRefs.filter((mediaRef) => mediaRef.owned),
      episodes: keysOf(episodeRows, episodeKey),
      podcasts: keysOf(podcastRows, podcastKey),
    };
  } catch (error) {
    throw new Error('Could not read the v4 references.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function readV4Snapshot(connectionString: string, v4Id: string): Promise<V4LibrarySnapshot> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const users = await queryV4(client, USER_SQL, [v4Id]);
    const user = users[0];
    if (users.length !== 1 || user === undefined) {
      throw new Error('No v4 account for that id.');
    }
    const playlists = await queryV4(client, PLAYLIST_SQL, [v4Id]);
    const playlistIds = playlists
      .map((row) => textOrNull(row.id))
      .filter((id): id is string => id !== null);
    const playlistEpisodes =
      playlistIds.length === 0 ? [] : await queryV4(client, PLAYLIST_EPISODE_SQL, [playlistIds]);
    const playlistMediaRefs =
      playlistIds.length === 0 ? [] : await queryV4(client, PLAYLIST_MEDIA_REF_SQL, [playlistIds]);
    const queue = await queryV4(client, QUEUE_SQL, [v4Id]);
    const history = await queryV4(client, HISTORY_SQL, [v4Id]);
    const nowPlaying = await queryV4(client, NOW_PLAYING_SQL, [v4Id]);
    const playback = [...queue, ...history, ...nowPlaying];
    const referencedMediaRefIds = [
      ...playlistMediaRefs.map((row) => textOrNull(row.media_ref_id)),
      ...playback.map((row) => textOrNull(row.media_ref_id)),
    ].filter((id): id is string => id !== null);
    const mediaRefRows = await queryV4(client, MEDIA_REF_SQL, [v4Id, referencedMediaRefIds]);
    const episodeIds = [
      ...playlistEpisodes.map((row) => textOrNull(row.episode_id)),
      ...playback.map((row) => textOrNull(row.episode_id)),
      ...mediaRefRows.map((row) => textOrNull(row.episode_id)),
    ].filter((id): id is string => id !== null);
    const episodeRows =
      episodeIds.length === 0 ? [] : await queryV4(client, EPISODE_SQL, [episodeIds]);
    const podcastIds = [
      ...textList(user.podcast_ids),
      ...episodeRows.map((row) => textOrNull(row.podcast_id)),
    ].filter((id): id is string => id !== null && id.trim() !== '');
    const podcastRows =
      podcastIds.length === 0 ? [] : await queryV4(client, PODCAST_SQL, [podcastIds]);

    const episodesByPlaylist = new Map<string, string[]>();
    const mediaRefsByPlaylist = new Map<string, string[]>();
    for (const row of playlistEpisodes) {
      const playlistId = textOrNull(row.playlist_id);
      const episodeId = textOrNull(row.episode_id);
      if (playlistId === null || episodeId === null) {
        continue;
      }
      const list = episodesByPlaylist.get(playlistId) ?? [];
      list.push(episodeId);
      episodesByPlaylist.set(playlistId, list);
    }
    for (const row of playlistMediaRefs) {
      const playlistId = textOrNull(row.playlist_id);
      const mediaRefId = textOrNull(row.media_ref_id);
      if (playlistId === null || mediaRefId === null) {
        continue;
      }
      const list = mediaRefsByPlaylist.get(playlistId) ?? [];
      list.push(mediaRefId);
      mediaRefsByPlaylist.set(playlistId, list);
    }

    const playlistKeys: V4PlaylistKey[] = [];
    for (const row of playlists) {
      const id = textOrNull(row.id);
      if (id === null) {
        continue;
      }
      playlistKeys.push({
        id,
        episodeIds: episodesByPlaylist.get(id) ?? [],
        mediaRefIds: mediaRefsByPlaylist.get(id) ?? [],
        orderIds: textList(row.items_order),
        title: clipText(row.title, 255),
        description: clipText(row.description, 2500),
        isPublic: flag(row.is_public),
        isDefault: flag(row.is_default),
        medium: textOrNull(row.medium),
      });
    }

    const mediaRefs = keysOf(mediaRefRows, mediaRefKey);
    const clips = mediaRefs.filter((mediaRef) => mediaRef.owned);
    const episodes = keysOf(episodeRows, episodeKey);
    const podcasts = keysOf(podcastRows, podcastKey);

    const playbackKey = (row: Record<string, unknown>): V4PlaybackKey => ({
      episodeId: textOrNull(row.episode_id),
      mediaRefId: textOrNull(row.media_ref_id),
      playbackPosition: integerOrNull(row.playback_position),
      mediaFileDuration: integerOrNull(row.media_file_duration),
      completed: flag(row.completed),
      orderChangedDate: pubDateIso(row.order_changed_date),
      queuePosition: integerOrNull(row.queue_position),
    });

    return {
      podcastIds: textList(user.podcast_ids),
      podcasts,
      addByRssUrls: textList(user.add_by_rss_urls),
      playlistFollowIds: textList(user.playlist_ids),
      userFollowIds: textList(user.user_ids),
      playlists: playlistKeys,
      clips,
      mediaRefs,
      episodes,
      queue: queue.map(playbackKey),
      history: history.map(playbackKey),
      nowPlaying: nowPlaying.map(playbackKey),
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'No v4 account for that id.') {
      throw error;
    }
    throw new Error('Could not read the v4 library.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

function uniqueTexts(values: Array<string | null>): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    if (value !== null) {
      unique.add(value);
    }
  }
  return [...unique];
}

export async function readLocalCatalog(snapshot: V4LibrarySnapshot): Promise<LocalCatalog> {
  const podcastIndexIds = [
    ...new Set(
      snapshot.podcasts
        .map((podcast) => parsePodcastIndexId(podcast.podcastIndexId))
        .filter((id): id is number => id !== null)
    ),
  ];
  const podcastIds = uniqueTexts(snapshot.podcasts.map((podcast) => podcast.id));
  const feedUrls = uniqueTexts([
    ...snapshot.podcasts.map((podcast) => podcast.authorityUrl),
    ...snapshot.addByRssUrls.map((url) => textOrNull(url)),
  ]);
  const podcastGuids = uniqueTexts(
    snapshot.podcasts
      .map((podcast) => podcast.podcastGuid)
      .filter((guid): guid is string => guid !== null && UUID_TEXT.test(guid))
  );

  const channelIdTexts = new Set<string>();
  const channelByPodcastIndexId = new Map<number, string>();
  const channelByFeedUrl = new Map<string, string>();
  const channelByPodcastGuid = new Map<string, string>();
  const absorbSurvivorByPodcastIndexId = new Map<number, string>();
  const feedUrlSet = new Set<string>();

  if (podcastIds.length > 0) {
    const rows = await queryV5('SELECT id_text FROM channel WHERE id_text = ANY($1::varchar[])', [
      podcastIds,
    ]);
    for (const row of rows) {
      const idText = textOrNull(row.id_text);
      if (idText !== null) {
        channelIdTexts.add(idText);
      }
    }
  }
  if (podcastIndexIds.length > 0) {
    const rows = await queryV5(
      `SELECT f.podcast_index_id, c.id_text
       FROM feed f
       INNER JOIN channel c ON c.feed_id = f.id
       WHERE f.podcast_index_id = ANY($1::int[])`,
      [podcastIndexIds]
    );
    for (const row of rows) {
      const podcastIndexId = integerOrNull(row.podcast_index_id);
      const idText = textOrNull(row.id_text);
      if (podcastIndexId !== null && idText !== null) {
        channelByPodcastIndexId.set(podcastIndexId, idText);
      }
    }
    const merges = await queryV5(
      `SELECT merge.from_podcast_index_id, to_channel.id_text AS to_id_text
       FROM channel_merge merge
       INNER JOIN channel to_channel ON to_channel.id = merge.to_channel_id
       WHERE merge.from_podcast_index_id = ANY($1::int[])
         AND merge.status = 'applied'
         AND merge.mode = 'absorb'
         AND merge.to_channel_id IS NOT NULL`,
      [podcastIndexIds]
    );
    for (const row of merges) {
      const podcastIndexId = integerOrNull(row.from_podcast_index_id);
      const idText = textOrNull(row.to_id_text);
      if (podcastIndexId !== null && idText !== null) {
        absorbSurvivorByPodcastIndexId.set(podcastIndexId, idText);
      }
    }
  }
  if (feedUrls.length > 0) {
    const rows = await queryV5(
      `SELECT f.url, c.id_text
       FROM feed f
       INNER JOIN channel c ON c.feed_id = f.id
       WHERE f.url = ANY($1::varchar[])`,
      [feedUrls]
    );
    for (const row of rows) {
      const url = textOrNull(row.url);
      const idText = textOrNull(row.id_text);
      if (url !== null) {
        feedUrlSet.add(url);
        if (idText !== null) {
          channelByFeedUrl.set(url, idText);
        }
      }
    }
  }
  if (podcastGuids.length > 0) {
    const rows = await queryV5(
      `SELECT podcast_guid::text AS podcast_guid, id_text
       FROM channel
       WHERE podcast_guid = ANY($1::uuid[])`,
      [podcastGuids]
    );
    for (const row of rows) {
      const podcastGuid = textOrNull(row.podcast_guid);
      const idText = textOrNull(row.id_text);
      if (podcastGuid !== null && idText !== null) {
        channelByPodcastGuid.set(podcastGuid, idText);
      }
    }
  }

  const catalogWithoutItems: LocalCatalog = {
    channelIdTexts,
    channelByPodcastIndexId,
    channelByFeedUrl,
    channelByPodcastGuid,
    absorbSurvivorByPodcastIndexId,
    itemIdTexts: new Set<string>(),
    itemGuidsByChannel: new Map<string, Set<string>>(),
    itemEnclosuresByChannel: new Map<string, Set<string>>(),
    itemTitlePubByChannel: new Map<string, Set<string>>(),
    clipIdTexts: new Set<string>(),
    playlistIdTexts: new Set<string>(),
    accountIdTexts: new Set<string>(),
    feedUrls: feedUrlSet,
    attemptedChannelIdTexts: new Set<string>(),
    settledChannelIdTexts: new Set<string>(),
  };
  const channelIds = matchedChannelIdTexts(snapshot, catalogWithoutItems);
  const episodeIds = uniqueTexts(snapshot.episodes.map((episode) => episode.id));
  const guids = uniqueTexts(snapshot.episodes.map((episode) => episode.guid));
  const mediaUrls = uniqueTexts(snapshot.episodes.map((episode) => episode.mediaUrl));
  const titles = uniqueTexts(snapshot.episodes.map((episode) => episode.title));

  const itemIdTexts = new Set<string>();
  const itemGuidsByChannel = new Map<string, Set<string>>();
  const itemEnclosuresByChannel = new Map<string, Set<string>>();
  const itemTitlePubByChannel = new Map<string, Set<string>>();
  if (
    episodeIds.length > 0 ||
    (channelIds.length > 0 && (guids.length > 0 || mediaUrls.length > 0 || titles.length > 0))
  ) {
    const rows = await queryV5(
      `SELECT c.id_text AS channel_id_text,
              i.id_text AS item_id_text,
              i.guid,
              i.guid_enclosure_url,
              i.title,
              i.pub_date
       FROM item i
       INNER JOIN channel c ON c.id = i.channel_id
       WHERE i.id_text = ANY($1::varchar[])
          OR (
            c.id_text = ANY($2::varchar[])
            AND (
              i.guid = ANY($3::varchar[])
              OR i.guid_enclosure_url = ANY($4::varchar[])
              OR i.title = ANY($5::varchar[])
            )
          )`,
      [episodeIds, channelIds, guids, mediaUrls, titles]
    );
    for (const row of rows) {
      const channelIdText = textOrNull(row.channel_id_text);
      const itemIdText = textOrNull(row.item_id_text);
      if (itemIdText !== null) {
        itemIdTexts.add(itemIdText);
      }
      if (channelIdText === null) {
        continue;
      }
      addToChannelSet(itemGuidsByChannel, channelIdText, textOrNull(row.guid));
      addToChannelSet(itemEnclosuresByChannel, channelIdText, textOrNull(row.guid_enclosure_url));
      const title = textOrNull(row.title);
      const pubDate = pubDateIso(row.pub_date);
      if (title !== null && pubDate !== null) {
        const pubSecond = String(Math.floor(Date.parse(pubDate) / 1000));
        addToChannelSet(itemTitlePubByChannel, channelIdText, `${title}\n${pubSecond}`);
      }
    }
  }

  const clipIds = uniqueTexts([
    ...snapshot.clips.map((clip) => clip.id),
    ...snapshot.mediaRefs.map((mediaRef) => mediaRef.id),
  ]);
  const clipIdTexts = new Set<string>();
  if (clipIds.length > 0) {
    const rows = await queryV5('SELECT id_text FROM clip WHERE id_text = ANY($1::varchar[])', [
      clipIds,
    ]);
    for (const row of rows) {
      const idText = textOrNull(row.id_text);
      if (idText !== null) {
        clipIdTexts.add(idText);
      }
    }
  }

  const playlistIdTexts = new Set<string>();
  const followPlaylistIds = uniqueTexts(snapshot.playlistFollowIds.map((id) => textOrNull(id)));
  if (followPlaylistIds.length > 0) {
    const rows = await queryV5('SELECT id_text FROM playlist WHERE id_text = ANY($1::varchar[])', [
      followPlaylistIds,
    ]);
    for (const row of rows) {
      const idText = textOrNull(row.id_text);
      if (idText !== null) {
        playlistIdTexts.add(idText);
      }
    }
  }

  const accountIdTexts = new Set<string>();
  const followUserIds = uniqueTexts(snapshot.userFollowIds.map((id) => textOrNull(id)));
  if (followUserIds.length > 0) {
    const rows = await queryV5('SELECT id_text FROM account WHERE id_text = ANY($1::varchar[])', [
      followUserIds,
    ]);
    for (const row of rows) {
      const idText = textOrNull(row.id_text);
      if (idText !== null) {
        accountIdTexts.add(idText);
      }
    }
  }

  const attemptedChannelIdTexts = new Set<string>();
  const settledChannelIdTexts = new Set<string>();
  if (channelIds.length > 0) {
    const rows = await queryV5(
      `SELECT c.id_text
       FROM channel c
       INNER JOIN feed f ON f.id = c.feed_id
       INNER JOIN feed_log fl ON fl.feed_id = f.id
       WHERE c.id_text = ANY($1::varchar[])
         AND f.is_parsing IS NULL
         AND (
           fl.last_finished_parse_time IS NOT NULL
           OR fl.last_failed_parse_time IS NOT NULL
         )`,
      [channelIds]
    );
    for (const row of rows) {
      const idText = textOrNull(row.id_text);
      if (idText !== null) {
        attemptedChannelIdTexts.add(idText);
      }
    }

    const feedRows = await queryV5(
      'SELECT id_text, feed_id FROM channel WHERE id_text = ANY($1::varchar[])',
      [channelIds]
    );
    const channelByFeedId = new Map<number, string>();
    for (const row of feedRows) {
      const idText = textOrNull(row.id_text);
      const feedId = integerOrNull(row.feed_id);
      if (idText !== null && feedId !== null) {
        channelByFeedId.set(feedId, idText);
      }
    }
    const settledByFeedId = await getV4MigrationFeedSettledByFeedId([...channelByFeedId.keys()]);
    for (const [feedId, idText] of channelByFeedId) {
      if (settledByFeedId.get(feedId) === true) {
        settledChannelIdTexts.add(idText);
      }
    }
  }

  return {
    ...catalogWithoutItems,
    itemIdTexts,
    itemGuidsByChannel,
    itemEnclosuresByChannel,
    itemTitlePubByChannel,
    clipIdTexts,
    playlistIdTexts,
    accountIdTexts,
    attemptedChannelIdTexts,
    settledChannelIdTexts,
  };
}

export function assertLocalDatabase(): void {
  const host = (process.env.DB_HOST ?? '').trim().toLowerCase();
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    throw new Error('Refusing to apply because DB_HOST is not local.');
  }
}

export type V4LibraryCommandResult =
  | { action: 'help' }
  | { action: 'skip_missing_account'; v4Id: string }
  | { action: 'skip_already_copied'; v4Id: string }
  | {
      action: 'dry_run';
      v4Id: string;
      report: LibraryCopyReport;
      addByRssCap: AddByRssCap;
      directoryFollowCap: DirectoryFollowCap;
      playlistsOverLimit: string[];
    }
  | {
      action: 'apply';
      v4Id: string;
      report: LibraryCopyReport;
      apply: ApplyLibraryCopyResult;
    };

function logFinished(
  v4Id: string,
  action: string,
  dryRun: boolean,
  report: LibraryCopyReport | null,
  apply: ApplyLibraryCopyResult | null,
  addByRssCap: AddByRssCap | null,
  directoryFollowCap: DirectoryFollowCap | null,
  playlistsOverLimit: readonly string[] | null
): void {
  getLogger().info(dryRun ? 'v4 library dry run finished' : 'v4 library copy finished', {
    dryRun,
    v4Id,
    action,
    ...(report === null ? {} : report),
    ...(apply === null ? {} : { apply }),
    ...(addByRssCap === null ? {} : { addByRssCap }),
    ...(directoryFollowCap === null ? {} : { directoryFollowCap }),
    ...(playlistsOverLimit === null ? {} : { playlistsOverLimit }),
  });
}

/**
 * Counts one v4 library against local v5. The log is the id and the counts.
 */
export const v4CopyAccountLibrary = async (
  args: CommandLineArgs
): Promise<V4LibraryCommandResult> => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_COPY_ACCOUNT_LIBRARY_HELP);
    return { action: 'help' };
  }

  const v4Id = optionValue(args, 'v4-id');
  if (v4Id === null) {
    throw new Error('Missing --v4-id. Run with --help for the flags.');
  }
  if (!isValidNanoIdV2IdText(v4Id)) {
    throw new Error('v4 id must be 7–15 characters.');
  }
  const dryRun = hasOption(args, 'dry-run');
  if (!dryRun) {
    assertLocalDatabase();
  }

  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }

  const account = await getDataSourceReadWrite()
    .getRepository(Account)
    .findOne({
      where: { id_text: v4Id },
    });
  if (account === null) {
    logFinished(v4Id, 'skip_missing_account', dryRun, null, null, null, null, null);
    return { action: 'skip_missing_account', v4Id };
  }
  if (account.v4_library_copied_at !== null && account.v4_library_copied_at !== undefined) {
    logFinished(v4Id, 'skip_already_copied', dryRun, null, null, null, null, null);
    return { action: 'skip_already_copied', v4Id };
  }

  const snapshot = await readV4Snapshot(connectionString, v4Id);
  let catalog: LocalCatalog;
  try {
    catalog = await readLocalCatalog(snapshot);
  } catch (error) {
    throw new Error('Could not read the v5 library index.', { cause: error });
  }
  const report = classifyLibraryCopy(snapshot, catalog);
  if (dryRun) {
    const addByRssCap = await readAddByRssCap(
      {
        query: (sql, parameters) => queryV5(sql, parameters ?? []),
      },
      account.id,
      snapshot.addByRssUrls
    );
    const directoryFollowCap = directoryFollowCapFromSnapshot(snapshot);
    const playlistsOverLimit = playlistsOverLimitFromSnapshot(snapshot);
    logFinished(
      v4Id,
      'dry_run',
      true,
      report,
      null,
      addByRssCap,
      directoryFollowCap,
      playlistsOverLimit
    );
    return {
      action: 'dry_run',
      v4Id,
      report,
      addByRssCap,
      directoryFollowCap,
      playlistsOverLimit,
    };
  }
  const applied = await applyLibraryCopy(account.id, account.id_text, snapshot, catalog);
  logFinished(v4Id, 'apply', false, report, applied, null, null, null);
  return { action: 'apply', v4Id, report, apply: applied };
};
