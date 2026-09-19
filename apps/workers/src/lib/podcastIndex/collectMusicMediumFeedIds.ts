import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';

import { podcastIndexFeedId } from './podcastIndexFeedId.js';

export const DEFAULT_MAX_MUSIC_MEDIUM_FEEDS = 20;
export const HARD_MAX_MUSIC_MEDIUM_FEEDS = 1000;
export const MUSIC_MEDIUM = 'music';

/**
 * Fetches up to K unique feed ids from Podcast Index /podcasts/bymedium?medium=music.
 */
export async function collectMusicMediumFeedIds(k: number): Promise<number[]> {
  const podcastIndex = getPodcastIndexService();
  const feeds = await podcastIndex.podcastsByMedium(MUSIC_MEDIUM, k);
  const orderedIds: number[] = [];
  const seen = new Set<number>();

  if (!Array.isArray(feeds)) {
    return [];
  }

  for (const feed of feeds) {
    const id = podcastIndexFeedId(feed);
    if (id === null || seen.has(id)) {
      continue;
    }
    seen.add(id);
    orderedIds.push(id);
    if (orderedIds.length >= k) {
      break;
    }
  }

  return orderedIds.slice(0, k);
}
