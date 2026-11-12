import type { CommandLineArgs } from '@workers/commands/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';

import { MediumEnum, MQ_QUEUES } from '@podverse/helpers';
import { mqRSSAdd } from '@podverse/mq';
import {
  Account,
  Channel,
  FeedService,
  getDataSourceReadWrite,
  isValidNanoIdV2IdText,
} from '@podverse/orm';

import type { LocalCatalog, V4PodcastKey } from '../v4Library/copyAccountLibraryLib.js';
import { parsePodcastIndexId } from '../v4Library/copyAccountLibraryLib.js';
import type {
  CatalogSeedCreate,
  CatalogSeedReport,
  CatalogSeedSources,
} from './seedAccountCatalogLib.js';
import { classifyAccountCatalogSeed, selectCatalogSeedCreates } from './seedAccountCatalogLib.js';

export const V4_SEED_ACCOUNT_CATALOG_HELP = `v4SeedAccountCatalog

Count the shows one v4 account needs in the local v5 catalog. With --dry-run,
writes nothing and does not queue a parse. Without --dry-run, creates each
missing local feed and a channel whose id_text is the v4 podcast id, then
queues a parse on rss-slow. Episodes that left the feed are not copied.

Flags:
  --v4-id id    v4 users.id (required)
  --dry-run     Count only. Do not write or queue
  --help        Show this text

Requires V4_DATABASE_URL plus the Base, ORM, and MQ worker env. The v5 account
must already exist. Apply refuses unless DB_HOST is localhost.

Shows come from subscriptions, user clips, playlist members, history, queue,
and now playing. An episode id hops through episodes.podcastId. Add by RSS
stays a URL and is not a catalog show.

The log is the id and counts. No email, url, or title is logged.
  alreadyLocal       a local channel already matches
  notLocal           public, not spam or takedown, no local channel yet
  missing            no podcast row
  nonPublic          v4 hides the feed
  spam / takedown    flagged, kept off the seed
  noPodcastIndexId   no Podcast Index id that fits the v5 column
  beyondSubscriptions  shows from the library that are not in the subscription list
`;

const USER_SQL = `
SELECT "subscribedPodcastIds" AS podcast_ids
FROM users
WHERE id = $1
`;

const CLIP_EPISODE_SQL = `
SELECT "episodeId" AS episode_id
FROM "mediaRefs"
WHERE "ownerId" = $1
  AND "isOfficialChapter" IS NOT TRUE
  AND "isOfficialSoundBite" IS NOT TRUE
`;

const PLAYLIST_EPISODE_SQL = `
SELECT pe."episodesId" AS episode_id
FROM playlists p
INNER JOIN playlists_episodes_episodes pe ON pe."playlistsId" = p.id
WHERE p."ownerId" = $1
`;

const PLAYLIST_MEDIA_REF_SQL = `
SELECT mr."episodeId" AS episode_id
FROM playlists p
INNER JOIN playlists_media_refs_media_refs pm ON pm."playlistsId" = p.id
INNER JOIN "mediaRefs" mr ON mr.id = pm."mediaRefsId"
WHERE p."ownerId" = $1
`;

const HISTORY_SQL = `
SELECT "episodeId" AS episode_id, "mediaRefId" AS media_ref_id
FROM "userHistoryItems"
WHERE "ownerId" = $1
`;

const QUEUE_SQL = `
SELECT "episodeId" AS episode_id, "mediaRefId" AS media_ref_id
FROM "userQueueItems"
WHERE "ownerId" = $1
`;

const NOW_PLAYING_SQL = `
SELECT "episodeId" AS episode_id, "mediaRefId" AS media_ref_id
FROM "userNowPlayingItems"
WHERE "ownerId" = $1
`;

const MEDIA_REF_EPISODE_SQL = `
SELECT id, "episodeId" AS episode_id
FROM "mediaRefs"
WHERE id = ANY($1::varchar[])
`;

