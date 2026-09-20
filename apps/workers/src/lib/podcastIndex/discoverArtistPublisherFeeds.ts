import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';
import type { ArtistPublisherFeedDef } from '@workers/lib/podcastIndex/artistPublisherFeeds.js';
import { ARTIST_PUBLISHER_FEEDS } from '@workers/lib/podcastIndex/artistPublisherFeeds.js';
import type { PublisherParentRef } from '@workers/lib/podcastIndex/classifyPublisherMusicRss.js';
import {
  extractPublisherParentsFromAlbumXml,
  isPublisherMusicRssXml,
} from '@workers/lib/podcastIndex/classifyPublisherMusicRss.js';
import { sleepRateLimit } from '@workers/lib/podcastIndex/collectTrendingFeedIds.js';
import { podcastIndexFeedId } from '@workers/lib/podcastIndex/podcastIndexFeedId.js';

import { fetchWithTimeout } from '@podverse/helpers-backend';

export const DEFAULT_MAX_ARTIST_PUBLISHER_DISCOVER = 50;
export const HARD_MAX_ARTIST_PUBLISHER_DISCOVER = 1000;
export const PUBLISHER_MEDIUM = 'publisher';
export const MUSIC_MEDIUM_FOR_ARTIST_WALK = 'music';

/** How many music albums to inspect when hunting publisher parents. */
const MUSIC_WALK_MAX_ALBUMS = 400;
const RSS_FETCH_TIMEOUT_MS = 20_000;

export type ArtistDiscoverProgress = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

/**
 * Crawls Podcast Index (and album RSS) for publisher-music artist feeds.
 * Returns up to `k` verified entries, starting from the committed list.
 */
export async function discoverArtistPublisherFeeds(
  k: number,
  progress: ArtistDiscoverProgress
): Promise<ArtistPublisherFeedDef[]> {
  const found: ArtistPublisherFeedDef[] = [];
  const seen = new Set<number>();

  const push = (entry: ArtistPublisherFeedDef): void => {
    if (seen.has(entry.podcastIndexId) || found.length >= k) {
      return;
    }
    seen.add(entry.podcastIndexId);
    found.push(entry);
    progress.info(
      `[discoverArtistPublisherFeeds] Accepted ${found.length}/${k}: ${entry.title} (podcast_index_id=${entry.podcastIndexId})`
    );
  };

  for (const feed of ARTIST_PUBLISHER_FEEDS) {
    if (found.length >= k) {
      return found.slice(0, k);
    }
    await sleepRateLimit();
    progress.info(
      `[discoverArtistPublisherFeeds] Re-checking committed podcast_index_id=${feed.podcastIndexId} (${feed.title})...`
    );
    const verified = await classifyPodcastIndexIdAsArtist(feed.podcastIndexId);
    if (verified !== null) {
      push(verified);
    } else {
      progress.warn(
        `[discoverArtistPublisherFeeds] Dropping committed podcast_index_id=${feed.podcastIndexId} (${feed.title}); no longer publisher-music.`
      );
      seen.add(feed.podcastIndexId);
    }
  }

  progress.info(
    `[discoverArtistPublisherFeeds] Seeded ${found.length} from committed list; filling via PI...`
  );

  await fillFromPublisherByMedium(k, found, seen, push, progress);
  if (found.length >= k) {
    return found.slice(0, k);
  }

  await fillFromSearchTerms(k, found, seen, push, progress);
  if (found.length >= k) {
    return found.slice(0, k);
  }

  await fillFromMusicAlbumPublisherParents(k, found, seen, push, progress);
  return found.slice(0, k);
}

/**
 * Rewrites [`artistPublisherFeeds.ts`](./artistPublisherFeeds.ts) with the given entries.
 */
export function writeArtistPublisherFeedsModule(feeds: readonly ArtistPublisherFeedDef[]): string {
  const modulePath = resolveArtistPublisherFeedsModulePath();
  const body = formatArtistPublisherFeedsModule(feeds);
  fs.writeFileSync(modulePath, body, 'utf8');
  return modulePath;
}

export function resolveArtistPublisherFeedsModulePath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findMonorepoRoot(moduleDir);
  if (repoRoot !== null) {
    return path.join(
      repoRoot,
      'apps/workers/src/lib/podcastIndex/artistPublisherFeeds.ts'
    );
  }
  const fromCwdRoot = path.join(
    process.cwd(),
    'apps/workers/src/lib/podcastIndex/artistPublisherFeeds.ts'
  );
  if (fs.existsSync(fromCwdRoot)) {
    return fromCwdRoot;
  }
  const fromCwdWorkers = path.join(
    process.cwd(),
    'src/lib/podcastIndex/artistPublisherFeeds.ts'
  );
  if (fs.existsSync(fromCwdWorkers)) {
    return fromCwdWorkers;
  }
  throw new Error(
    'Could not locate apps/workers/src/lib/podcastIndex/artistPublisherFeeds.ts to rewrite.'
  );
}

