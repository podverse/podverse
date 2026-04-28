import { getPodcastIndexConfig } from '@workers/config/index.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';

export const DEFAULT_MAX_TRENDING_FEEDS = 50;
export const HARD_MAX_TRENDING_FEEDS = 1000;
const MAX_PAGINATION_STEPS = 20;

function getRateLimitDelayMs(): number {
  return getPodcastIndexConfig().rateLimitDelay ?? 0;
}

export async function sleepRateLimit(): Promise<void> {
  const ms = getRateLimitDelayMs();
  if (ms > 0) {
    await new Promise((r) => setTimeout(r, ms));
  }
}

/**
 * Fetches up to K unique feed ids from Podcast Index /podcasts/trending, using `nextSince`
 * when a single page returns fewer than K and pagination is available.
 */
export async function collectTrendingFeedIds(
  k: number,
  initialSince: number | undefined,
  lang: string | undefined,
  cat: string | undefined
): Promise<number[]> {
  const podcastIndex = getPodcastIndexService();
  const orderedIds: number[] = [];
  const seen = new Set<number>();
  let since: number | undefined = initialSince;

  for (let step = 0; step < MAX_PAGINATION_STEPS && orderedIds.length < k; step++) {
    if (step > 0) {
      await sleepRateLimit();
    }

    const need = k - orderedIds.length;
    const perCallMax = Math.min(need, HARD_MAX_TRENDING_FEEDS);

    const { feeds, nextSince } = await podcastIndex.trendingGetPodcasts(
      perCallMax,
      since,
      lang,
      cat
    );

    for (const feed of feeds) {
      const idRaw = (feed as { id?: number }).id;
      if (idRaw === undefined || idRaw === null) {
        continue;
      }
      const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
      if (Number.isNaN(id) || id <= 0) {
        continue;
      }
      if (!seen.has(id)) {
        seen.add(id);
        orderedIds.push(id);
        if (orderedIds.length >= k) {
          break;
        }
      }
    }

    if (orderedIds.length >= k) {
      break;
    }

    if (nextSince === undefined || nextSince === null) {
      break;
    }
    if (Array.isArray(feeds) && feeds.length === 0) {
      break;
    }
    since = nextSince;
  }

  return orderedIds.slice(0, k);
}
