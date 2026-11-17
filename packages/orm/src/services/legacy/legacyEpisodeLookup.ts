import { AppDataSourceRead } from '@orm/db/index.js';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { Item } from '@orm/entities/item/item.js';
import {
  ChannelAddByRSSDirectoryMatchService,
  channelPassesDirectoryMatchEligibility,
} from '@orm/services/channel/channelAddByRSSDirectoryMatch.js';
import { ChannelMergeRedirectService } from '@orm/services/channel/channelMergeRedirect.js';
import { ItemService } from '@orm/services/item/item.js';

import type {
  DTOLegacyEpisodeLookupAnswer,
  DTOLegacyEpisodeLookupRef,
  DTOLegacyPodcastLookupChannel,
} from '@podverse/helpers';

import type { LegacyPodcastResolution } from './legacyPodcastLookup.js';
import {
  LEGACY_LOOKUP_CHANNEL_RELATIONS,
  legacyLookupChannelDtos,
  LegacyPodcastLookupService,
  resolveLegacyPodcastAnswer,
} from './legacyPodcastLookup.js';

export type LegacyEpisodeMappedItem = {
  itemIdText: string;
  channel: DTOLegacyPodcastLookupChannel;
};

export type LegacyEpisodeLookupInputs = {
  /** Keyed by v4 podcast id. A podcast id with no entry is not_here. */
  podcastAnswers: ReadonlyMap<string, LegacyPodcastResolution<DTOLegacyPodcastLookupChannel>>;
  /** Keyed by v4 episode id, from mapped episode rows. */
  mappedItems: ReadonlyMap<string, LegacyEpisodeMappedItem>;
  /**
   * Per input index, the item the guid-then-media-URL pass found.
   * Null when none ran or none hit.
   */
  matchedItemIdTexts: readonly (string | null)[];
};

type MappedChannelItem = {
  itemIdText: string;
  channel: Channel;
};

const NOT_HERE: LegacyPodcastResolution<Channel> = { kind: 'not_here' };

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

function nullableText(value: string | null): string | null {
  if (value === null || value.length === 0) {
    return null;
  }
  return value;
}

function readEpisodeRows(value: unknown): { legacyId: string; v5IdText: string }[] {
  const rows: { legacyId: string; v5IdText: string }[] = [];
  for (const row of rowsOf(value)) {
    const legacyId = textOrNull(row.legacy_id);
    const v5IdText = textOrNull(row.v5_id_text);
    if (legacyId === null || v5IdText === null) {
      continue;
    }
    rows.push({ legacyId, v5IdText });
  }
  return rows;
}

function eligibleChannel(item: Item): Channel | null {
  const channel = item.channel;
  if (!channel?.id_text) {
    return null;
  }
  if (!channelPassesDirectoryMatchEligibility(channel)) {
    return null;
  }
  return channel;
}

function dtoForChannel(
  channel: Channel,
  dtos: ReadonlyMap<number, DTOLegacyPodcastLookupChannel>
): DTOLegacyPodcastLookupChannel {
  const dto = dtos.get(channel.id);
  if (dto !== undefined) {
    return dto;
  }
  return {
    id_text: channel.id_text,
    title: channel.title,
    medium_id: channel.medium_id,
    image_url: null,
  };
}

function resolutionWithDtoChannel(
  resolution: LegacyPodcastResolution<Channel>,
  dtos: ReadonlyMap<number, DTOLegacyPodcastLookupChannel>
): LegacyPodcastResolution<DTOLegacyPodcastLookupChannel> {
  if (resolution.kind !== 'channel') {
    return resolution;
  }
  return { kind: 'channel', channel: dtoForChannel(resolution.channel, dtos) };
}