const EPISODE_SQL = `
SELECT id, "podcastId" AS podcast_id
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

function integerOrNull(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function uniqueTexts(values: readonly (string | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (value === null || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

type PlaybackRow = {
  episodeId: string | null;
  mediaRefId: string | null;
};

async function queryV4(
  client: Client,
  sql: string,
  values: readonly unknown[]
): Promise<Record<string, unknown>[]> {
  const result = await client.query<Record<string, unknown>>(sql, values);
  return result.rows;
}

function columnTexts(rows: readonly Record<string, unknown>[], column: string): string[] {
  return uniqueTexts(rows.map((row) => textOrNull(row[column])));
}

function playbackRows(rows: readonly Record<string, unknown>[]): PlaybackRow[] {
  return rows.map((row) => ({
    episodeId: textOrNull(row.episode_id),
    mediaRefId: textOrNull(row.media_ref_id),
  }));
}

function episodeIdsForPlayback(
  rows: readonly PlaybackRow[],
  episodeIdByMediaRef: ReadonlyMap<string, string>
): string[] {
  const episodeIds: string[] = [];
  for (const row of rows) {
    if (row.episodeId !== null) {
      episodeIds.push(row.episodeId);
    }
    if (row.mediaRefId === null) {
      continue;
    }
    const episodeId = episodeIdByMediaRef.get(row.mediaRefId);
    if (episodeId !== undefined) {
      episodeIds.push(episodeId);
    }
  }
  return episodeIds;
}

function podcastIdsForEpisodes(
  episodeIds: readonly string[],
  podcastIdByEpisode: ReadonlyMap<string, string>
): string[] {
  const podcastIds: string[] = [];
  for (const episodeId of episodeIds) {
    const podcastId = podcastIdByEpisode.get(episodeId);
    if (podcastId !== undefined) {
      podcastIds.push(podcastId);
    }
  }
  return podcastIds;
}

function emptyCatalog() {
  return {
    channelIdTexts: new Set<string>(),
    channelByPodcastIndexId: new Map<number, string>(),
    channelByFeedUrl: new Map<string, string>(),
    channelByPodcastGuid: new Map<string, string>(),
    absorbSurvivorByPodcastIndexId: new Map<number, string>(),
    itemIdTexts: new Set<string>(),
    itemGuidsByChannel: new Map<string, Set<string>>(),
    itemEnclosuresByChannel: new Map<string, Set<string>>(),
    itemTitlePubByChannel: new Map<string, Set<string>>(),
    clipIdTexts: new Set<string>(),
    playlistIdTexts: new Set<string>(),
    accountIdTexts: new Set<string>(),
    feedUrls: new Set<string>(),
  };
}

async function readV4Sources(connectionString: string, v4Id: string): Promise<{
  sources: CatalogSeedSources;
  podcasts: V4PodcastKey[];
}> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const users = await queryV4(client, USER_SQL, [v4Id]);
    const user = users[0];
    if (users.length !== 1 || user === undefined) {
      throw new Error('No v4 account for that id.');
    }

    const clipEpisodes = columnTexts(await queryV4(client, CLIP_EPISODE_SQL, [v4Id]), 'episode_id');
    const playlistEpisodes = columnTexts(
      await queryV4(client, PLAYLIST_EPISODE_SQL, [v4Id]),
      'episode_id'
    );
    const playlistMediaRefEpisodes = columnTexts(
      await queryV4(client, PLAYLIST_MEDIA_REF_SQL, [v4Id]),
      'episode_id'
    );
    const history = playbackRows(await queryV4(client, HISTORY_SQL, [v4Id]));
    const queue = playbackRows(await queryV4(client, QUEUE_SQL, [v4Id]));
    const nowPlaying = playbackRows(await queryV4(client, NOW_PLAYING_SQL, [v4Id]));

    const mediaRefIds = uniqueTexts([
      ...history.map((row) => row.mediaRefId),
      ...queue.map((row) => row.mediaRefId),
      ...nowPlaying.map((row) => row.mediaRefId),
    ]);
    const episodeIdByMediaRef = new Map<string, string>();
    if (mediaRefIds.length > 0) {
      const mediaRefs = await queryV4(client, MEDIA_REF_EPISODE_SQL, [mediaRefIds]);
      for (const row of mediaRefs) {
        const id = textOrNull(row.id);
        const episodeId = textOrNull(row.episode_id);
        if (id !== null && episodeId !== null) {
          episodeIdByMediaRef.set(id, episodeId);
        }
      }
    }

    const episodeIds = uniqueTexts([
      ...clipEpisodes,
      ...playlistEpisodes,
      ...playlistMediaRefEpisodes,
      ...episodeIdsForPlayback(history, episodeIdByMediaRef),
      ...episodeIdsForPlayback(queue, episodeIdByMediaRef),
      ...episodeIdsForPlayback(nowPlaying, episodeIdByMediaRef),
    ]);
    const podcastIdByEpisode = new Map<string, string>();
    if (episodeIds.length > 0) {
      const episodes = await queryV4(client, EPISODE_SQL, [episodeIds]);
      for (const row of episodes) {
        const id = textOrNull(row.id);
        const podcastId = textOrNull(row.podcast_id);
        if (id !== null && podcastId !== null) {
          podcastIdByEpisode.set(id, podcastId);
        }
      }
    }

    const sources: CatalogSeedSources = {
      subscriptions: textList(user.podcast_ids),
      clips: podcastIdsForEpisodes(clipEpisodes, podcastIdByEpisode),
      playlistMembers: podcastIdsForEpisodes(
        [...playlistEpisodes, ...playlistMediaRefEpisodes],
        podcastIdByEpisode
      ),
      history: podcastIdsForEpisodes(
        episodeIdsForPlayback(history, episodeIdByMediaRef),
        podcastIdByEpisode
      ),
      queue: podcastIdsForEpisodes(
        episodeIdsForPlayback(queue, episodeIdByMediaRef),
        podcastIdByEpisode
      ),
      nowPlaying: podcastIdsForEpisodes(
        episodeIdsForPlayback(nowPlaying, episodeIdByMediaRef),
        podcastIdByEpisode
      ),
    };
    const podcastIds = uniqueTexts([
      ...sources.subscriptions,
      ...sources.clips,
      ...sources.playlistMembers,
      ...sources.history,
      ...sources.queue,
      ...sources.nowPlaying,
    ]);
    const podcasts: V4PodcastKey[] = [];
    if (podcastIds.length > 0) {
      const rows = await queryV4(client, PODCAST_SQL, [podcastIds]);
      for (const row of rows) {
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
    }
    return { sources, podcasts };
  } catch (error) {
    if (error instanceof Error && error.message === 'No v4 account for that id.') {
      throw error;
    }
    throw new Error('Could not read the v4 catalog.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function queryV5(
  sql: string,
  values: readonly unknown[]
): Promise<Record<string, unknown>[]> {
  const result: unknown = await getDataSourceReadWrite().query(sql, [...values]);
  return rowsOf(result);
}

async function readLocalChannels(podcasts: readonly V4PodcastKey[]): Promise<LocalCatalog> {
  const catalog = emptyCatalog();
  const podcastIds = uniqueTexts(podcasts.map((podcast) => podcast.id));
  const podcastIndexIds = uniqueTexts(
    podcasts.map((podcast) => {
      const parsed = parsePodcastIndexId(podcast.podcastIndexId);
      return parsed === null ? null : String(parsed);
    })
  ).map((text) => Number(text));
  const feedUrls = uniqueTexts(podcasts.map((podcast) => podcast.authorityUrl));
  const podcastGuids = uniqueTexts(
    podcasts
      .map((podcast) => podcast.podcastGuid)
      .filter((guid): guid is string => guid !== null && UUID_TEXT.test(guid))
  );

  if (podcastIds.length > 0) {
    const rows = await queryV5('SELECT id_text FROM channel WHERE id_text = ANY($1::varchar[])', [
      podcastIds,
    ]);
    for (const row of rows) {
      const idText = textOrNull(row.id_text);
      if (idText !== null) {
        catalog.channelIdTexts.add(idText);
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
        catalog.channelByPodcastIndexId.set(podcastIndexId, idText);
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
        catalog.absorbSurvivorByPodcastIndexId.set(podcastIndexId, idText);
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
      if (url !== null && idText !== null) {
        catalog.channelByFeedUrl.set(url, idText);
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
        catalog.channelByPodcastGuid.set(podcastGuid, idText);
      }
    }
  }
  return catalog;
}

function logFinished(
  v4Id: string,
  action: string,
  dryRun: boolean,
  report: CatalogSeedReport | null,
  apply: Record<string, number> | null
): void {
  getLogger().info(dryRun ? 'v4 catalog seed dry run finished' : 'v4 catalog seed apply finished', {
    dryRun,
    v4Id,
    action,
    ...(report === null ? {} : report),
    ...(apply === null ? {} : { apply }),
  });
}

function assertLocalDatabase(): void {
  const host = (process.env.DB_HOST ?? '').trim().toLowerCase();
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    throw new Error('Refusing to apply because DB_HOST is not local.');
  }
}

function podcastPageUrl(id: string): string {
  return `https://podverse.fm/podcast/${id}`;
}

