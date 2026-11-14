import { DATABASE_CONSTANTS } from '@podverse/helpers';

/**
 * One v4 podcast, as read for the legacy podcast map.
 * `authorityUrl` is the authority feed URL. `flagStatus` is the v4 flag text.
 */
export type V4PodcastMapSource = {
  id: string;
  podcastIndexId: string | null;
  authorityUrl: string | null;
  isPublic: boolean;
  flagStatus: string | null;
};

/** One `legacy_id_map` podcast row. `v4FeedUrl` is null when the row stores none. */
export type LegacyPodcastMapRow = {
  legacyId: string;
  status: 'unresolved' | 'dropped';
  resolveKey: string | null;
  v4FeedUrl: string | null;
};

const DROPPED_FLAGS = new Set(['spam', 'takedown']);

/**
 * http or https, short enough for `varchar_url`.
 * The column domain requires a lowercase scheme, so only that prefix is lowercased.
 */
function storableFeedUrl(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > DATABASE_CONSTANTS.varchar_url) {
    return null;
  }
  const stored = trimmed.replace(/^(https?):\/\//i, (match) => match.toLowerCase());
  if (!/^https?:\/\//.test(stored)) {
    return null;
  }
  return stored;
}

/** The trimmed digit text. Zero and leading zeros are not keys. */
function positiveIntegerString(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * One legacy podcast map row for a v4 podcast.
 * Spam and takedown are dropped, with no resolve key and no feed URL.
 * Any other flag needs an authority feed URL the column can store.
 * A public podcast stores a positive integer Podcast Index id as `resolveKey`.
 */
export function planLegacyPodcastMapRow(source: V4PodcastMapSource): LegacyPodcastMapRow | null {
  const flag = source.flagStatus?.trim() ?? '';
  if (DROPPED_FLAGS.has(flag)) {
    return {
      legacyId: source.id,
      status: 'dropped',
      resolveKey: null,
      v4FeedUrl: null,
    };
  }

  const feedUrl = storableFeedUrl(source.authorityUrl);
  if (feedUrl === null) {
    return null;
  }

  return {
    legacyId: source.id,
    status: 'unresolved',
    resolveKey: source.isPublic ? positiveIntegerString(source.podcastIndexId) : null,
    v4FeedUrl: feedUrl,
  };
}