function answerForRef(
  ref: DTOLegacyEpisodeLookupRef,
  index: number,
  inputs: LegacyEpisodeLookupInputs
): DTOLegacyEpisodeLookupAnswer {
  const podcast = inputs.podcastAnswers.get(ref.podcast_id) ?? { kind: 'not_here' };
  if (podcast.kind === 'blocked') {
    return { episode_id: ref.episode_id, kind: 'blocked' };
  }
  const mapped = inputs.mappedItems.get(ref.episode_id);
  if (mapped !== undefined) {
    return {
      episode_id: ref.episode_id,
      kind: 'item',
      item_id_text: mapped.itemIdText,
      channel: mapped.channel,
    };
  }
  if (podcast.kind === 'channel') {
    const matched = inputs.matchedItemIdTexts[index];
    if (typeof matched === 'string') {
      return {
        episode_id: ref.episode_id,
        kind: 'item',
        item_id_text: matched,
        channel: podcast.channel,
      };
    }
    return { episode_id: ref.episode_id, kind: 'channel', channel: podcast.channel };
  }
  if (podcast.kind === 'feed_url') {
    return { episode_id: ref.episode_id, kind: 'feed_url', feed_url: podcast.feed_url };
  }
  return { episode_id: ref.episode_id, kind: 'not_here' };
}

/**
 * One answer per ref, in input order. A duplicate episode id is answered once per copy.
 * A blocked show wins over a mapped episode. Otherwise a mapped episode wins, then a guid
 * or media URL match inside a resolved channel, then the feed URL, then not_here.
 */
export function orderLegacyEpisodeLookupAnswers(
  refs: readonly DTOLegacyEpisodeLookupRef[],
  inputs: LegacyEpisodeLookupInputs
): DTOLegacyEpisodeLookupAnswer[] {
  return refs.map((ref, index) => answerForRef(ref, index, inputs));
}

/**
 * One answer per input, in input order. A blocked show wins, then a mapped episode row,
 * then a guid match and then a media URL match inside the show's channel. Reads only and
 * does not queue a parse.
 */
export class LegacyEpisodeLookupService {
  private readonly podcastLookup: LegacyPodcastLookupService;
  private readonly itemService: ItemService;
  private readonly mergeRedirects: ChannelMergeRedirectService;
  private readonly directoryMatch: ChannelAddByRSSDirectoryMatchService;

  constructor() {
    this.podcastLookup = new LegacyPodcastLookupService();
    this.itemService = new ItemService();
    this.mergeRedirects = new ChannelMergeRedirectService();
    this.directoryMatch = new ChannelAddByRSSDirectoryMatchService();
  }

  async lookup(
    refs: readonly DTOLegacyEpisodeLookupRef[]
  ): Promise<DTOLegacyEpisodeLookupAnswer[]> {
    const podcastAnswers = await this.podcastResolutions(refs);
    const mapped = await this.mappedItems(refs.map((ref) => ref.episode_id));
    const matchedItemIdTexts = await this.matchUnmapped(refs, podcastAnswers, mapped);
    const channelDtos = await legacyLookupChannelDtos(
      distinctChannels(podcastAnswers.values(), mapped.values())
    );
    const dtoPodcasts = new Map<string, LegacyPodcastResolution<DTOLegacyPodcastLookupChannel>>();
    for (const [podcastId, resolution] of podcastAnswers) {
      dtoPodcasts.set(podcastId, resolutionWithDtoChannel(resolution, channelDtos));
    }
    const dtoMapped = new Map<string, LegacyEpisodeMappedItem>();
    for (const [episodeId, item] of mapped) {
      dtoMapped.set(episodeId, {
        itemIdText: item.itemIdText,
        channel: dtoForChannel(item.channel, channelDtos),
      });
    }
    return orderLegacyEpisodeLookupAnswers(refs, {
      podcastAnswers: dtoPodcasts,
      mappedItems: dtoMapped,
      matchedItemIdTexts,
    });
  }

  private async podcastResolutions(
    refs: readonly DTOLegacyEpisodeLookupRef[]
  ): Promise<Map<string, LegacyPodcastResolution<Channel>>> {
    const podcastIds = refs.map((ref) => ref.podcast_id);
    const resolved = await this.podcastLookup.resolveChannels(podcastIds);
    const answers = new Map<string, LegacyPodcastResolution<Channel>>();
    for (const podcastId of uniqueStrings(podcastIds)) {
      answers.set(
        podcastId,
        resolveLegacyPodcastAnswer(podcastId, resolved.rowsByLegacyId, resolved.channels)
      );
    }
    return answers;
  }