type ExistingShow = {
  podcastIndexId: number | null;
  url: string | null;
  channelIdText: string | null;
};

async function readExistingShows(creates: readonly CatalogSeedCreate[]): Promise<ExistingShow[]> {
  if (creates.length === 0) {
    return [];
  }
  const rows = await queryV5(
    `SELECT f.podcast_index_id, f.url, c.id_text AS channel_id_text
     FROM feed f
     LEFT JOIN channel c ON c.feed_id = f.id
     WHERE f.podcast_index_id = ANY($1::int[])
        OR f.url = ANY($2::varchar[])
        OR c.id_text = ANY($3::varchar[])`,
    [
      creates.map((show) => show.podcastIndexId),
      creates.map((show) => show.authorityUrl),
      creates.map((show) => show.id),
    ]
  );
  return rows.map((row) => ({
    podcastIndexId: integerOrNull(row.podcast_index_id),
    url: textOrNull(row.url),
    channelIdText: textOrNull(row.channel_id_text),
  }));
}

function refusalForExisting(
  creates: readonly CatalogSeedCreate[],
  existing: readonly ExistingShow[]
): string | null {
  for (const show of creates) {
    for (const row of existing) {
      const indexDiffers =
        row.podcastIndexId !== null && row.podcastIndexId !== show.podcastIndexId;
      if (row.channelIdText === show.id && indexDiffers) {
        return (
          `Refusing to seed ${podcastPageUrl(show.id)} because that public id is already ` +
          'a different show. Nothing was written.'
        );
      }
      if (
        row.podcastIndexId === show.podcastIndexId &&
        row.channelIdText !== null &&
        row.channelIdText !== show.id
      ) {
        return (
          `Refusing to seed ${podcastPageUrl(show.id)} because that show is already ` +
          `${podcastPageUrl(row.channelIdText)}. Nothing was written.`
        );
      }
      if (row.url !== null && row.url === show.authorityUrl && indexDiffers) {
        return (
          `Refusing to seed ${podcastPageUrl(show.id)} because Podcast Index id ` +
          `${row.podcastIndexId} already uses that authority URL. Nothing was written.`
        );
      }
    }
  }
  return null;
}