/**
 * Walks up from dir looking for the monorepo root (package.json with workspaces).
 */
function findMonorepoRoot(dir: string): string | null {
  let current = path.resolve(dir);
  const root = path.parse(current).root;
  while (current !== root) {
    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const content = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(content) as { workspaces?: string[] };
        if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0) {
          return current;
        }
      } catch {
        // ignore parse errors
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

export function formatArtistPublisherFeedsModule(
  feeds: readonly ArtistPublisherFeedDef[]
): string {
  const entries = feeds
    .map(
      (feed) => `  {
    podcastIndexId: ${feed.podcastIndexId},
    title: '${feed.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',
  }`
    )
    .join(',\n');

  return `/**
 * Deterministic Podcast Index ids for music-artist (publisher-music) feeds.
 * Used by local-dev seeding (\`devParserRSSParseArtistPublisherFeeds\`).
 * Refresh with \`devDiscoverArtistPublisherFeeds\` (maintainer-only) and commit the diff.
 */
export type ArtistPublisherFeedDef = {
  podcastIndexId: number;
  title: string;
};

export const ARTIST_PUBLISHER_FEEDS: readonly ArtistPublisherFeedDef[] = [
${entries}
];
`;
}

async function fillFromSearchTerms(
  k: number,
  found: ArtistPublisherFeedDef[],
  seen: Set<number>,
  push: (entry: ArtistPublisherFeedDef) => void,
  progress: ArtistDiscoverProgress
): Promise<void> {
  const podcastIndex = getPodcastIndexService();
  const terms = [
    'pubfeed',
    'mspubfeed',
    'basspistol',
    'doerfelverse',
    'publisher-feeds',
    'headstarts.uk/msp',
  ];

  for (const term of terms) {
    if (found.length >= k) {
      break;
    }
    progress.info(`[discoverArtistPublisherFeeds] Searching PI byterm="${term}"...`);
    await sleepRateLimit();
    let feeds: unknown[] = [];
    try {
      const response = await podcastIndex.searchPodcasts(term, { max: 40 });
      if (Array.isArray(response?.feeds)) {
        feeds = response.feeds;
      }
    } catch {
      progress.warn(`[discoverArtistPublisherFeeds] searchPodcasts failed for "${term}".`);
      continue;
    }
    if (feeds.length === 0) {
      continue;
    }

    for (const feed of feeds) {
      if (found.length >= k) {
        break;
      }
      const id = podcastIndexFeedId(feed);
      if (id === null || seen.has(id)) {
        continue;
      }
      const url = feedUrlFromUnknown(feed);
      const medium = mediumFromUnknown(feed);
      const looksLikePublisher =
        medium === 'publisher' ||
        (url !== null &&
          (url.includes('pubfeed') ||
            url.includes('publisher-feeds') ||
            url.includes('/artists/') ||
            url.includes('mspubfeed')));
      if (!looksLikePublisher) {
        continue;
      }
      await sleepRateLimit();
      progress.info(
        `[discoverArtistPublisherFeeds] Search hit podcast_index_id=${id} medium=${medium ?? '?'}...`
      );
      const entry = await classifyPodcastIndexIdAsArtist(id);
      if (entry !== null) {
        push(entry);
      }
    }
  }
}

function mediumFromUnknown(feed: unknown): string | null {
  if (feed === null || feed === undefined || typeof feed !== 'object') {
    return null;
  }
  if (!('medium' in feed)) {
    return null;
  }
  const medium = feed.medium;
  if (typeof medium !== 'string' || medium.trim() === '') {
    return null;
  }
  return medium.trim().toLowerCase();
}

async function fillFromPublisherByMedium(
  k: number,
  found: ArtistPublisherFeedDef[],
  seen: Set<number>,
  push: (entry: ArtistPublisherFeedDef) => void,
  progress: ArtistDiscoverProgress
): Promise<void> {
  const podcastIndex = getPodcastIndexService();
  const need = k - found.length;
  if (need <= 0) {
    return;
  }

  progress.info(
    `[discoverArtistPublisherFeeds] Querying PI /podcasts/bymedium?medium=publisher (need ${need})...`
  );
  const feeds = await podcastIndex.podcastsByMedium(PUBLISHER_MEDIUM, Math.min(need * 5, 1000));
  if (!Array.isArray(feeds) || feeds.length === 0) {
    progress.warn(
      '[discoverArtistPublisherFeeds] PI bymedium=publisher returned no feeds; continuing with music walk.'
    );
    return;
  }

  progress.info(
    `[discoverArtistPublisherFeeds] Classifying ${feeds.length} publisher-medium feed(s)...`
  );

  for (let i = 0; i < feeds.length; i++) {
    if (found.length >= k) {
      break;
    }
    const feed = feeds[i];
    const id = podcastIndexFeedId(feed);
    if (id === null || seen.has(id)) {
      continue;
    }
    await sleepRateLimit();
    progress.info(
      `[discoverArtistPublisherFeeds] Publisher candidate ${i + 1}/${feeds.length} podcast_index_id=${id}...`
    );
    const entry = await classifyPodcastIndexIdAsArtist(id);
    if (entry !== null) {
      push(entry);
    }
  }
}

async function fillFromMusicAlbumPublisherParents(
  k: number,
  found: ArtistPublisherFeedDef[],
  seen: Set<number>,
  push: (entry: ArtistPublisherFeedDef) => void,
  progress: ArtistDiscoverProgress
): Promise<void> {
  const podcastIndex = getPodcastIndexService();
  progress.info(
    `[discoverArtistPublisherFeeds] Walking up to ${MUSIC_WALK_MAX_ALBUMS} music albums for publisher parents...`
  );
  const musicFeedsRaw = await podcastIndex.podcastsByMedium(
    MUSIC_MEDIUM_FOR_ARTIST_WALK,
    MUSIC_WALK_MAX_ALBUMS
  );
  if (!Array.isArray(musicFeedsRaw) || musicFeedsRaw.length === 0) {
    progress.warn('[discoverArtistPublisherFeeds] PI bymedium=music returned no feeds.');
    return;
  }

  // PI may return more rows than max; enforce our own cap.
  const musicFeeds = musicFeedsRaw.slice(0, MUSIC_WALK_MAX_ALBUMS);
  progress.info(
    `[discoverArtistPublisherFeeds] PI returned ${musicFeedsRaw.length} music feed(s); inspecting ${musicFeeds.length}.`
  );

  const seenParentKeys = new Set<string>();

  for (let i = 0; i < musicFeeds.length; i++) {
    if (found.length >= k) {
      break;
    }
    const feed = musicFeeds[i];
    const albumUrl = feedUrlFromUnknown(feed);
    const albumId = podcastIndexFeedId(feed);
    if (albumUrl === null) {
      continue;
    }
    await sleepRateLimit();
    if ((i + 1) % 10 === 0 || i === 0) {
      progress.info(
        `[discoverArtistPublisherFeeds] Album ${i + 1}/${musicFeeds.length} (accepted artists so far: ${found.length}/${k})...`
      );
    }
    const xml = await fetchRssText(albumUrl);
    if (xml === null) {
      continue;
    }
    for (const parent of extractPublisherParentsFromAlbumXml(xml)) {
      if (found.length >= k) {
        break;
      }
      const key = parent.feedUrl ?? parent.feedGuid;
      if (key === null || seenParentKeys.has(key)) {
        continue;
      }
      seenParentKeys.add(key);

      // Wavlake artist feeds are common but usually absent from PI byfeedurl/byguid.
      if (parent.feedUrl !== null && parent.feedUrl.includes('wavlake.com/feed/artist/')) {
        progress.info(
          `[discoverArtistPublisherFeeds] Skipping Wavlake artist parent (typically not in PI): ${parent.feedUrl}`
        );
        continue;
      }

      progress.info(
        `[discoverArtistPublisherFeeds] Resolving publisher parent from album podcast_index_id=${albumId ?? '?'}: ${key}`
      );
      await sleepRateLimit();
      const id = await resolvePublisherParentToPodcastIndexId(parent);
      if (id === null || seen.has(id)) {
        progress.info(
          `[discoverArtistPublisherFeeds] Parent not in PI or already seen: ${key}`
        );
        continue;
      }
      const entry = await classifyPodcastIndexIdAsArtist(id);
      if (entry !== null) {
        push(entry);
      } else {
        progress.info(
          `[discoverArtistPublisherFeeds] Parent podcast_index_id=${id} is not publisher-music.`
        );
      }
    }
  }
}

async function classifyPodcastIndexIdAsArtist(
  podcastIndexId: number
): Promise<ArtistPublisherFeedDef | null> {
  const podcastIndex = getPodcastIndexService();
  const feedData = await podcastIndex.podcastGetById(podcastIndexId);
  const feedUrl = feedData?.feed?.url;
  const titleRaw = feedData?.feed?.title;
  if (typeof feedUrl !== 'string' || feedUrl.trim() === '') {
    return null;
  }
  const xml = await fetchRssText(feedUrl);
  if (xml === null) {
    return null;
  }
  if (!isPublisherMusicRssXml(xml)) {
    return null;
  }
  const title =
    typeof titleRaw === 'string' && titleRaw.trim() !== ''
      ? titleRaw.trim()
      : `Artist ${podcastIndexId}`;
  return { podcastIndexId, title };
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
