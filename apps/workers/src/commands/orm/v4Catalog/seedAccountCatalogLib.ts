import type { LocalCatalog, V4PodcastKey } from '../v4Library/copyAccountLibraryLib.js';
import {
  isSeedablePodcast,
  parsePodcastIndexId,
  podcastChannelIdText,
} from '../v4Library/copyAccountLibraryLib.js';

export type CatalogSeedBucket = {
  total: number;
  alreadyLocal: number;
  notLocal: number;
  missing: number;
  nonPublic: number;
  spam: number;
  takedown: number;
  noPodcastIndexId: number;
};

export type CatalogSeedSources = {
  subscriptions: readonly string[];
  clips: readonly string[];
  playlistMembers: readonly string[];
  history: readonly string[];
  queue: readonly string[];
  nowPlaying: readonly string[];
};

export type CatalogSeedCreate = {
  id: string;
  podcastIndexId: number;
  authorityUrl: string;
};

export type CatalogSeedCreatePlan = {
  creates: CatalogSeedCreate[];
  skippedNoAuthorityUrl: number;
};

export type CatalogSeedReport = {
  subscriptions: CatalogSeedBucket;
  clips: CatalogSeedBucket;
  playlistMembers: CatalogSeedBucket;
  history: CatalogSeedBucket;
  queue: CatalogSeedBucket;
  nowPlaying: CatalogSeedBucket;
  combined: CatalogSeedBucket;
  beyondSubscriptions: CatalogSeedBucket;
};

function emptyBucket(): CatalogSeedBucket {
  return {
    total: 0,
    alreadyLocal: 0,
    notLocal: 0,
    missing: 0,
    nonPublic: 0,
    spam: 0,
    takedown: 0,
    noPodcastIndexId: 0,
  };
}

function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function uniqueIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    const text = blankToNull(id);
    if (text === null || seen.has(text)) {
      continue;
    }
    seen.add(text);
    result.push(text);
  }
  return result;
}

type ShowPlace = keyof Omit<CatalogSeedBucket, 'total'>;

function skipReason(podcast: V4PodcastKey): ShowPlace {
  if (!podcast.isPublic) {
    return 'nonPublic';
  }
  const flagStatus = blankToNull(podcast.flagStatus);
  if (flagStatus === 'spam') {
    return 'spam';
  }
  if (flagStatus === 'takedown') {
    return 'takedown';
  }
  return 'noPodcastIndexId';
}

function placeOf(
  id: string,
  podcasts: ReadonlyMap<string, V4PodcastKey>,
  catalog: LocalCatalog
): ShowPlace {
  const podcast = podcasts.get(id);
  if (podcast === undefined) {
    return 'missing';
  }
  if (!isSeedablePodcast(podcast)) {
    return skipReason(podcast);
  }
  return podcastChannelIdText(podcast, catalog) === null ? 'notLocal' : 'alreadyLocal';
}

function tally(
  ids: readonly string[],
  podcasts: ReadonlyMap<string, V4PodcastKey>,
  catalog: LocalCatalog
): CatalogSeedBucket {
  const bucket = emptyBucket();
  for (const id of uniqueIds(ids)) {
    bucket.total += 1;
    bucket[placeOf(id, podcasts, catalog)] += 1;
  }
  return bucket;
}

/**
 * Counts the shows one account needs. A show is seedable when it is public,
 * not spam or takedown, and has a Podcast Index id that fits the v5 column.
 * alreadyLocal means that show already matches a local channel.
 */
export function classifyAccountCatalogSeed(
  sources: CatalogSeedSources,
  podcasts: readonly V4PodcastKey[],
  catalog: LocalCatalog
): CatalogSeedReport {
  const podcastById = new Map(podcasts.map((podcast) => [podcast.id, podcast]));
  const subscriptionIds = new Set(uniqueIds(sources.subscriptions));
  const beyondSubscriptions = [
    ...sources.clips,
    ...sources.playlistMembers,
    ...sources.history,
    ...sources.queue,
    ...sources.nowPlaying,
  ].filter((id) => {
    const text = blankToNull(id);
    return text !== null && !subscriptionIds.has(text);
  });

  return {
    subscriptions: tally(sources.subscriptions, podcastById, catalog),
    clips: tally(sources.clips, podcastById, catalog),
    playlistMembers: tally(sources.playlistMembers, podcastById, catalog),
    history: tally(sources.history, podcastById, catalog),
    queue: tally(sources.queue, podcastById, catalog),
    nowPlaying: tally(sources.nowPlaying, podcastById, catalog),
    combined: tally(
      [
        ...sources.subscriptions,
        ...sources.clips,
        ...sources.playlistMembers,
        ...sources.history,
        ...sources.queue,
        ...sources.nowPlaying,
      ],
      podcastById,
      catalog
    ),
    beyondSubscriptions: tally(beyondSubscriptions, podcastById, catalog),
  };
}

/**
 * Shows the apply creates. A show is included when the seed would parse it and
 * no local channel matches yet. A seedable show with no authority URL is counted
 * and left out, because a parse needs that URL.
 */
export function selectCatalogSeedCreates(
  sources: CatalogSeedSources,
  podcasts: readonly V4PodcastKey[],
  catalog: LocalCatalog
): CatalogSeedCreatePlan {
  const podcastById = new Map(podcasts.map((podcast) => [podcast.id, podcast]));
  const ids = uniqueIds([
    ...sources.subscriptions,
    ...sources.clips,
    ...sources.playlistMembers,
    ...sources.history,
    ...sources.queue,
    ...sources.nowPlaying,
  ]);
  const creates: CatalogSeedCreate[] = [];
  let skippedNoAuthorityUrl = 0;
  for (const id of ids) {
    if (placeOf(id, podcastById, catalog) !== 'notLocal') {
      continue;
    }
    const podcast = podcastById.get(id);
    const podcastIndexId =
      podcast === undefined ? null : parsePodcastIndexId(podcast.podcastIndexId);
    const authorityUrl = podcast === undefined ? null : blankToNull(podcast.authorityUrl);
    if (podcastIndexId === null || authorityUrl === null) {
      skippedNoAuthorityUrl += 1;
      continue;
    }
    creates.push({ id, podcastIndexId, authorityUrl });
  }
  return { creates, skippedNoAuthorityUrl };
}
