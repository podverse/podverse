import { AppDataSourceRead } from '@orm/db/index.js';
import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelService } from '@orm/services/channel/channel.js';
import {
  ChannelAddByRSSDirectoryMatchService,
  channelPassesDirectoryMatchEligibility,
} from '@orm/services/channel/channelAddByRSSDirectoryMatch.js';
import { ChannelMergeRedirectService } from '@orm/services/channel/channelMergeRedirect.js';
import type { FindOptionsRelations } from 'typeorm';

import type {
  DTOLegacyPodcastLookupAnswer,
  DTOLegacyPodcastLookupChannel,
} from '@podverse/helpers';
import { primaryChannelListArtworkUrl } from '@podverse/helpers';

/** One `legacy_id_map` podcast row the lookup orders against. */
export type LegacyPodcastLookupRow = {
  legacyId: string;
  status: string;
  v5IdText: string | null;
  resolveKey: string | null;
  v4FeedUrl: string | null;
};

/**
 * Eligible channels for the three lookups, already followed to a merge survivor.
 * `byIdText` is keyed by the row's channel id. `byPodcastIndexId` is keyed by the row's
 * resolve key. `byFeedUrl` is keyed by the row's feed URL.
 */
export type LegacyPodcastLookupChannelMaps = {
  byIdText: ReadonlyMap<string, DTOLegacyPodcastLookupChannel>;
  byPodcastIndexId: ReadonlyMap<string, DTOLegacyPodcastLookupChannel>;
  byFeedUrl: ReadonlyMap<string, DTOLegacyPodcastLookupChannel>;
};

const LOOKUP_RELATIONS: FindOptionsRelations<Channel> = {
  channel_about: true,
  feed: {
    feed_policy: true,
    feed_lifecycle_state: { feed_lifecycle_state_type: true },
  },
};

type ArtworkImage = {
  url: string;
  image_width_size: number | null;
  is_resized: boolean;
};

function isRow(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  for (const entry of value) {
    if (isRow(entry)) {
      rows.push(entry);
    }
  }
  return rows;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integerOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function podcastIndexIdFromResolveKey(resolveKey: string | null): number | null {
  if (resolveKey === null || !/^[1-9]\d*$/.test(resolveKey)) {
    return null;
  }
  const parsed = Number(resolveKey);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function readMapRows(value: unknown): LegacyPodcastLookupRow[] {
  const rows: LegacyPodcastLookupRow[] = [];
  for (const row of rowsOf(value)) {
    const legacyId = textOrNull(row.legacy_id);
    const status = textOrNull(row.status);
    if (legacyId === null || status === null) {
      continue;
    }
    rows.push({
      legacyId,
      status,
      v5IdText: textOrNull(row.v5_id_text),
      resolveKey: textOrNull(row.resolve_key),
      v4FeedUrl: textOrNull(row.v4_feed_url),
    });
  }
  return rows;
}

function answerForId(
  podcastId: string,
  rowsByLegacyId: ReadonlyMap<string, LegacyPodcastLookupRow>,
  channels: LegacyPodcastLookupChannelMaps
): DTOLegacyPodcastLookupAnswer {
  const row = rowsByLegacyId.get(podcastId);
  if (row === undefined) {
    return { podcast_id: podcastId, kind: 'not_here' };
  }
  if (row.status === 'dropped') {
    return { podcast_id: podcastId, kind: 'blocked' };
  }
  if (row.v5IdText !== null) {
    const channel = channels.byIdText.get(row.v5IdText);
    if (channel !== undefined) {
      return { podcast_id: podcastId, kind: 'channel', channel };
    }
  }
  if (row.resolveKey !== null) {
    const channel = channels.byPodcastIndexId.get(row.resolveKey);
    if (channel !== undefined) {
      return { podcast_id: podcastId, kind: 'channel', channel };
    }
  }
  if (row.v4FeedUrl !== null) {
    const channel = channels.byFeedUrl.get(row.v4FeedUrl);
    if (channel !== undefined) {
      return { podcast_id: podcastId, kind: 'channel', channel };
    }
    return { podcast_id: podcastId, kind: 'feed_url', feed_url: row.v4FeedUrl };
  }
  return { podcast_id: podcastId, kind: 'not_here' };
}

/**
 * One answer per input id, in input order, including duplicates. A dropped row is blocked.
 * Otherwise the mapped channel wins, then the Podcast Index id, then a directory match on the
 * feed URL. A feed URL with no directory channel is `feed_url`. Anything else is `not_here`.
 */
export function orderLegacyPodcastLookupAnswers(
  podcastIds: readonly string[],
  rowsByLegacyId: ReadonlyMap<string, LegacyPodcastLookupRow>,
  channels: LegacyPodcastLookupChannelMaps
): DTOLegacyPodcastLookupAnswer[] {
  return podcastIds.map((podcastId) => answerForId(podcastId, rowsByLegacyId, channels));
}

function uniqueStrings(values: readonly string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    unique.push(value);
  }
  return unique;
}

function toLookupChannel(
  channel: Channel,
  artwork: ReadonlyMap<number, string | null>
): DTOLegacyPodcastLookupChannel {
  return {
    id_text: channel.id_text,
    title: channel.title,
    medium_id: channel.medium_id,
    image_url: artwork.get(channel.id) ?? null,
  };
}

function toDtoMap(
  hits: ReadonlyMap<string, Channel>,
  artwork: ReadonlyMap<number, string | null>
): Map<string, DTOLegacyPodcastLookupChannel> {
  const dtos = new Map<string, DTOLegacyPodcastLookupChannel>();
  for (const [key, channel] of hits) {
    dtos.set(key, toLookupChannel(channel, artwork));
  }
  return dtos;
}

async function listArtworkByChannelId(
  channelIds: readonly number[]
): Promise<Map<number, string | null>> {
  const urls = new Map<number, string | null>();
  const unique = uniqueStrings(channelIds.map((id) => String(id)))
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id));
  if (unique.length === 0) {
    return urls;
  }

  const value: unknown = await AppDataSourceRead.manager.query(
    `SELECT channel_id, url, image_width_size, is_resized
     FROM channel_image
     WHERE channel_id = ANY($1::int[])`,
    [unique]
  );
  const grouped = new Map<number, ArtworkImage[]>();
  for (const row of rowsOf(value)) {
    const channelId = integerOrNull(row.channel_id);
    const url = textOrNull(row.url);
    if (channelId === null || url === null) {
      continue;
    }
    const image: ArtworkImage = {
      url,
      image_width_size: integerOrNull(row.image_width_size),
      is_resized: row.is_resized === true,
    };
    const list = grouped.get(channelId);
    if (list === undefined) {
      grouped.set(channelId, [image]);
    } else {
      list.push(image);
    }
  }

  for (const channelId of unique) {
    urls.set(channelId, primaryChannelListArtworkUrl(grouped.get(channelId) ?? []));
  }
  return urls;
}

