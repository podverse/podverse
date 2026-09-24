/**
 * Shared helpers for Podcast Index feed objects returned when a remote-item
 * reference is not yet a parsed Podverse channel (artist albums, and later
 * podroll / tracks).
 */

export type PodcastIndexFeedImageFields = {
  artwork?: string | null;
  image?: string | null;
};

export type PodcastIndexFeedTargetFields = PodcastIndexFeedImageFields & {
  author?: string | null;
  description?: string | null;
  id?: number | null;
  title?: string | null;
  url?: string | null;
};

export type UnparsedPodcastIndexFeedTarget = {
  author: string;
  description: string;
  feedUrl: string;
  imageUrl: string | null;
  podcastIndexId: string;
  title: string;
};

function nonEmptyTrimmed(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** First non-empty of `image`, then `artwork`, otherwise null. */
export function podcastIndexFeedListImageUrl(
  feed: PodcastIndexFeedImageFields | null | undefined
): string | null {
  if (feed === null || feed === undefined) {
    return null;
  }
  return nonEmptyTrimmed(feed.image) ?? nonEmptyTrimmed(feed.artwork);
}

/**
 * When a Podcast Index feed has a positive numeric id, return the fields needed
 * to open the in-app preview. Otherwise null (row may still render; do not leave the app).
 */
export function unparsedPodcastIndexFeedTarget(
  feed: PodcastIndexFeedTargetFields | null | undefined
): UnparsedPodcastIndexFeedTarget | null {
  if (feed === null || feed === undefined) {
    return null;
  }
  const id = feed.id;
  if (typeof id !== 'number' || !Number.isFinite(id) || id <= 0) {
    return null;
  }

  return {
    author: nonEmptyTrimmed(feed.author) ?? '',
    description: nonEmptyTrimmed(feed.description) ?? '',
    feedUrl: nonEmptyTrimmed(feed.url) ?? '',
    imageUrl: podcastIndexFeedListImageUrl(feed),
    podcastIndexId: String(id),
    title: nonEmptyTrimmed(feed.title) ?? '',
  };
}
