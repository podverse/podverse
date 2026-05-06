import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import type { FeedPolicy } from '@orm/entities/feed/feedPolicy.js';

function isFeedPolicyParseAllowed(feedPolicy: FeedPolicy | null | undefined): boolean {
  if (!feedPolicy) {
    return true;
  }
  return feedPolicy.parse_allowed;
}

/**
 * Parser/archiver gate: workflow lifecycle states block parsing; otherwise **`feed_policy.parse_allowed`** decides.
 */
export function shouldAttemptFeedParseFromLifecycleAndPolicy(params: {
  lifecycleStateKey: FeedLifecycleStateKeyEnum;
  feedPolicy: FeedPolicy | null | undefined;
}): boolean {
  if (
    params.lifecycleStateKey === FeedLifecycleStateKeyEnum.PendingArchive ||
    params.lifecycleStateKey === FeedLifecycleStateKeyEnum.Archived ||
    params.lifecycleStateKey === FeedLifecycleStateKeyEnum.Takedown
  ) {
    return false;
  }

  return isFeedPolicyParseAllowed(params.feedPolicy);
}
