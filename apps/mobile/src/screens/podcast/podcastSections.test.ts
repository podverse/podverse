import { describe, expect, it } from 'vitest';

import { channelHasRemoteItems, resolvePodcastSections } from './podcastSections';

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

  it('seeds People from cache before the channel DTO arrives', () => {
    expect(
      resolvePodcastSections({
        channel: null,
        hasSoundbites: false,
        previewHasPeople: true,
      })
    ).toEqual(['episodes', 'downloaded', 'about', 'clips', 'people']);
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

  it('puts Funding after evidence chips', () => {
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

  it('puts People after Funding when the channel has people', () => {
    expect(
      resolvePodcastSections({
        channel: {
          channel_fundings: [{ url: 'https://example.com/support' }],
          channel_persons: [{ id: 1 }],
        },
        hasSoundbites: false,
      })
    ).toEqual(['episodes', 'downloaded', 'about', 'clips', 'funding', 'people']);
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

  it('offers Remote Items after Podroll and before Funding when the channel lists one', () => {
    expect(
      resolvePodcastSections({
        channel: {
          channel_fundings: [{ url: 'https://example.com/support' }],
          channel_podroll: { channel_podroll_remote_items: [{ feed_guid: 'guid-1' }] },
          channel_remote_items: [{ feed_guid: 'guid-2' }],
        },
        hasSoundbites: false,
      })
    ).toEqual(['episodes', 'downloaded', 'about', 'clips', 'podroll', 'remote_items', 'funding']);
  });

  it('hides Remote Items when the list is empty or missing', () => {
    expect(
      resolvePodcastSections({
        channel: { channel_remote_items: [] },
        hasSoundbites: false,
      })
    ).toEqual([...ALWAYS_ON]);
    expect(resolvePodcastSections({ channel: {}, hasSoundbites: false })).toEqual([...ALWAYS_ON]);
  });

  it('seeds Remote Items from cache before the channel DTO arrives', () => {
    expect(
      resolvePodcastSections({
        channel: null,
        hasSoundbites: false,
        previewHasRemoteItems: true,
      })
    ).toEqual(['episodes', 'downloaded', 'about', 'clips', 'remote_items']);
  });
});

describe('channelHasRemoteItems', () => {
  it('is false for a missing channel or an empty list, and true when an entry exists', () => {
    expect(channelHasRemoteItems(null)).toBe(false);
    expect(channelHasRemoteItems({})).toBe(false);
    expect(channelHasRemoteItems({ channel_remote_items: [] })).toBe(false);
    expect(channelHasRemoteItems({ channel_remote_items: [{ feed_guid: 'guid-1' }] })).toBe(true);
  });
});