/**
 * Answers each legacy podcast id in input order. A dropped map row is blocked. Otherwise the
 * first eligible directory channel wins: the mapped channel id, then the Podcast Index id on
 * the row, then the row's feed URL. A feed URL with no directory channel is returned as
 * feed_url. Anything else is not_here. Reads only and does not queue a parse.
 */
export class LegacyPodcastLookupService {
  private readonly channelService: ChannelService;
  private readonly mergeRedirects: ChannelMergeRedirectService;
  private readonly directoryMatch: ChannelAddByRSSDirectoryMatchService;

  constructor() {
    this.channelService = new ChannelService();
    this.mergeRedirects = new ChannelMergeRedirectService();
    this.directoryMatch = new ChannelAddByRSSDirectoryMatchService();
  }

  async lookup(podcastIds: readonly string[]): Promise<DTOLegacyPodcastLookupAnswer[]> {
    const rows = await this.loadRows(podcastIds);
    const rowsByLegacyId = new Map(rows.map((row) => [row.legacyId, row]));
    const candidates = rows.filter((row) => row.status !== 'dropped');
    const byIdText = await this.channelsForMappedIdTexts(candidates);
    const byPodcastIndexId = await this.channelsForPodcastIndexIds(candidates, byIdText);
    const byFeedUrl = await this.channelsForFeedUrls(candidates, byIdText, byPodcastIndexId);
    const artwork = await listArtworkByChannelId([
      ...[...byIdText.values()].map((channel) => channel.id),
      ...[...byPodcastIndexId.values()].map((channel) => channel.id),
      ...[...byFeedUrl.values()].map((channel) => channel.id),
    ]);

    return orderLegacyPodcastLookupAnswers(podcastIds, rowsByLegacyId, {
      byIdText: toDtoMap(byIdText, artwork),
      byPodcastIndexId: toDtoMap(byPodcastIndexId, artwork),
      byFeedUrl: toDtoMap(byFeedUrl, artwork),
    });
  }

  private async loadRows(podcastIds: readonly string[]): Promise<LegacyPodcastLookupRow[]> {
    const unique = uniqueStrings(podcastIds);
    if (unique.length === 0) {
      return [];
    }
    const value: unknown = await AppDataSourceRead.manager.query(
      `SELECT legacy_id, status, v5_id_text, resolve_key, v4_feed_url
       FROM legacy_id_map
       WHERE legacy_kind = 'podcast'
         AND legacy_id = ANY($1::text[])`,
      [unique]
    );
    return readMapRows(value);
  }

