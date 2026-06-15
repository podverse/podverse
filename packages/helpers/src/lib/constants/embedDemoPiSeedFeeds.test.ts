import { describe, expect, it } from 'vitest';

import {
  EMBED_DEMO_PI_SEED_FEEDS,
  getEmbedDemoPiSeedManagedShowcaseIds,
  resolveEmbedDemoPiSeedItemSelection,
} from './embedDemoPiSeedFeeds.js';

describe('embedDemoPiSeedFeeds', () => {
  it('includes Them (7814960) for album-video and track-video pinned to a specific guid', () => {
    const themFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 7814960);
    if (themFeed === undefined) {
      throw new Error('Expected Them feed in EMBED_DEMO_PI_SEED_FEEDS');
    }

    expect(themFeed.title).toBe('Them');
    expect(themFeed.channelShowcaseId).toBe('album-video');
    expect(themFeed.itemShowcaseId).toBe('track-video');
    expect(themFeed.itemGuid).toBe('9ac3be63-c9a3-4065-88fe-5f07006a1abe');
    expect(themFeed.channelPlayItemGuid).toBe('b5f23697-1027-476d-a342-7e552daaeaa4');
  });

  it('pins specific item guids for the track and video episode showcases', () => {
    const doerfelFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 6642704);
    const gncFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 162612);

    expect(doerfelFeed?.itemGuid).toBe('caae8d61-bedd-40d9-ad57-8c86c1509020');
    expect(gncFeed?.itemGuid).toBe('https://geeknewscentral.com/?p=107326');
  });

  it('pins default list play items for the video list showcases', () => {
    const gncFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 162612);

    expect(gncFeed?.channelShowcaseId).toBe('podcast-video');
    expect(gncFeed?.channelPlayItemGuid).toBe('https://geeknewscentral.com/?p=107602');
  });

  it('lists twelve managed showcase slots including clip and chapter video', () => {
    const managedIds = getEmbedDemoPiSeedManagedShowcaseIds();

    expect(managedIds).toHaveLength(12);
    expect(managedIds).toContain('track-video');
    expect(managedIds).toContain('album-video');
    expect(managedIds).toContain('clip-audio');
    expect(managedIds).toContain('clip-video');
    expect(managedIds).toContain('chapter-audio');
    expect(managedIds).toContain('chapter-video');
    expect(managedIds.filter((id) => id === 'track-video')).toHaveLength(1);
  });

  it('pins clip and chapter showcases for podcast audio and video feeds', () => {
    const podcastingFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 920666);
    const gncFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 162612);

    expect(podcastingFeed?.seedClipShowcaseId).toBe('clip-audio');
    expect(podcastingFeed?.seedChapterShowcaseId).toBe('chapter-audio');
    expect(gncFeed?.seedClipShowcaseId).toBe('clip-video');
    expect(gncFeed?.seedChapterShowcaseId).toBe('chapter-video');
  });

  it('defaults item selection to latest-published when omitted', () => {
    const podcastingFeed = EMBED_DEMO_PI_SEED_FEEDS.find((feed) => feed.podcastIndexId === 920666);
    if (podcastingFeed === undefined) {
      throw new Error('Expected Podcasting 2.0 feed in EMBED_DEMO_PI_SEED_FEEDS');
    }

    expect(resolveEmbedDemoPiSeedItemSelection(podcastingFeed)).toBe('latest-published');
  });
});
