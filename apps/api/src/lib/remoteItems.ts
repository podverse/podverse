import { config } from '@api/config/index.js';
import { podcastIndexService } from '@api/factories/podcastIndexService.js';
import { cacheGetJson, cacheSetJson } from '@api/lib/keyvaldb/keyvaldb.js';

import type {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  RemoteItemGeneric,
} from '@podverse/helpers';

function isLocalFeedUrl(url: string | null | undefined): boolean {
  if (url === null || url === '' || url === undefined) return true;
  const lower = url.toLowerCase();
  return lower.includes('localhost') || lower.includes('127.0.0.1');
}

export type FinalRemoteItemsResult = {
  channelsAdded: DTOChannel[];
  channelsUnadded: PodcastBatchByFeedGuidResponse['feeds'];
  itemsAdded: DTOItem[];
  itemsUnadded: EpisodeByGuidResponse['episode'][];
};

export type BuildRemoteItemsFinalResultOptions = {
  /**
   * When true (publisher-feed / artist albums only), channel refs the guid batch
   * missed are looked up by feed_url via Podcast Index byfeedurl.
   */
  enrichUnaddedChannelsByFeedUrl?: boolean;
};

type PodcastIndexFeed = PodcastBatchByFeedGuidResponse['feeds'][number];

function podcastIndexFeedCacheKey(feed: PodcastIndexFeed): string | null {
  const feedGuid = feed.podcastGuid ? feed.podcastGuid : null;
  return feedGuid ? `pi:feed:${feedGuid}` : null;
}

