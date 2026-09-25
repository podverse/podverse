import { describe, expect, it } from 'vitest';

import { formatArtistPublisherFeedsModule } from './discoverArtistPublisherFeeds.js';

describe('formatArtistPublisherFeedsModule', () => {
  it('emits a module with podcastIndexId and title entries', () => {
    const source = formatArtistPublisherFeedsModule([
      { podcastIndexId: 1, title: "Artist One's Band" },
      { podcastIndexId: 2, title: 'Artist Two' },
    ]);
    expect(source).toContain('export const ARTIST_PUBLISHER_FEEDS');
    expect(source).toContain('podcastIndexId: 1');
    expect(source).toContain("title: 'Artist One\\'s Band'");
    expect(source).toContain('podcastIndexId: 2');
  });
});
