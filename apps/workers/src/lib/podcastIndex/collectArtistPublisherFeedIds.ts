import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';
import { ARTIST_PUBLISHER_HELPER_FEEDS } from '@workers/lib/podcastIndex/artistPublisherHelperFeeds.js';
import type { PublisherParentRef } from '@workers/lib/podcastIndex/classifyPublisherMusicRss.js';
import {
  extractPublisherParentsFromAlbumXml,
  isPublisherMusicRssXml,
} from '@workers/lib/podcastIndex/classifyPublisherMusicRss.js';
import { sleepRateLimit } from '@workers/lib/podcastIndex/collectTrendingFeedIds.js';
import { podcastIndexFeedId } from '@workers/lib/podcastIndex/podcastIndexFeedId.js';

import { fetchWithTimeout } from '@podverse/helpers-backend';

export const DEFAULT_MAX_ARTIST_PUBLISHER_FEEDS = 20;
export const HARD_MAX_ARTIST_PUBLISHER_FEEDS = 1000;
export const PUBLISHER_MEDIUM = 'publisher';
export const MUSIC_MEDIUM_FOR_ARTIST_WALK = 'music';

/** Cap how many music albums we walk when filling beyond the helper set. */
const MUSIC_WALK_MAX_ALBUMS = 120;
const RSS_FETCH_TIMEOUT_MS = 20_000;

/**
 * Collects up to K Podcast Index ids for music-artist (publisher-music) feeds.
 * Starts with the committed helper set, then fills from PI /podcasts/bymedium?medium=publisher
 * (when available) and by walking music-medium albums for publisher parents.
 */
export async function collectArtistPublisherFeedIds(k: number): Promise<number[]> {
  const orderedIds: number[] = [];
  const seen = new Set<number>();

  const pushId = (id: number | null): void => {
    if (id === null || seen.has(id) || orderedIds.length >= k) {
      return;
    }
    seen.add(id);
    orderedIds.push(id);
  };

  for (const feed of ARTIST_PUBLISHER_HELPER_FEEDS) {
    pushId(feed.podcastIndexId);
    if (orderedIds.length >= k) {
      return orderedIds.slice(0, k);
    }
  }

  await fillFromPublisherByMedium(k, orderedIds, seen, pushId);
  if (orderedIds.length >= k) {
    return orderedIds.slice(0, k);
  }

  await fillFromMusicAlbumPublisherParents(k, orderedIds, seen, pushId);
  return orderedIds.slice(0, k);
}

async function fillFromPublisherByMedium(
  k: number,
  orderedIds: number[],
  seen: Set<number>,
  pushId: (id: number | null) => void
): Promise<void> {
  const podcastIndex = getPodcastIndexService();
  const need = k - orderedIds.length;
  if (need <= 0) {
    return;
  }

  const feeds = await podcastIndex.podcastsByMedium(PUBLISHER_MEDIUM, Math.min(need * 3, 1000));
  if (!Array.isArray(feeds)) {
    return;
  }

  for (const feed of feeds) {
    if (orderedIds.length >= k) {
      break;
    }
    const id = podcastIndexFeedId(feed);
    if (id === null || seen.has(id)) {
      continue;
    }
    await sleepRateLimit();
    const isArtist = await isPodcastIndexIdPublisherMusic(id);
    if (isArtist) {
      pushId(id);
    }
  }
}

async function fillFromMusicAlbumPublisherParents(
  k: number,
  orderedIds: number[],
  seen: Set<number>,
  pushId: (id: number | null) => void
): Promise<void> {
  const podcastIndex = getPodcastIndexService();
  const musicFeeds = await podcastIndex.podcastsByMedium(
    MUSIC_MEDIUM_FOR_ARTIST_WALK,
    MUSIC_WALK_MAX_ALBUMS
  );
  if (!Array.isArray(musicFeeds)) {
    return;
  }

  const parentRefs: PublisherParentRef[] = [];
  const seenParentKeys = new Set<string>();

  for (const feed of musicFeeds) {
    if (orderedIds.length >= k) {
      break;
    }
    const albumUrl = feedUrlFromUnknown(feed);
    if (albumUrl === null) {
      continue;
    }
    await sleepRateLimit();
    const xml = await fetchRssText(albumUrl);
    if (xml === null) {
      continue;
    }
    for (const parent of extractPublisherParentsFromAlbumXml(xml)) {
      const key = parent.feedUrl ?? parent.feedGuid;
      if (key === null || seenParentKeys.has(key)) {
        continue;
      }
      seenParentKeys.add(key);
      parentRefs.push(parent);
    }
  }

  for (const parent of parentRefs) {
    if (orderedIds.length >= k) {
      break;
    }
    await sleepRateLimit();
    const id = await resolvePublisherParentToPodcastIndexId(parent);
    if (id === null || seen.has(id)) {
      continue;
    }
    const isArtist = await isPodcastIndexIdPublisherMusic(id);
    if (isArtist) {
      pushId(id);
    }
  }
}

async function isPodcastIndexIdPublisherMusic(podcastIndexId: number): Promise<boolean> {
  const podcastIndex = getPodcastIndexService();
  const feedData = await podcastIndex.podcastGetById(podcastIndexId);
  const feedUrl = feedData?.feed?.url;
  if (typeof feedUrl !== 'string' || feedUrl.trim() === '') {
    return false;
  }
  const xml = await fetchRssText(feedUrl);
  if (xml === null) {
    return false;
  }
  return isPublisherMusicRssXml(xml);
}

async function resolvePublisherParentToPodcastIndexId(
  parent: PublisherParentRef
): Promise<number | null> {
  const podcastIndex = getPodcastIndexService();

  if (parent.feedGuid !== null && parent.feedGuid.trim() !== '') {
    try {
      const byGuid = await podcastIndex.podcastGetByGuid(parent.feedGuid);
      const id = podcastIndexFeedId(byGuid?.feed);
      if (id !== null) {
        return id;
      }
    } catch {
      // Fall through to feed URL lookup.
    }
  }

  if (parent.feedUrl !== null && parent.feedUrl.trim() !== '') {
    try {
      const byUrl = await podcastIndex.podcastGetByFeedUrl(parent.feedUrl);
      return podcastIndexFeedId(byUrl);
    } catch {
      return null;
    }
  }

  return null;
}

async function fetchRssText(url: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(url, { timeoutMs: RSS_FETCH_TIMEOUT_MS });
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    return typeof text === 'string' && text.trim() !== '' ? text : null;
  } catch {
    return null;
  }
}

function feedUrlFromUnknown(feed: unknown): string | null {
  if (feed === null || feed === undefined || typeof feed !== 'object') {
    return null;
  }
  if (!('url' in feed)) {
    return null;
  }
  const url = feed.url;
  if (typeof url !== 'string' || url.trim() === '') {
    return null;
  }
  return url;
}
