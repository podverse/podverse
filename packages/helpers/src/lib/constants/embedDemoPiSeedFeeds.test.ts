import { describe, expect, it } from 'vitest';

import {
  EMBED_DEMO_PI_SEED_FEEDS,
  getEmbedDemoPiSeedManagedShowcaseIds,
  resolveEmbedDemoPiSeedItemSelection,
} from './embedDemoPiSeedFeeds.js';

describe('embedDemoPiSeedFeeds', () => {
  it('includes Them (7814960) for album-video and track-video', () => {
    const themFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 7814960);
    if (themFeed === undefined) {
      throw new Error('Expected Them feed in EMBED_DEMO_PI_SEED_FEEDS');
    }

    expect(themFeed.title).toBe('Them');
    expect(themFeed.channelShowcaseId).toBe('album-video');
    expect(themFeed.itemShowcaseId).toBe('track-video');
    expect(resolveEmbedDemoPiSeedItemSelection(themFeed)).toBe('latest-video');
  });

  it('lists eight managed showcase slots including track-video once', () => {
    const managedIds = getEmbedDemoPiSeedManagedShowcaseIds();

    expect(managedIds).toHaveLength(8);
    expect(managedIds).toContain('track-video');
    expect(managedIds).toContain('album-video');
    expect(managedIds.filter((id) => id === 'track-video')).toHaveLength(1);
  });

  it('defaults item selection to latest-published when omitted', () => {
    const podcastingFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 920666);
    if (podcastingFeed === undefined) {
      throw new Error('Expected Podcasting 2.0 feed in EMBED_DEMO_PI_SEED_FEEDS');
    }

    expect(resolveEmbedDemoPiSeedItemSelection(podcastingFeed)).toBe('latest-published');
  });
});