function isPositivePodcastIndexId(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * For album refs still missing after batch-by-guid, look up Podcast Index by feed URL.
 * Returns feeds to append (deduped by podcast index id against alreadyMerged).
 */
export async function enrichMissedChannelsUnaddedByFeedUrl(
  originalChannelsUnadded: RemoteItemGeneric[],
  alreadyMerged: PodcastIndexFeed[],
  lookupByFeedUrl: (feedUrl: string) => Promise<PodcastIndexFeed | null>
): Promise<PodcastIndexFeed[]> {
  const foundGuids = new Set<string>();
  const foundIds = new Set<number>();
  for (const feed of alreadyMerged) {
    if (feed.podcastGuid) {
      foundGuids.add(feed.podcastGuid);
    }
    if (isPositivePodcastIndexId(feed.id)) {
      foundIds.add(feed.id);
    }
  }

  const extras: PodcastIndexFeed[] = [];
  const triedUrls = new Set<string>();

  for (const ref of originalChannelsUnadded) {
    if (ref.feed_guid && foundGuids.has(ref.feed_guid)) {
      continue;
    }
    const feedUrl = typeof ref.feed_url === 'string' ? ref.feed_url.trim() : '';
    if (feedUrl.length === 0 || isLocalFeedUrl(feedUrl) || triedUrls.has(feedUrl)) {
      continue;
    }
    triedUrls.add(feedUrl);

    try {
      const feed = await lookupByFeedUrl(feedUrl);
      if (feed === null || !isPositivePodcastIndexId(feed.id) || foundIds.has(feed.id)) {
        continue;
      }
      foundIds.add(feed.id);
      if (feed.podcastGuid) {
        foundGuids.add(feed.podcastGuid);
      }
      extras.push(feed);
    } catch {
      // swallow — same as guid batch path
    }
  }

  return extras;
}

async function cachePodcastIndexFeed(feed: PodcastIndexFeed): Promise<void> {
  try {
    const key = podcastIndexFeedCacheKey(feed);
    if (key) {
      await cacheSetJson<PodcastIndexFeed>(key, feed, config.keyvaldb.cacheExpiration);
    }
  } catch {
    // swallow
  }
}

async function lookupPodcastIndexFeedByUrl(feedUrl: string): Promise<PodcastIndexFeed | null> {
  const normalized = await podcastIndexService.podcastGetByFeedUrl(feedUrl);
  if (normalized === null || normalized === undefined) {
    return null;
  }
  if (!isPositivePodcastIndexId(normalized.id)) {
    return null;
  }
  // normalizePodcastFeed spreads the PI feed and adds feedId / podcast_index_id.
  return normalized as PodcastIndexFeed;
}

export async function buildRemoteItemsFinalResult(
  originalChannelsAdded: DTOChannel[],
  originalChannelsUnadded: RemoteItemGeneric[],
  originalItemsAdded: DTOItem[],
  originalItemsUnadded: RemoteItemGeneric[],
  options?: BuildRemoteItemsFinalResultOptions
): Promise<FinalRemoteItemsResult> {
  const feedGuids: string[] = [];
  if (originalChannelsUnadded && Array.isArray(originalChannelsUnadded)) {
    for (const r of originalChannelsUnadded) {
      if (r.feed_guid) {
        feedGuids.push(r.feed_guid);
      }
    }
  }

  let channelsUnaddedFromPI: PodcastBatchByFeedGuidResponse['feeds'] = [];
  try {
    if (feedGuids.length) {
      const cachedFeeds: PodcastBatchByFeedGuidResponse['feeds'] = [];
      const missingGuids: string[] = [];

      for (const guid of feedGuids) {
        const key = `pi:feed:${guid}`;
        const cached = await cacheGetJson<PodcastBatchByFeedGuidResponse['feeds'][number]>(key);
        if (cached) {
          cachedFeeds.push(cached);
        } else {
          missingGuids.push(guid);
        }
      }

      let fetchedFeeds: PodcastBatchByFeedGuidResponse['feeds'] = [];
      if (missingGuids.length) {
        const piResponse = await podcastIndexService.podcastsBatchByFeedGuid(missingGuids);
        fetchedFeeds = piResponse && Array.isArray(piResponse.feeds) ? piResponse.feeds : [];

        for (const f of fetchedFeeds) {
          await cachePodcastIndexFeed(f);
        }
      }

      const merged: PodcastBatchByFeedGuidResponse['feeds'] = [];
      const byGuid = new Map<string, PodcastBatchByFeedGuidResponse['feeds'][number]>();
      for (const f of [...cachedFeeds, ...fetchedFeeds]) {
        const feedGuid = f.podcastGuid ? f.podcastGuid : null;
        if (feedGuid) {
          byGuid.set(feedGuid, f);
        }
      }
      for (const guid of feedGuids) {
        const f = byGuid.get(guid);
        if (f) {
          merged.push(f);
        }
      }

      channelsUnaddedFromPI = merged;
    }

    if (options?.enrichUnaddedChannelsByFeedUrl) {
      const urlExtras = await enrichMissedChannelsUnaddedByFeedUrl(
        originalChannelsUnadded || [],
        channelsUnaddedFromPI,
        lookupPodcastIndexFeedByUrl
      );
      for (const f of urlExtras) {
        await cachePodcastIndexFeed(f);
      }
      channelsUnaddedFromPI = [...channelsUnaddedFromPI, ...urlExtras];
    }
  } catch {
    channelsUnaddedFromPI = [];
  }

  let itemsUnaddedFromPI: NonNullable<EpisodeByGuidResponse['episode']>[] = [];
  try {
    const items = originalItemsUnadded || [];

    const itemsWithFeedGuid = items.filter(
      (it) => it && it.feed_guid && it.item_guid && !isLocalFeedUrl(it.feed_url)
    );

    const missingItems: { item_guid: string; feed_guid: string }[] = [];

    for (const it of itemsWithFeedGuid) {
      const key = `pi:episode:${it.item_guid}:${it.feed_guid}`;
      const cached = await cacheGetJson<EpisodeByGuidResponse['episode']>(key);
      if (cached) {
        itemsUnaddedFromPI.push(cached);
      } else {
        missingItems.push({ item_guid: String(it.item_guid), feed_guid: String(it.feed_guid) });
      }
    }

    for (const mi of missingItems) {
      try {
        const response = await podcastIndexService.episodeGetByGuid(mi.item_guid, {
          podcastguid: mi.feed_guid,
        });
        if (response?.episode) {
          itemsUnaddedFromPI.push(response.episode);
          const key = `pi:episode:${mi.item_guid}:${mi.feed_guid}`;
          await cacheSetJson<NonNullable<EpisodeByGuidResponse['episode']>>(
            key,
            response.episode,
            config.keyvaldb.cacheExpiration
          );
        }
      } catch {
        // swallow
      }
    }
  } catch {
    itemsUnaddedFromPI = [];
  }

  return {
    channelsAdded: originalChannelsAdded,
    channelsUnadded: channelsUnaddedFromPI,
    itemsAdded: originalItemsAdded,
    itemsUnadded: itemsUnaddedFromPI,
  };
}
