import { describe, expect, it } from 'vitest';

import type { Episode, Phase4PodcastLiveItem, Phase4Value } from '@podverse/parser-mapping';
import { convertParsedRSSFeedToCompat, Phase4LiveStatus } from '@podverse/parser-mapping';

import { boostTargetFromMappedFeed } from './boostTarget';

const ADDRESS = 'e2e-node-address';
const FEED = {
  id: 7,
  idText: 'feedIdText01',
  feedUrl: 'https://example.com/feed.xml',
  title: 'Show',
  imageUrl: null,
};

const lightningValue = (address: string): Phase4Value => ({
  type: 'lightning',
  method: 'keysend',
  recipients: [{ type: 'node', address, split: 100, fee: false }],
  valueTimeSplits: [
    {
      type: 'recipients',
      startTime: 10,
      duration: 20,
      recipients: [{ type: 'node', address, split: 100, fee: false }],
    },
  ],
});

const episode = (): Episode => ({
  guid: 'episode-guid',
  title: 'Episode Title',
  enclosure: { url: 'https://example.com/episode.mp3', type: 'audio/mpeg', length: 1 },
  duration: 1,
  explicit: false,
  values: [lightningValue(ADDRESS)],
});

const liveItem = (): Phase4PodcastLiveItem => ({
  guid: '  live-guid  ',
  title: 'Live Title',
  enclosure: { url: 'https://example.com/live.mp3', type: 'audio/mpeg', length: 1 },
  status: Phase4LiveStatus.Live,
  start: new Date('2026-01-01T00:00:00.000Z'),
  contentLinks: [],
  values: [lightningValue(ADDRESS)],
});

const mappedFeed = () =>
  convertParsedRSSFeedToCompat({
    title: 'Show',
    guid: 'pod-guid-1',
    explicit: false,
    link: 'https://example.com',
    items: [episode()],
    podcastLiveItems: [liveItem()],
  });

describe('boostTargetFromMappedFeed', () => {
  it('returns a channel target and ignores the item key when no item is passed', () => {
    const result = boostTargetFromMappedFeed({
      feed: FEED,
      item: null,
      itemKey: 'ignored',
      liveItem: null,
      mappedFeed: mappedFeed(),
    });

    expect(result?.item).toBeNull();
    expect(result?.addByRss).toEqual({
      feedIdText: FEED.idText,
      feedUrl: FEED.feedUrl,
      itemKey: null,
    });
    expect(result?.channel.id).toBe(FEED.id);
    expect(result?.channel.id_text).toBe(FEED.idText);
    expect(result?.channel.feed_id).toBe(FEED.id);
    expect(result?.channel.podcast_guid).toBe('pod-guid-1');
  });

  it('returns the episode item with the passed key and drops time splits', () => {
    const feed = mappedFeed();
    const bundle = feed.items[0];
    if (bundle === undefined) {
      throw new Error('expected one mapped item');
    }

    const result = boostTargetFromMappedFeed({
      feed: FEED,
      item: bundle,
      itemKey: 'episode-key',
      liveItem: null,
      mappedFeed: feed,
    });

    expect(result?.addByRss?.itemKey).toBe('episode-key');
    expect(result?.item?.id_text).toBe('episode-key');
    expect(result?.item?.guid).toBe('episode-guid');
    expect(result?.item?.title).toBe('Episode Title');
    expect(result?.item?.item_values?.[0]?.item_value_recipients[0]?.address).toBe(ADDRESS);
    expect(result?.item?.item_values?.[0]).not.toHaveProperty('item_value_time_splits');
  });

  it('returns null when an item is passed without a key', () => {
    const feed = mappedFeed();
    const bundle = feed.items[0];
    if (bundle === undefined) {
      throw new Error('expected one mapped item');
    }

    expect(
      boostTargetFromMappedFeed({
        feed: FEED,
        item: bundle,
        itemKey: '',
        liveItem: null,
        mappedFeed: feed,
      })
    ).toBeNull();
    expect(
      boostTargetFromMappedFeed({
        feed: FEED,
        item: bundle,
        itemKey: null,
        liveItem: null,
        mappedFeed: feed,
      })
    ).toBeNull();
  });

  it('uses the live item when one is passed, including over an episode', () => {
    const feed = mappedFeed();
    const bundle = feed.items[0];
    const live = feed.liveItems[0];
    if (bundle === undefined || live === undefined) {
      throw new Error('expected an episode and a live item');
    }

    const result = boostTargetFromMappedFeed({
      feed: FEED,
      item: bundle,
      itemKey: 'live-key',
      liveItem: live,
      mappedFeed: feed,
    });

    expect(result?.addByRss?.itemKey).toBe('live-key');
    expect(result?.item?.id_text).toBe('live-key');
    expect(result?.item?.guid).toBe('live-guid');
    expect(result?.item?.title).toBe('Live Title');
    expect(result?.item?.item_values?.[0]?.item_value_recipients[0]?.type).toBe('node');
    expect(
      boostTargetFromMappedFeed({
        feed: FEED,
        item: bundle,
        itemKey: ' ',
        liveItem: live,
        mappedFeed: feed,
      })
    ).not.toBeNull();
    expect(
      boostTargetFromMappedFeed({
        feed: FEED,
        item: null,
        itemKey: '',
        liveItem: live,
        mappedFeed: feed,
      })
    ).toBeNull();
  });
});
