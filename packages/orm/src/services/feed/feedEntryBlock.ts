import type { Feed } from '@orm/entities/feed/feed.js';
import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { shouldAttemptFeedParseFromLifecycleAndPolicy } from '@orm/lib/feedLifecycleState.js';

import { FeedService } from './feed.js';
import { isFeedPolicyAddAllowed } from './feedPolicy.js';

/**
 * A feed is blocked when its lifecycle or policy refuses a parse, or when add is not allowed.
 * A feed with no policy row is not blocked.
 */
export function isFeedEntryBlocked(feed: Feed): boolean {
  const lifecycleStateKey =
    feed.feed_lifecycle_state?.feed_lifecycle_state_type?.state_key ??
    FeedLifecycleStateKeyEnum.Active;

  if (
    !shouldAttemptFeedParseFromLifecycleAndPolicy({
      lifecycleStateKey,
      feedPolicy: feed.feed_policy,
    })
  ) {
    return true;
  }

  return !isFeedPolicyAddAllowed(feed.feed_policy);
}

/**
 * The blocked feed for this Podcast Index id or URL, or null when neither match is blocked.
 * Podcast Index id is checked first.
 */
export async function findBlockedFeed(params: {
  url?: string | null;
  podcastIndexId?: number | null;
}): Promise<Feed | null> {
  const feedService = new FeedService();

  if (typeof params.podcastIndexId === 'number' && Number.isFinite(params.podcastIndexId)) {
    const byIndex = await feedService.getByPodcastIndexId(params.podcastIndexId);
    if (byIndex !== null && isFeedEntryBlocked(byIndex)) {
      return byIndex;
    }
  }

  if (typeof params.url === 'string' && params.url !== '') {
    const byUrl = await feedService.getByUrl({ url: params.url });
    if (byUrl !== null && isFeedEntryBlocked(byUrl)) {
      return byUrl;
    }
  }

  return null;
}
