import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';

import { Account, getDataSourceReadWrite, isValidNanoIdV2IdText } from '@podverse/orm';

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
} from './copyAccountLibraryLib.js';

export const V4_COPY_ACCOUNT_LIBRARY_HELP = `v4CopyAccountLibrary

Count one v4 library against the local v5 catalog. Writes nothing, including
v4_library_copied_at.

Flags:
  --v4-id id    v4 users.id (required)
  --dry-run     Required. This command does not write yet
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
                episodes still in a feed, so the rest are dropped
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
SELECT id, "itemsOrder" AS items_order
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
SELECT "episodeId" AS episode_id, "mediaRefId" AS media_ref_id
FROM "userQueueItems"
WHERE "ownerId" = $1
`;

const HISTORY_SQL = `
SELECT "episodeId" AS episode_id, "mediaRefId" AS media_ref_id
FROM "userHistoryItems"
WHERE "ownerId" = $1
`;

const NOW_PLAYING_SQL = `
SELECT "episodeId" AS episode_id, "mediaRefId" AS media_ref_id
FROM "userNowPlayingItems"
WHERE "ownerId" = $1
`;

const MEDIA_REF_SQL = `
SELECT id,
       "episodeId" AS episode_id,
       ("isOfficialChapter" IS TRUE OR "isOfficialSoundBite" IS TRUE) AS official,
       ("ownerId" = $1) AS owned
FROM "mediaRefs"
WHERE "ownerId" = $1
   OR id = ANY($2::varchar[])
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

function hasOption(args: CommandLineArgs, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(args, name);
}

function optionValue(args: CommandLineArgs, name: string): string | null {
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
      });
    }

    const mediaRefs: V4MediaRefKey[] = [];
    const clips: V4MediaRefKey[] = [];
    for (const row of mediaRefRows) {
      const id = textOrNull(row.id);
      if (id === null) {
        continue;
      }
      const key: V4MediaRefKey = {
        id,
        episodeId: textOrNull(row.episode_id),
        official: flag(row.official),
        owned: flag(row.owned),
      };
      mediaRefs.push(key);
      if (key.owned) {
        clips.push(key);
      }
    }

    const episodes: V4EpisodeKey[] = [];
    for (const row of episodeRows) {
      const id = textOrNull(row.id);
      if (id === null) {
        continue;
      }
      episodes.push({
        id,
        podcastId: textOrNull(row.podcast_id),
        guid: textOrNull(row.guid),
        mediaUrl: textOrNull(row.media_url),
        title: textOrNull(row.title),
        pubDate: pubDateIso(row.pub_date),
        isPublic: flag(row.is_public),
      });
    }

    const podcasts: V4PodcastKey[] = [];
    for (const row of podcastRows) {
      const id = textOrNull(row.id);
      if (id === null) {
        continue;
      }
      podcasts.push({
        id,
        podcastIndexId: textOrNull(row.podcast_index_id),
        podcastGuid: textOrNull(row.podcast_guid),
        authorityUrl: textOrNull(row.authority_url),
        isPublic: flag(row.is_public),
        flagStatus: textOrNull(row.flag_status),
      });
    }

    const playbackKey = (row: Record<string, unknown>): V4PlaybackKey => ({
      episodeId: textOrNull(row.episode_id),
      mediaRefId: textOrNull(row.media_ref_id),
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

async function readLocalCatalog(snapshot: V4LibrarySnapshot): Promise<LocalCatalog> {
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

  return {
    ...catalogWithoutItems,
    itemIdTexts,
    itemGuidsByChannel,
    itemEnclosuresByChannel,
    itemTitlePubByChannel,
    clipIdTexts,
    playlistIdTexts,
    accountIdTexts,
  };
}

function logFinished(v4Id: string, action: string, report: LibraryCopyReport | null): void {
  getLogger().info('v4 library dry run finished', {
    dryRun: true,
    v4Id,
    action,
    ...(report === null ? {} : report),
  });
}

/**
 * Counts one v4 library against local v5. The log is the id and the counts.
 */
export const v4CopyAccountLibrary = async (args: CommandLineArgs) => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_COPY_ACCOUNT_LIBRARY_HELP);
    return;
  }

  const v4Id = optionValue(args, 'v4-id');
  if (v4Id === null) {
    throw new Error('Missing --v4-id. Run with --help for the flags.');
  }
  if (!isValidNanoIdV2IdText(v4Id)) {
    throw new Error('v4 id must be 7–15 characters.');
  }
  if (!hasOption(args, 'dry-run')) {
    throw new Error('Writes are not implemented. Pass --dry-run.');
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
    logFinished(v4Id, 'skip_missing_account', null);
    return;
  }
  if (account.v4_library_copied_at !== null && account.v4_library_copied_at !== undefined) {
    logFinished(v4Id, 'skip_already_copied', null);
    return;
  }

  const snapshot = await readV4Snapshot(connectionString, v4Id);
  let catalog: LocalCatalog;
  try {
    catalog = await readLocalCatalog(snapshot);
  } catch (error) {
    throw new Error('Could not read the v5 library index.', { cause: error });
  }
  logFinished(v4Id, 'dry_run', classifyLibraryCopy(snapshot, catalog));
};
