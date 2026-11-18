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
export type LegacyPodcastLookupChannelMaps<TChannel = DTOLegacyPodcastLookupChannel> = {
  byIdText: ReadonlyMap<string, TChannel>;
  byPodcastIndexId: ReadonlyMap<string, TChannel>;
  byFeedUrl: ReadonlyMap<string, TChannel>;
};

/** Directory channel, feed URL, blocked, or not_here for one legacy podcast id. */
export type LegacyPodcastResolution<TChannel> =
  | { kind: 'channel'; channel: TChannel }
  | { kind: 'feed_url'; feed_url: string }
  | { kind: 'blocked' }
  | { kind: 'not_here' };

/** Rows and eligible channels for a batch of legacy podcast ids, before list artwork. */
export type LegacyPodcastChannelResolution = {
  rowsByLegacyId: ReadonlyMap<string, LegacyPodcastLookupRow>;
  channels: LegacyPodcastLookupChannelMaps<Channel>;
};

/** Relations `channelPassesDirectoryMatchEligibility` reads. */
export const LEGACY_LOOKUP_CHANNEL_RELATIONS: FindOptionsRelations<Channel> = {
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

/**
 * Same order as a podcast lookup answer, without the podcast id: no row is not_here, a dropped
 * row is blocked, then the mapped channel, the Podcast Index id, and the feed URL. A feed URL
 * with no directory channel is feed_url.
 */
export function resolveLegacyPodcastAnswer<TChannel>(
  podcastId: string,
  rowsByLegacyId: ReadonlyMap<string, LegacyPodcastLookupRow>,
  channels: LegacyPodcastLookupChannelMaps<TChannel>
): LegacyPodcastResolution<TChannel> {
  const row = rowsByLegacyId.get(podcastId);
  if (row === undefined) {
    return { kind: 'not_here' };
  }
  if (row.status === 'dropped') {
    return { kind: 'blocked' };
  }
  if (row.v5IdText !== null) {
    const channel = channels.byIdText.get(row.v5IdText);
    if (channel !== undefined) {
      return { kind: 'channel', channel };
    }
  }
  if (row.resolveKey !== null) {
    const channel = channels.byPodcastIndexId.get(row.resolveKey);
    if (channel !== undefined) {
      return { kind: 'channel', channel };
    }
  }
  if (row.v4FeedUrl !== null) {
    const channel = channels.byFeedUrl.get(row.v4FeedUrl);
    if (channel !== undefined) {
      return { kind: 'channel', channel };
    }
    return { kind: 'feed_url', feed_url: row.v4FeedUrl };
  }
  return { kind: 'not_here' };
}

function answerForId(
  podcastId: string,
  rowsByLegacyId: ReadonlyMap<string, LegacyPodcastLookupRow>,
  channels: LegacyPodcastLookupChannelMaps
): DTOLegacyPodcastLookupAnswer {
  const resolution = resolveLegacyPodcastAnswer(podcastId, rowsByLegacyId, channels);
  switch (resolution.kind) {
    case 'channel':
      return { podcast_id: podcastId, kind: 'channel', channel: resolution.channel };
    case 'feed_url':
      return { podcast_id: podcastId, kind: 'feed_url', feed_url: resolution.feed_url };
    case 'blocked':
      return { podcast_id: podcastId, kind: 'blocked' };
    case 'not_here':
      return { podcast_id: podcastId, kind: 'not_here' };
  }
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

function toDtoMap(
  hits: ReadonlyMap<string, Channel>,
  channelDtos: ReadonlyMap<number, DTOLegacyPodcastLookupChannel>
): Map<string, DTOLegacyPodcastLookupChannel> {
  const dtos = new Map<string, DTOLegacyPodcastLookupChannel>();
  for (const [key, channel] of hits) {
    const dto = channelDtos.get(channel.id);
    if (dto !== undefined) {
      dtos.set(key, dto);
    }
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

/** List-artwork DTO for each channel, keyed by channel primary key. One artwork query. */
export async function legacyLookupChannelDtos(
  channels: readonly Channel[]
): Promise<Map<number, DTOLegacyPodcastLookupChannel>> {
  const artwork = await listArtworkByChannelId(channels.map((channel) => channel.id));
  const dtos = new Map<number, DTOLegacyPodcastLookupChannel>();
  for (const channel of channels) {
    if (dtos.has(channel.id)) {
      continue;
    }
    dtos.set(channel.id, {
      id_text: channel.id_text,
      title: channel.title,
      medium_id: channel.medium_id,
      image_url: artwork.get(channel.id) ?? null,
    });
  }
  return dtos;
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
    const resolved = await this.resolveChannels(podcastIds);
    const channelDtos = await legacyLookupChannelDtos([
      ...resolved.channels.byIdText.values(),
      ...resolved.channels.byPodcastIndexId.values(),
      ...resolved.channels.byFeedUrl.values(),
    ]);

    return orderLegacyPodcastLookupAnswers(podcastIds, resolved.rowsByLegacyId, {
      byIdText: toDtoMap(resolved.channels.byIdText, channelDtos),
      byPodcastIndexId: toDtoMap(resolved.channels.byPodcastIndexId, channelDtos),
      byFeedUrl: toDtoMap(resolved.channels.byFeedUrl, channelDtos),
    });
  }

  /**
   * Podcast map rows and the eligible directory channels each lookup found.
   * Dropped rows stay in `rowsByLegacyId` and are left out of the channel passes.
   */
  async resolveChannels(podcastIds: readonly string[]): Promise<LegacyPodcastChannelResolution> {
    const rows = await this.loadRows(podcastIds);
    const rowsByLegacyId = new Map(rows.map((row) => [row.legacyId, row]));
    const candidates = rows.filter((row) => row.status !== 'dropped');
    const byIdText = await this.channelsForMappedIdTexts(candidates);
    const byPodcastIndexId = await this.channelsForPodcastIndexIds(candidates, byIdText);
    const byFeedUrl = await this.channelsForFeedUrls(candidates, byIdText, byPodcastIndexId);
    return {
      rowsByLegacyId,
      channels: { byIdText, byPodcastIndexId, byFeedUrl },
    };
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
    const channels = await this.channelService.getManyByIdText(
      idTexts,
      LEGACY_LOOKUP_CHANNEL_RELATIONS
    );
    const eligible = new Map<string, Channel>();
    for (const channel of channels) {
      if (channelPassesDirectoryMatchEligibility(channel)) {
        eligible.set(channel.id_text, channel);
      }
    }
    return eligible;
  }

  private async eligibleByPodcastIndexId(ids: readonly number[]): Promise<Map<number, Channel>> {
    const channels = await this.channelService.getManyByPodcastIndexIds(
      ids,
      LEGACY_LOOKUP_CHANNEL_RELATIONS
    );
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
