/**
 * The newest episode Podcast Index lists for one feed, from
 * `/episodes/byfeedid?id=<ids>&newest` (`items[]`). `datePublished` is Unix seconds.
 */
export type PodcastIndexNewestEpisode = {
  feedId: number;
  guid: string | null;
  enclosureUrl: string | null;
  datePublished: number | null;
};

/** `/episodes/byfeedid` accepts at most this many comma-separated feed ids per request. */
export const PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS = 200;

/**
 * Reads `items[]` from an `/episodes/byfeedid` response. A body without an `items` array (Podcast
 * Index found no episodes) yields an empty list; a body that is not a JSON object yields null.
 */
export function parseNewestEpisodesResponse(response: unknown): PodcastIndexNewestEpisode[] | null {
  if (!isRecord(response)) {
    return null;
  }
  if (!Array.isArray(response.items)) {
    return [];
  }

  const episodes: PodcastIndexNewestEpisode[] = [];
  for (const entry of response.items) {
    if (!isRecord(entry)) {
      continue;
    }
    const feedId = positiveInteger(entry.feedId);
    if (feedId === null) {
      continue;
    }
    episodes.push({
      feedId,
      guid: nonEmptyString(entry.guid),
      enclosureUrl: nonEmptyString(entry.enclosureUrl),
      datePublished: positiveInteger(entry.datePublished),
    });
  }
  return episodes;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function positiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
