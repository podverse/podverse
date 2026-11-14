import { Feed } from '@orm/entities/feed/feed.js';
import { FeedLifecycleState } from '@orm/entities/feed/feedLifecycleState.js';
import {
  FeedLifecycleStateKeyEnum,
  FeedLifecycleStateType,
} from '@orm/entities/feed/feedLifecycleStateType.js';
import { FeedPolicy } from '@orm/entities/feed/feedPolicy.js';
import { describe, expect, it } from 'vitest';

import { isFeedEntryBlocked } from './feedEntryBlock.js';

function policy(flags: {
  parse_allowed: boolean;
  public_visible: boolean;
  add_allowed: boolean;
}): FeedPolicy {
  const row = new FeedPolicy();
  row.parse_allowed = flags.parse_allowed;
  row.public_visible = flags.public_visible;
  row.add_allowed = flags.add_allowed;
  return row;
}

function feedWith(input: {
  stateKey?: FeedLifecycleStateKeyEnum;
  feedPolicy?: FeedPolicy | null;
}): Feed {
  const feed = new Feed();
  if (input.stateKey !== undefined) {
    const lifecycle = new FeedLifecycleState();
    const stateType = new FeedLifecycleStateType();
    stateType.state_key = input.stateKey;
    lifecycle.feed_lifecycle_state_type = stateType;
    feed.feed_lifecycle_state = lifecycle;
  }
  if (input.feedPolicy !== undefined) {
    feed.feed_policy = input.feedPolicy;
  }
  return feed;
}

const openPolicy = policy({ parse_allowed: true, public_visible: true, add_allowed: true });

describe('isFeedEntryBlocked', () => {
  it('allows a feed with no policy row', () => {
    expect(isFeedEntryBlocked(feedWith({}))).toBe(false);
    expect(isFeedEntryBlocked(feedWith({ stateKey: FeedLifecycleStateKeyEnum.Active }))).toBe(
      false
    );
  });

  it('allows a feed whose policy permits parse and add', () => {
    expect(
      isFeedEntryBlocked(
        feedWith({ stateKey: FeedLifecycleStateKeyEnum.Active, feedPolicy: openPolicy })
      )
    ).toBe(false);
  });

  it('does not block on public visibility alone', () => {
    expect(
      isFeedEntryBlocked(
        feedWith({
          stateKey: FeedLifecycleStateKeyEnum.Active,
          feedPolicy: policy({ parse_allowed: true, public_visible: false, add_allowed: true }),
        })
      )
    ).toBe(false);
  });

  it('blocks when parse is not allowed', () => {
    expect(
      isFeedEntryBlocked(
        feedWith({
          stateKey: FeedLifecycleStateKeyEnum.Active,
          feedPolicy: policy({ parse_allowed: false, public_visible: true, add_allowed: true }),
        })
      )
    ).toBe(true);
  });

  it('blocks when add is not allowed', () => {
    expect(
      isFeedEntryBlocked(
        feedWith({
          stateKey: FeedLifecycleStateKeyEnum.Active,
          feedPolicy: policy({ parse_allowed: true, public_visible: true, add_allowed: false }),
        })
      )
    ).toBe(true);
  });

  it('blocks a takedown lifecycle even when the policy flags are open', () => {
    expect(
      isFeedEntryBlocked(
        feedWith({ stateKey: FeedLifecycleStateKeyEnum.Takedown, feedPolicy: openPolicy })
      )
    ).toBe(true);
  });
});
