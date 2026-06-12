import { describe, expect, it } from 'vitest';

import type { EmbedDemoPiSeedFeedDef } from '@podverse/helpers';
import { resolveEmbedDemoPiSeedItemSelection } from '@podverse/helpers';

import {
  feedDefRequiresItem,
  shouldContinueSeedAfterParseFailure,
} from './seedShowcaseFeedHelpers.js';

describe('seedShowcaseFeedHelpers', () => {
  it('continues showcase upsert when parse fails for an existing feed', () => {
    expect(shouldContinueSeedAfterParseFailure(true)).toBe(true);
    expect(shouldContinueSeedAfterParseFailure(false)).toBe(false);
  });

  it('selects latest-video lookup for track-video feed defs', () => {
    const feedDef: EmbedDemoPiSeedFeedDef = {
      podcastIndexId: 7814960,
      title: 'Them',
      channelShowcaseId: 'album-video',
      itemShowcaseId: 'track-video',
      itemSelection: 'latest-video',
    };

    expect(feedDefRequiresItem(feedDef)).toBe(true);
    expect(resolveEmbedDemoPiSeedItemSelection(feedDef)).toBe('latest-video');
  });

  it('uses latest-published lookup for standard podcast feed defs', () => {
    const feedDef: EmbedDemoPiSeedFeedDef = {
      podcastIndexId: 920666,
      title: 'Podcasting 2.0',
      channelShowcaseId: 'podcast-audio',
      itemShowcaseId: 'episode-audio',
    };

    expect(resolveEmbedDemoPiSeedItemSelection(feedDef)).toBe('latest-published');
  });
});