  private async eligibleByIdText(idTexts: readonly string[]): Promise<Map<string, Channel>> {
    const channels = await this.channelService.getManyByIdText(idTexts, LOOKUP_RELATIONS);
    const eligible = new Map<string, Channel>();
    for (const channel of channels) {
      if (channelPassesDirectoryMatchEligibility(channel)) {
        eligible.set(channel.id_text, channel);
      }
    }
    return eligible;
  }

  private async eligibleByPodcastIndexId(ids: readonly number[]): Promise<Map<number, Channel>> {
    const channels = await this.channelService.getManyByPodcastIndexIds(ids, LOOKUP_RELATIONS);
    const eligible = new Map<number, Channel>();
    const ordered = [...channels].sort((left, right) => left.id - right.id);
    for (const channel of ordered) {
      const podcastIndexId = channel.feed?.podcast_index_id;
      if (typeof podcastIndexId !== 'number' || eligible.has(podcastIndexId)) {
        continue;
      }
      if (!channelPassesDirectoryMatchEligibility(channel)) {
        continue;
      }
      eligible.set(podcastIndexId, channel);
    }
    return eligible;
  }

  private async channelsForMappedIdTexts(
    rows: readonly LegacyPodcastLookupRow[]
  ): Promise<Map<string, Channel>> {
    const hits = new Map<string, Channel>();
    const idTexts = uniqueStrings(
      rows.flatMap((row) => (row.v5IdText === null ? [] : [row.v5IdText]))
    );
    if (idTexts.length === 0) {
      return hits;
    }

    const moves = await this.mergeRedirects.channelMoves(idTexts);
    const survivorByFrom = new Map(moves.map((move) => [move.from_id_text, move.to_id_text]));
    const lookupIds = uniqueStrings(idTexts.map((idText) => survivorByFrom.get(idText) ?? idText));
    const eligible = await this.eligibleByIdText(lookupIds);
    for (const idText of idTexts) {
      const channel = eligible.get(survivorByFrom.get(idText) ?? idText);
      if (channel !== undefined) {
        hits.set(idText, channel);
      }
    }
    return hits;
  }

  private async channelsForPodcastIndexIds(
    rows: readonly LegacyPodcastLookupRow[],
    byIdText: ReadonlyMap<string, Channel>
  ): Promise<Map<string, Channel>> {
    const hits = new Map<string, Channel>();
    const pending: { resolveKey: string; podcastIndexId: number }[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.v5IdText !== null && byIdText.has(row.v5IdText)) {
        continue;
      }
      const podcastIndexId = podcastIndexIdFromResolveKey(row.resolveKey);
      if (podcastIndexId === null || row.resolveKey === null || seen.has(row.resolveKey)) {
        continue;
      }
      seen.add(row.resolveKey);
      pending.push({ resolveKey: row.resolveKey, podcastIndexId });
    }
    if (pending.length === 0) {
      return hits;
    }

    const podcastIndexIds = pending.map((row) => row.podcastIndexId);
    const survivors = await this.mergeRedirects.survivorIdTextForPodcastIndexIds(podcastIndexIds);
    const eligibleSurvivors = await this.eligibleByIdText(uniqueStrings([...survivors.values()]));
    const unresolved = podcastIndexIds.filter((id) => !survivors.has(id));
    const eligibleByPodcastIndexId = await this.eligibleByPodcastIndexId(unresolved);
    for (const row of pending) {
      const survivorIdText = survivors.get(row.podcastIndexId);
      const channel =
        survivorIdText !== undefined
          ? eligibleSurvivors.get(survivorIdText)
          : eligibleByPodcastIndexId.get(row.podcastIndexId);
      if (channel !== undefined) {
        hits.set(row.resolveKey, channel);
      }
    }
    return hits;
  }

  private async channelsForFeedUrls(
    rows: readonly LegacyPodcastLookupRow[],
    byIdText: ReadonlyMap<string, Channel>,
    byPodcastIndexId: ReadonlyMap<string, Channel>
  ): Promise<Map<string, Channel>> {
    const hits = new Map<string, Channel>();
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.v5IdText !== null && byIdText.has(row.v5IdText)) {
        continue;
      }
      if (row.resolveKey !== null && byPodcastIndexId.has(row.resolveKey)) {
        continue;
      }
      if (row.v4FeedUrl === null || seen.has(row.v4FeedUrl)) {
        continue;
      }
      seen.add(row.v4FeedUrl);
      urls.push(row.v4FeedUrl);
    }
    if (urls.length === 0) {
      return hits;
    }

    const matches = await this.directoryMatch.getForFeedUrls(
      urls.map((feedUrl) => ({ feedUrl, feedGuid: null }))
    );
    for (const url of urls) {
      const match = matches.get(url);
      if (match !== undefined) {
        hits.set(url, match.channel);
      }
    }
    return hits;
  }
}
