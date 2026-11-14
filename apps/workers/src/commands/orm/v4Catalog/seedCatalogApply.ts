import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { Client } from 'pg';

import { MediumEnum, MQ_QUEUES } from '@podverse/helpers';
import { mqRSSAdd } from '@podverse/mq';
import {
  Channel,
  FeedService,
  getDataSourceReadWrite,
  scheduleV4MigrationFeedRetry,
  V4_MIGRATION_FEED_RETRY_FIRST_DELAY_MS,
} from '@podverse/orm';

import type { LocalCatalog, V4PodcastKey } from '../v4Library/copyAccountLibraryLib.js';
import { parsePodcastIndexId } from '../v4Library/copyAccountLibraryLib.js';
import type { CatalogSeedCreate } from './seedAccountCatalogLib.js';

const UUID_TEXT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

export function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function flag(value: unknown): boolean {
  return value === true;
}

export function integerOrNull(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

export function uniqueTexts(values: readonly (string | null)[]): string[] {
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

export async function queryV4(
  client: Client,
  sql: string,
  values: readonly unknown[]
): Promise<Record<string, unknown>[]> {
  const result = await client.query<Record<string, unknown>>(sql, values);
  return result.rows;
}

export async function queryV5(
  sql: string,
  values: readonly unknown[]
): Promise<Record<string, unknown>[]> {
  const result: unknown = await getDataSourceReadWrite().query(sql, [...values]);
  return rowsOf(result);
}

export function emptyCatalog() {
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
    attemptedChannelIdTexts: new Set<string>(),
    settledChannelIdTexts: new Set<string>(),
  };
}

export function assertLocalDatabase(): void {
  const host = (process.env.DB_HOST ?? '').trim().toLowerCase();
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    throw new Error('Refusing to apply because DB_HOST is not local.');
  }
}

export async function readLocalChannels(podcasts: readonly V4PodcastKey[]): Promise<LocalCatalog> {
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

function podcastPageUrl(id: string): string {
  return `https://podverse.fm/podcast/${id}`;
}

type ExistingShow = {
  podcastIndexId: number | null;
  url: string | null;
  channelIdText: string | null;
};

export async function readExistingShows(
  creates: readonly CatalogSeedCreate[]
): Promise<ExistingShow[]> {
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

export function refusalForExisting(
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

type EnsureChannelResult = {
  outcome: 'created' | 'present';
  feedId: number;
};

export async function ensureChannel(show: CatalogSeedCreate): Promise<EnsureChannelResult> {
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
    return { outcome: 'present', feedId: feed.id };
  }
  const channel = new Channel();
  channel.id_text = show.id;
  channel.feed = feed;
  channel.feed_id = feed.id;
  channel.medium_id = MediumEnum.Podcast;
  channel.medium = MediumEnum.Podcast;
  await getDataSourceReadWrite().getRepository(Channel).save(channel);
  return { outcome: 'created', feedId: feed.id };
}

/**
 * Written before the first parse is queued, so a first parse that succeeds finishes after the
 * job's `created_at` and the retry completes without parsing.
 */
export async function scheduleRetries(feedIds: readonly number[]): Promise<void> {
  const runAfter = new Date(Date.now() + V4_MIGRATION_FEED_RETRY_FIRST_DELAY_MS);
  for (const feedId of feedIds) {
    await scheduleV4MigrationFeedRetry(feedId, runAfter);
  }
}

export async function queueParses(shows: readonly CatalogSeedCreate[]): Promise<void> {
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
