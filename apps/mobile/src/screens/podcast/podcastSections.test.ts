import { describe, expect, it } from 'vitest';

import { resolvePodcastSections } from './podcastSections';

const ALWAYS_ON = ['episodes', 'downloaded', 'about', 'clips'] as const;

const channelWithPodroll = {
  channel_podroll: {
    channel_podroll_remote_items: [{ feed_guid: 'guid-1' }],
  },
};

describe('resolvePodcastSections', () => {
  it('offers the always-on chips in row order before any evidence chips', () => {
    expect(resolvePodcastSections({ channel: null, hasSoundbites: false })).toEqual([...ALWAYS_ON]);
  });

  it('keeps Official clips and Podroll at the end when evidence exists', () => {
    expect(
      resolvePodcastSections({
        channel: channelWithPodroll,
        hasSoundbites: true,
      })
    ).toEqual(['episodes', 'downloaded', 'about', 'clips', 'soundbites', 'podroll']);
  });

  it('seeds Podroll from cache before the channel DTO arrives', () => {
    expect(
      resolvePodcastSections({
        channel: null,
        hasSoundbites: false,
        previewHasPodroll: true,
      })
    ).toEqual(['episodes', 'downloaded', 'about', 'clips', 'podroll']);
  });

  it('offers Settings last for signed-in users, after Funding', () => {
    expect(
      resolvePodcastSections({
        channel: {
          channel_fundings: [{ url: 'https://example.com/support' }],
          channel_podroll: { channel_podroll_remote_items: [{ feed_guid: 'guid-1' }] },
        },
        hasSoundbites: true,
        isSignedIn: true,
      })
    ).toEqual([
      'episodes',
      'downloaded',
      'about',
      'clips',
      'soundbites',
      'podroll',
      'funding',
      'settings',
    ]);
  });

  it('hides Settings when signed out', () => {
    expect(
      resolvePodcastSections({
        channel: null,
        hasSoundbites: false,
        isSignedIn: false,
      })
    ).toEqual([...ALWAYS_ON]);
  });

  it('keeps Funding last among content chips when signed out', () => {
    expect(
      resolvePodcastSections({
        channel: {
          channel_fundings: [{ url: 'https://example.com/support' }],
          channel_podroll: { channel_podroll_remote_items: [{ feed_guid: 'guid-1' }] },
        },
        hasSoundbites: true,
      })
    ).toEqual(['episodes', 'downloaded', 'about', 'clips', 'soundbites', 'podroll', 'funding']);
  });

  it('lets the channel DTO override a cached Podroll flag', () => {
    expect(
      resolvePodcastSections({
        channel: { channel_podroll: { channel_podroll_remote_items: [] } },
        hasSoundbites: false,
        previewHasPodroll: true,
      })
    ).toEqual([...ALWAYS_ON]);
  });
});
