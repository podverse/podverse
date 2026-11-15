import { AppDataSourceRead } from '@orm/db/index.js';
import { Channel } from '@orm/entities/channel/channel.js';
import type { Feed } from '@orm/entities/feed/feed.js';
import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { deriveHttpsAndHttpUrlsFromInput } from '@orm/services/feed/feed.helpers.js';
import { ItemService } from '@orm/services/item/item.js';
import type { FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { In, IsNull, Not } from 'typeorm';

import type { DTOChannelDirectoryMatch } from '@podverse/helpers';
import {
  formatGuidEnclosureUrl,
  isDeviceLocalAddByRSSGuid,
  isValidReliableUUID,
} from '@podverse/helpers';
import { addByRSSDirectoryMatchUrlVariants } from '@podverse/helpers-validation';

export type AddByRSSListedFeedLookupRef = {
  feedGuid: string;
  feedUrl: string | null;
};

export type AddByRSSDirectoryChannelMatchRow = {
  channelIdText: string;
  title: string | null;
  mediumId: number | null;
};

const DIRECTORY_MATCH_RELATIONS: FindOptionsRelations<Channel> = {
  feed: { feed_lifecycle_state: { feed_lifecycle_state_type: true } },
};

type PendingUrlRef = {
  guidKey: string;
  httpsUrl: string;
  httpUrl: string;
};

function listedFeedGuidKey(feedGuid: string): string {
  return feedGuid.trim().toLowerCase();
}

function hasFeedUrl(feedUrl: string | null): feedUrl is string {
  return feedUrl !== null && feedUrl !== '';
}

/**
 * Parsed, publicly visible channels. Callers add the feed-url or podcast-guid predicate.
 * A missing lifecycle row still counts as active; that check stays in memory because a SQL
 * filter on the lifecycle relation would drop a feed that has no row.
 */
function publiclyVisibleParsedChannelWhere(
  feed: FindOptionsWhere<Feed>
): FindOptionsWhere<Channel> {
  return {
    channel_about: { id: Not(IsNull()) },
    feed: {
      ...feed,
      feed_policy: { public_visible: true },
    },
  };
}

/**
 * Parsed, publicly listed, and active or pending archive. A feed with no lifecycle row counts
 * as active. The same rule as a directory feed-URL match.
 */
export function channelPassesDirectoryMatchEligibility(channel: Channel): boolean {
  if (!channel.channel_about) {
    return false;
  }
  if (channel.feed?.feed_policy?.public_visible !== true) {
    return false;
  }
  return feedLifecycleAllowsDirectoryMatch(channel);
}

/** A feed with no lifecycle row counts as active. */
function feedLifecycleAllowsDirectoryMatch(channel: Channel): boolean {
  const stateKey = channel.feed?.feed_lifecycle_state?.feed_lifecycle_state_type?.state_key;
  if (stateKey === undefined || stateKey === null) {
    return true;
  }
  return (
    stateKey === FeedLifecycleStateKeyEnum.Active ||
    stateKey === FeedLifecycleStateKeyEnum.PendingArchive
  );
}

function toMatchRow(channel: Channel): AddByRSSDirectoryChannelMatchRow {
  return {
    channelIdText: channel.id_text,
    title: channel.title,
    mediumId: channel.medium_id,
  };
}

function reliableGuidKeys(refs: readonly AddByRSSListedFeedLookupRef[]): string[] {
  const keys = new Set<string>();
  for (const ref of refs) {
    const key = listedFeedGuidKey(ref.feedGuid);
    if (isValidReliableUUID(key)) {
      keys.add(key);
    }
  }
  return [...keys];
}

function urlMatchGuidAllowed(podcastGuid: string | null, refGuidKey: string): boolean {
  if (podcastGuid === null) {
    return true;
  }
  return podcastGuid.toLowerCase() === refGuidKey;
}

/** A missing client guid does not reject a channel that has one. A different guid does. */
function feedGuidAllowsUrlMatch(podcastGuid: string | null, feedGuid: string | null): boolean {
  if (feedGuid === null) {
    return true;
  }
  return urlMatchGuidAllowed(podcastGuid, feedGuid.trim().toLowerCase());
}

function toDirectoryMatch(channel: Channel): DTOChannelDirectoryMatch {
  return {
    id_text: channel.id_text,
    title: channel.title,
    medium_id: channel.medium_id,
  };
}

/**
 * When several directory rows match one input, the row whose URL comes first in that input's
 * variant list wins.
 */
function bestChannelForVariants(
  channels: readonly Channel[],
  variants: readonly string[],
  feedGuid: string | null
): Channel | undefined {
  const variantIndex = new Map(variants.map((url, index) => [url, index]));
  let best: { channel: Channel; index: number } | undefined;
  for (const channel of channels) {
    const url = channel.feed?.url;
    if (typeof url !== 'string') {
      continue;
    }
    const index = variantIndex.get(url);
    if (index === undefined) {
      continue;
    }
    if (!feedLifecycleAllowsDirectoryMatch(channel)) {
      continue;
    }
    if (!feedGuidAllowsUrlMatch(channel.podcast_guid, feedGuid)) {
      continue;
    }
    if (best === undefined || index < best.index) {
      best = { channel, index };
    }
  }
  return best?.channel;
}

/** Lowest channel id wins when both URL schemes exist as separate feeds. */
function byAscendingId(channels: readonly Channel[]): Channel[] {
  return [...channels].sort((left, right) => left.id - right.id);
}

function urlMatchForRef(channels: readonly Channel[], pending: PendingUrlRef): Channel | undefined {
  const allowedUrls = new Set([pending.httpsUrl, pending.httpUrl]);
  return channels.find((channel) => {
    const url = channel.feed?.url;
    if (url === undefined || !allowedUrls.has(url)) {
      return false;
    }
    if (!feedLifecycleAllowsDirectoryMatch(channel)) {
      return false;
    }
    return urlMatchGuidAllowed(channel.podcast_guid, pending.guidKey);
  });
}

export class ChannelAddByRSSDirectoryMatchService {
  private readonly repositoryRead: Repository<Channel>;
  private readonly itemService: ItemService;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(Channel);
    this.itemService = new ItemService();
  }

  /**
   * Directory channels for feeds an Add by RSS publisher feed lists, keyed by the ref's lowercased
   * guid. Only parsed, publicly visible channels whose feed is active or pending archive match.
   * A guid match wins; otherwise a feed URL match counts when the channel has no guid or the same
   * guid. Reads only.
   */
  async getForListedFeeds(
    refs: readonly AddByRSSListedFeedLookupRef[]
  ): Promise<Map<string, AddByRSSDirectoryChannelMatchRow>> {
    const matches = new Map<string, AddByRSSDirectoryChannelMatchRow>();
    if (refs.length === 0) {
      return matches;
    }

    const guids = reliableGuidKeys(refs);
    if (guids.length > 0) {
      const channels = await this.repositoryRead.find({
        where: {
          podcast_guid: In(guids),
          ...publiclyVisibleParsedChannelWhere({}),
        },
        relations: DIRECTORY_MATCH_RELATIONS,
      });
      for (const channel of channels) {
        if (!feedLifecycleAllowsDirectoryMatch(channel)) {
          continue;
        }
        if (typeof channel.podcast_guid !== 'string') {
          continue;
        }
        matches.set(channel.podcast_guid.toLowerCase(), toMatchRow(channel));
      }
    }

    const pending: PendingUrlRef[] = [];
    const variants: string[] = [];
    const seenVariants = new Set<string>();
    for (const ref of refs) {
      const guidKey = listedFeedGuidKey(ref.feedGuid);
      if (matches.has(guidKey) || !hasFeedUrl(ref.feedUrl)) {
        continue;
      }
      const { httpsUrl, httpUrl } = deriveHttpsAndHttpUrlsFromInput(ref.feedUrl);
      pending.push({ guidKey, httpsUrl, httpUrl });
      for (const variant of [httpsUrl, httpUrl]) {
        if (!seenVariants.has(variant)) {
          seenVariants.add(variant);
          variants.push(variant);
        }
      }
    }

    if (variants.length === 0) {
      return matches;
    }

    const channels = byAscendingId(
      await this.repositoryRead.find({
        where: publiclyVisibleParsedChannelWhere({ url: In(variants) }),
        relations: DIRECTORY_MATCH_RELATIONS,
      })
    );

    for (const ref of pending) {
      if (matches.has(ref.guidKey)) {
        continue;
      }
      const channel = urlMatchForRef(channels, ref);
      if (channel !== undefined) {
        matches.set(ref.guidKey, toMatchRow(channel));
      }
    }

    return matches;
  }

  /**
   * Directory channels for Add by RSS feed URLs, keyed by the input URL as given. A URL match
   * counts when the channel is parsed and publicly visible and its feed is active or pending
   * archive. Scheme, host case, a default port, a fragment, and a trailing slash are not
   * different feeds. A client guid that differs from the channel guid is not a match. A guid
   * without a URL match is not a match. Reads only.
   */
  async getForFeedUrls(
    refs: readonly { feedUrl: string; feedGuid: string | null }[]
  ): Promise<Map<string, { channel: Channel; match: DTOChannelDirectoryMatch }>> {
    const matches = new Map<string, { channel: Channel; match: DTOChannelDirectoryMatch }>();
    if (refs.length === 0) {
      return matches;
    }

    const pending: { feedUrl: string; feedGuid: string | null; variants: string[] }[] = [];
    const queryUrls: string[] = [];
    const seenUrls = new Set<string>();
    for (const ref of refs) {
      const variants = addByRSSDirectoryMatchUrlVariants(ref.feedUrl);
      if (variants.length === 0) {
        continue;
      }
      pending.push({ feedUrl: ref.feedUrl, feedGuid: ref.feedGuid, variants });
      for (const variant of variants) {
        if (!seenUrls.has(variant)) {
          seenUrls.add(variant);
          queryUrls.push(variant);
        }
      }
    }

    if (queryUrls.length === 0) {
      return matches;
    }

    const channels = await this.repositoryRead.find({
      where: publiclyVisibleParsedChannelWhere({ url: In(queryUrls) }),
      relations: DIRECTORY_MATCH_RELATIONS,
    });

    for (const ref of pending) {
      const channel = bestChannelForVariants(channels, ref.variants, ref.feedGuid);
      if (channel !== undefined) {
        matches.set(ref.feedUrl, { channel, match: toDirectoryMatch(channel) });
      }
    }

    return matches;
  }

  /**
   * Directory item id for each input, in input order. A guid match wins. An unmatched item, or
   * one whose guid was made up on a device, falls through to the enclosure URL. Active items only.
   * Null when neither matches.
   */
  async getItemIdTextsForChannel(
    channel: Channel,
    items: readonly { guid: string | null; enclosureUrl: string | null }[]
  ): Promise<(string | null)[]> {
    const idTexts: (string | null)[] = items.map(() => null);
    if (items.length === 0) {
      return idTexts;
    }

    const guidIndexes = new Map<string, number[]>();
    for (let index = 0; index < items.length; index += 1) {
      const guid = items[index]?.guid;
      if (guid === null || guid === undefined || guid === '') {
        continue;
      }
      if (isDeviceLocalAddByRSSGuid(guid, channel.id_text)) {
        continue;
      }
      const indexes = guidIndexes.get(guid);
      if (indexes === undefined) {
        guidIndexes.set(guid, [index]);
      } else {
        indexes.push(index);
      }
    }

    const matched = new Set<number>();
    if (guidIndexes.size > 0) {
      const byGuid = await this.itemService.getManyByGuid(channel, [...guidIndexes.keys()]);
      for (const item of byGuid) {
        if (typeof item.guid !== 'string') {
          continue;
        }
        const indexes = guidIndexes.get(item.guid);
        if (indexes === undefined) {
          continue;
        }
        for (const index of indexes) {
          idTexts[index] = item.id_text;
          matched.add(index);
        }
      }
    }

    const enclosureIndexes = new Map<string, number[]>();
    for (let index = 0; index < items.length; index += 1) {
      if (matched.has(index)) {
        continue;
      }
      const enclosureUrl = items[index]?.enclosureUrl;
      if (enclosureUrl === null || enclosureUrl === undefined || enclosureUrl === '') {
        continue;
      }
      const key = formatGuidEnclosureUrl(enclosureUrl);
      const indexes = enclosureIndexes.get(key);
      if (indexes === undefined) {
        enclosureIndexes.set(key, [index]);
      } else {
        indexes.push(index);
      }
    }

    if (enclosureIndexes.size > 0) {
      const byEnclosure = await this.itemService.getManyByGuidEnclosureUrl(channel, [
        ...enclosureIndexes.keys(),
      ]);
      for (const item of byEnclosure) {
        if (typeof item.guid_enclosure_url !== 'string') {
          continue;
        }
        const indexes = enclosureIndexes.get(item.guid_enclosure_url);
        if (indexes === undefined) {
          continue;
        }
        for (const index of indexes) {
          if (idTexts[index] === null) {
            idTexts[index] = item.id_text;
          }
        }
      }
    }

    return idTexts;
  }
}