async function ensureChannel(show: CatalogSeedCreate): Promise<'created' | 'present'> {
  const feed = await new FeedService().getOrCreate({
    url: show.authorityUrl,
    podcast_index_id: show.podcastIndexId,
  });
  const rows = await queryV5('SELECT id_text FROM channel WHERE feed_id = $1', [feed.id]);
  const channelIdText = textOrNull(rows[0]?.id_text);
  if (channelIdText !== null && channelIdText !== show.id) {
    throw new Error(
      `Refusing to seed ${podcastPageUrl(show.id)} because that show is already ` +
        `${podcastPageUrl(channelIdText)}. Nothing further was written.`
    );
  }
  if (channelIdText === show.id) {
    return 'present';
  }
  const channel = new Channel();
  channel.id_text = show.id;
  channel.feed = feed;
  channel.feed_id = feed.id;
  channel.medium_id = MediumEnum.Podcast;
  channel.medium = MediumEnum.Podcast;
  await getDataSourceReadWrite().getRepository(Channel).save(channel);
  return 'created';
}

async function queueParses(shows: readonly CatalogSeedCreate[]): Promise<void> {
  if (shows.length === 0) {
    return;
  }
  const mq = getActiveMQArtemisService();
  try {
    for (const show of shows) {
      await mqRSSAdd(
        mq,
        {
          ...MQ_QUEUES['rss-slow'],
          feedUrl: show.authorityUrl,
          podcast_index_id: show.podcastIndexId,
          closeAfterSend: false,
        },
        {
          forceParse: false,
          onDemandParserEvent: {
            accountId: null,
            type: null,
            remoteParentPodcastIndexId: null,
          },
        }
      );
    }
  } finally {
    await mq.close();
  }
}

