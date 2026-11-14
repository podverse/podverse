import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

import { parsePodcastIndexId } from '../v4Library/copyAccountLibraryLib.js';

export const FLAGGED_FEED_DECISIONS = [
  'apply_spam',
  'apply_takedown',
  'already_blocked',
  'skip_no_podcast_index_id',
  'skip_no_authority_url',
  'skip_url_held_by_other',
] as const;

export type FlaggedFeedDecision = (typeof FLAGGED_FEED_DECISIONS)[number];

export type V4FlaggedFeedFlag = 'spam' | 'takedown';

/** Local feed already stored for a Podcast Index id or an authority URL. */
export type FlaggedFeedStored = {
  podcastIndexId: number;
  /** True when the feed lifecycle is takedown. A missing lifecycle row is not takedown. */
  lifecycleIsTakedown: boolean;
  spamDetectedActive: boolean;
  takedownActive: boolean;
};

export type DecideFlaggedFeedImportInput = {
  flag: V4FlaggedFeedFlag;
  /** Raw v4 `podcastIndexId`. Parsed with the same rules as `parsePodcastIndexId`. */
  podcastIndexId: string | null;
  /** Authority URL. Blank, or not http(s), counts as absent. */
  authorityUrl: string | null;
  feedByPodcastIndexId: FlaggedFeedStored | null;
  feedByAuthorityUrl: FlaggedFeedStored | null;
};

/**
 * Authority URL that can be stored on `feed.url`.
 * Blank and non-http(s) values are absent.
 */
export function canonicalFlaggedFeedUrl(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  return canonicalHttpOrHttpsUrl(value);
}

function feedForPodcastIndexId(
  podcastIndexId: number,
  byId: FlaggedFeedStored | null,
  byUrl: FlaggedFeedStored | null
): FlaggedFeedStored | null {
  if (byId !== null) {
    return byId;
  }
  if (byUrl !== null && byUrl.podcastIndexId === podcastIndexId) {
    return byUrl;
  }
  return null;
}

function isAlreadyBlocked(flag: V4FlaggedFeedFlag, feed: FlaggedFeedStored): boolean {
  if (flag === 'spam') {
    return feed.spamDetectedActive && !feed.lifecycleIsTakedown;
  }
  return feed.lifecycleIsTakedown && feed.takedownActive;
}

/**
 * Chooses the import for one v4 spam or takedown podcast.
 * Does no I/O. A Podcast Index id must fit `feed.podcast_index_id`.
 * An authority URL must be storable on `feed.url`.
 */
export function decideFlaggedFeedImport(input: DecideFlaggedFeedImportInput): FlaggedFeedDecision {
  const podcastIndexId = parsePodcastIndexId(input.podcastIndexId);
  if (podcastIndexId === null) {
    return 'skip_no_podcast_index_id';
  }
  if (canonicalFlaggedFeedUrl(input.authorityUrl) === null) {
    return 'skip_no_authority_url';
  }
  const byUrl = input.feedByAuthorityUrl;
  if (byUrl !== null && byUrl.podcastIndexId !== podcastIndexId) {
    return 'skip_url_held_by_other';
  }
  const stored = feedForPodcastIndexId(podcastIndexId, input.feedByPodcastIndexId, byUrl);
  if (stored !== null && isAlreadyBlocked(input.flag, stored)) {
    return 'already_blocked';
  }
  return input.flag === 'spam' ? 'apply_spam' : 'apply_takedown';
}
