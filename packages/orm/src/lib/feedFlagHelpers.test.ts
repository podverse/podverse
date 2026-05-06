import { describe, expect, it } from 'vitest';

import { getActiveFeedWhere } from './feedFlagHelpers.js';

describe('getActiveFeedWhere', () => {
  it('filters public visibility using feed_policy only', () => {
    const where = getActiveFeedWhere({
      channel_ids: null,
      mediumType: null,
      category_id: null,
    });

    expect(where.channel.feed.feed_policy.public_visible).toBe(true);
    expect('feed_flag_status' in where.channel.feed).toBe(false);
  });

  it('always requires parsed-ready channels through channel_about relation', () => {
    const where = getActiveFeedWhere({
      channel_ids: null,
      mediumType: null,
      category_id: null,
    });

    expect(where.channel).toBeDefined();
    expect(where.channel.channel_about).toBeDefined();
    expect(where.channel.channel_about.id).toBeDefined();
  });

  it('includes channel_ids, medium, and category filters while preserving parsed-ready gating', () => {
    const where = getActiveFeedWhere({
      channel_ids: [1, 2, 3],
      mediumType: 'podcasts',
      category_id: 9,
    });

    expect(where.channel).toBeDefined();
    expect(where.channel.id).toBeDefined();
    expect(where.channel.medium_id).toBeDefined();
    expect(where.channel.channel_categories).toEqual({ category_id: expect.any(Object) });
    expect(where.channel.channel_about).toBeDefined();
    expect(where.channel.channel_about.id).toBeDefined();
  });
});