/**
 * Counts one account's catalog seed. The log is the id and the counts.
 */
export const v4SeedAccountCatalog = async (args: CommandLineArgs) => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_SEED_ACCOUNT_CATALOG_HELP);
    return;
  }

  const v4Id = optionValue(args, 'v4-id');
  if (v4Id === null) {
    throw new Error('Missing --v4-id. Run with --help for the flags.');
  }
  if (!isValidNanoIdV2IdText(v4Id)) {
    throw new Error('v4 id must be 7–15 characters.');
  }

  const dryRun = hasOption(args, 'dry-run');
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  if (!dryRun) {
    assertLocalDatabase();
  }

  const account = await getDataSourceReadWrite().getRepository(Account).findOne({
    where: { id_text: v4Id },
  });
  if (account === null) {
    logFinished(v4Id, 'skip_missing_account', dryRun, null, null);
    return;
  }

  const { sources, podcasts } = await readV4Sources(connectionString, v4Id);
  let catalog: LocalCatalog;
  try {
    catalog = await readLocalChannels(podcasts);
  } catch (error) {
    throw new Error('Could not read the v5 channel index.', { cause: error });
  }
  const report = classifyAccountCatalogSeed(sources, podcasts, catalog);
  if (dryRun) {
    logFinished(v4Id, 'dry_run', true, report, null);
    return;
  }

  const plan = selectCatalogSeedCreates(sources, podcasts, catalog);
  const creates = plan.creates.filter((show) => isValidNanoIdV2IdText(show.id));
  const existing = await readExistingShows(creates);
  const refusal = refusalForExisting(creates, existing);
  if (refusal !== null) {
    throw new Error(refusal);
  }

  let created = 0;
  let present = 0;
  const queued: CatalogSeedCreate[] = [];
  for (const show of creates) {
    const outcome = await ensureChannel(show);
    queued.push(show);
    if (outcome === 'created') {
      created += 1;
    } else {
      present += 1;
    }
  }
  await queueParses(queued);
  logFinished(v4Id, 'apply', false, report, {
    created,
    present,
    queued: queued.length,
    skippedNoAuthorityUrl: plan.skippedNoAuthorityUrl,
    skippedInvalidId: plan.creates.length - creates.length,
  });
};