  private async loadEpisodeIdTexts(episodeIds: readonly string[]): Promise<Map<string, string>> {
    const unique = uniqueStrings(episodeIds);
    const mapped = new Map<string, string>();
    if (unique.length === 0) {
      return mapped;
    }
    const value: unknown = await AppDataSourceRead.manager.query(
      `SELECT legacy_id, v5_id_text
       FROM legacy_id_map
       WHERE legacy_kind = 'episode'
         AND status = 'mapped'
         AND v5_id_text IS NOT NULL
         AND legacy_id = ANY($1::text[])`,
      [unique]
    );
    for (const row of readEpisodeRows(value)) {
      if (!mapped.has(row.legacyId)) {
        mapped.set(row.legacyId, row.v5IdText);
      }
    }
    return mapped;
  }

  private async mappedItems(
    episodeIds: readonly string[]
  ): Promise<Map<string, MappedChannelItem>> {
    const rows = await this.loadEpisodeIdTexts(episodeIds);
    const moves = await this.mergeRedirects.itemMoves(uniqueStrings([...rows.values()]));
    const survivorByFrom = new Map(moves.map((move) => [move.from_id_text, move.to_id_text]));
    const targetByEpisode = new Map<string, string>();
    for (const [episodeId, itemIdText] of rows) {
      targetByEpisode.set(episodeId, survivorByFrom.get(itemIdText) ?? itemIdText);
    }
    const items = await this.itemService.getManyActiveByIdText([...targetByEpisode.values()], {
      channel: LEGACY_LOOKUP_CHANNEL_RELATIONS,
    });
    const itemByIdText = new Map(items.map((item) => [item.id_text, item]));
    const mapped = new Map<string, MappedChannelItem>();
    for (const [episodeId, targetId] of targetByEpisode) {
      const item = itemByIdText.get(targetId);
      if (item === undefined) {
        continue;
      }
      const channel = eligibleChannel(item);
      if (channel === null) {
        continue;
      }
      mapped.set(episodeId, { itemIdText: item.id_text, channel });
    }
    return mapped;
  }

  private async matchUnmapped(
    refs: readonly DTOLegacyEpisodeLookupRef[],
    podcastAnswers: ReadonlyMap<string, LegacyPodcastResolution<Channel>>,
    mapped: ReadonlyMap<string, MappedChannelItem>
  ): Promise<(string | null)[]> {
    const matched: (string | null)[] = refs.map(() => null);
    const groups = new Map<string, { channel: Channel; indexes: number[] }>();
    for (let index = 0; index < refs.length; index += 1) {
      const ref = refs[index];
      if (ref === undefined || mapped.has(ref.episode_id)) {
        continue;
      }
      const podcast = podcastAnswers.get(ref.podcast_id) ?? NOT_HERE;
      if (podcast.kind !== 'channel') {
        continue;
      }
      const group = groups.get(podcast.channel.id_text);
      if (group === undefined) {
        groups.set(podcast.channel.id_text, { channel: podcast.channel, indexes: [index] });
      } else {
        group.indexes.push(index);
      }
    }

    for (const group of groups.values()) {
      const asked = group.indexes.map((index) => {
        const ref = refs[index];
        return {
          guid: nullableText(ref?.guid ?? null),
          enclosureUrl: nullableText(ref?.media_url ?? null),
        };
      });
      const hits = await this.directoryMatch.getItemIdTextsForChannel(group.channel, asked);
      for (let offset = 0; offset < group.indexes.length; offset += 1) {
        const index = group.indexes[offset];
        const hit = hits[offset];
        if (index === undefined || typeof hit !== 'string') {
          continue;
        }
        matched[index] = hit;
      }
    }
    return matched;
  }
}

function distinctChannels(
  resolutions: Iterable<LegacyPodcastResolution<Channel>>,
  mapped: Iterable<MappedChannelItem>
): Channel[] {
  const channels: Channel[] = [];
  const seen = new Set<number>();
  const add = (channel: Channel) => {
    if (seen.has(channel.id)) {
      return;
    }
    seen.add(channel.id);
    channels.push(channel);
  };
  for (const resolution of resolutions) {
    if (resolution.kind === 'channel') {
      add(resolution.channel);
    }
  }
  for (const item of mapped) {
    add(item.channel);
  }
  return channels;
}
