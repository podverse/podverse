import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { FeedPolicy } from '@orm/entities/feed/feedPolicy.js';
import { describe, expect, it } from 'vitest';

import { shouldAttemptFeedParseFromLifecycleAndPolicy } from './feedLifecycleState.js';

function mkFeedPolicy(parse_allowed: boolean): FeedPolicy {
  const p = new FeedPolicy();
  p.id = 1;
  p.feed_id = 1;
  p.parse_allowed = parse_allowed;
  p.public_visible = true;
  p.add_allowed = true;
  p.primary_block_reason = null;
  p.last_policy_refresh_at = null;
  p.created_at = new Date();
  p.updated_at = new Date();
  return p;
}

describe('feedLifecycleState', () => {
  it('gates parse attempts on lifecycle workflow + policy', () => {
    expect(
      shouldAttemptFeedParseFromLifecycleAndPolicy({
        lifecycleStateKey: FeedLifecycleStateKeyEnum.Active,
        feedPolicy: mkFeedPolicy(true),
      })
    ).toBe(true);

    expect(
      shouldAttemptFeedParseFromLifecycleAndPolicy({
        lifecycleStateKey: FeedLifecycleStateKeyEnum.Takedown,
        feedPolicy: mkFeedPolicy(true),
      })
    ).toBe(false);

    expect(
      shouldAttemptFeedParseFromLifecycleAndPolicy({
        lifecycleStateKey: FeedLifecycleStateKeyEnum.Active,
        feedPolicy: mkFeedPolicy(false),
      })
    ).toBe(false);
  });
});
