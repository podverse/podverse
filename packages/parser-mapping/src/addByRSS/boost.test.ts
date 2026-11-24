import { describe, expect, it } from 'vitest';

import { convertParsedRSSFeedToCompat } from '../compat/partytime/compatFull.js';
import type { Episode, Phase4PodcastLiveItem, Phase4Value } from '../types/partytime.js';
import { Phase4LiveStatus } from '../types/partytime.js';
import { buildAddByRssBoostItem, buildAddByRssBoostSheetItem } from './boost.js';
import { toIndexItem, toLiveIndexItem } from './itemIndex.js';
import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from './types.js';

const ADDRESS = 'e2e-node-address';
const ITEM_ID_TEXT = 'itemIdText01';

const lightningValue = (address: string): Phase4Value => ({
  type: 'lightning',
  method: 'keysend',
  recipients: [{ type: 'node', address, split: 100, fee: false }],
});

const feedRecord = (mappedFeed: ReturnType<typeof convertParsedRSSFeedToCompat>) => ({
  id: 1,
  idText: 'channelIdText1',
  feedUrl: 'https://example.com/feed.xml',
  title: 'Show',
  imageUrl: null,
  mappedFeed,
});

const episode = (values: Phase4Value[], title: string, guid: string): Episode => ({
  guid,
  title,
  enclosure: { url: 'https://example.com/episode.mp3', type: 'audio/mpeg', length: 1 },
  duration: 1,
  explicit: false,
  values,
});

const episodeIndex = (ep: Episode): AddByRSSItemIndexItem => {
  const mappedFeed = convertParsedRSSFeedToCompat({
    title: 'Show',
    explicit: false,
    link: 'https://example.com',
    items: [ep],
  });
  const bundle = mappedFeed.items[0];
  if (bundle === undefined) {
    throw new Error('expected one mapped item');
  }
  return toIndexItem(feedRecord(mappedFeed), bundle, 0, ITEM_ID_TEXT);
};

const livestreamIndex = (item: Phase4PodcastLiveItem): AddByRSSLivestreamIndexItem => {
  const mappedFeed = convertParsedRSSFeedToCompat({
    title: 'Show',
    explicit: false,
    link: 'https://example.com',
    items: [],
    podcastLiveItems: [item],
  });
  const liveBundle = mappedFeed.liveItems[0];
  if (liveBundle === undefined) {
    throw new Error('expected one live item');
  }
  return toLiveIndexItem(feedRecord(mappedFeed), liveBundle, 0, ITEM_ID_TEXT);
};

describe('buildAddByRssBoostItem', () => {
  it('copies the guid, id, title, and lightning recipient from an episode bundle', () => {
    const result = buildAddByRssBoostItem(
      episodeIndex(episode([lightningValue(ADDRESS)], 'Episode Title', 'episode-guid'))
    );

    expect(result.guid).toBe('episode-guid');
    expect(result.id_text).toBe(ITEM_ID_TEXT);
    expect(result.title).toBe('Episode Title');
    expect(result.item_values[0]?.type).toBe('lightning');
    expect(result.item_values[0]?.method).toBe('keysend');
    expect(result.item_values[0]?.item_value_recipients[0]?.address).toBe(ADDRESS);
  });

  it('copies the lightning recipient from a livestream value block', () => {
    const result = buildAddByRssBoostItem(
      livestreamIndex({
        guid: 'live-guid',
        title: 'Live Title',
        enclosure: { url: 'https://example.com/live.mp3', type: 'audio/mpeg', length: 1 },
        status: Phase4LiveStatus.Live,
        start: new Date('2026-01-01T00:00:00.000Z'),
        contentLinks: [],
        values: [lightningValue(ADDRESS)],
      })
    );

    expect(result.item_values[0]?.item_value_recipients[0]?.address).toBe(ADDRESS);
  });

  it('keeps the guid when the episode has no value rows', () => {
    const result = buildAddByRssBoostItem(episodeIndex(episode([], 'Empty Episode', 'empty-guid')));

    expect(result.item_values).toEqual([]);
    expect(result.guid).toBe('empty-guid');
  });
});

const sheetEpisode = (): Episode => ({
  guid: 'sheet-guid',
  title: 'Sheet Title',
  itunesImage: 'https://example.com/sheet.jpg',
  enclosure: { url: 'https://example.com/episode.mp3', type: 'audio/mpeg', length: 1 },
  duration: 1,
  explicit: false,
  values: [
    {
      type: 'lightning',
      method: 'keysend',
      suggested: '1000',
      recipients: [
        {
          type: 'node',
          address: ADDRESS,
          split: 70,
          name: 'Host',
          customKey: 'podcast',
          customValue: 'boost',
          fee: true,
        },
      ],
      valueTimeSplits: [
        {
          type: 'recipients',
          startTime: 10,
          duration: 20,
          recipients: [{ type: 'node', address: ADDRESS, split: 100, fee: false }],
        },
      ],
    },
    {
      type: 'lightning',
      method: 'lnaddress',
      recipients: [{ type: 'lnaddress', address: 'guest@example.com', split: 30, fee: false }],
    },
  ],
});

const sheetInput = () => {
  const mappedFeed = convertParsedRSSFeedToCompat({
    title: 'Show',
    explicit: false,
    link: 'https://example.com',
    items: [sheetEpisode()],
  });
  const bundle = mappedFeed.items[0];
  if (bundle === undefined) {
    throw new Error('expected one mapped item');
  }
  return bundle;
};

describe('buildAddByRssBoostSheetItem', () => {
  it('copies recipient fields and images and drops time splits', () => {
    const bundle = sheetInput();
    const result = buildAddByRssBoostSheetItem({
      guid: bundle.item.guid,
      idText: 'sheet-item',
      images: bundle.images,
      title: bundle.item.title,
      values: bundle.value,
    });

    expect(result.id_text).toBe('sheet-item');
    expect(result.guid).toBe('sheet-guid');
    expect(result.title).toBe('Sheet Title');
    expect(result.item_images).toEqual([
      {
        id: 1,
        image_width_size: null,
        is_resized: false,
        item_id: 0,
        url: 'https://example.com/sheet.jpg',
      },
    ]);
    expect(result.item_values).toHaveLength(2);

    const keysend = result.item_values.find((value) => value.method === 'keysend');
    const lnaddress = result.item_values.find((value) => value.method === 'lnaddress');
    expect(keysend?.type).toBe('lightning');
    expect(keysend?.item_id).toBe(0);
    expect(keysend?.suggested).toBe(1000);
    expect(keysend).not.toHaveProperty('item_value_time_splits');
    expect(keysend?.item_value_recipients[0]).toMatchObject({
      address: ADDRESS,
      custom_key: 'podcast',
      custom_value: 'boost',
      fee: true,
      item_value_id: keysend?.id,
      name: 'Host',
      split: 70,
      type: 'node',
    });
    expect(lnaddress?.item_value_recipients[0]).toMatchObject({
      address: 'guest@example.com',
      custom_key: null,
      custom_value: null,
      fee: false,
      name: null,
      split: 30,
      type: 'lnaddress',
    });
  });

  it('turns a blank guid into null and keeps a guid that has characters', () => {
    const bundle = sheetInput();
    const blank = buildAddByRssBoostSheetItem({
      guid: '',
      idText: 'sheet-item',
      images: [],
      title: null,
      values: bundle.value,
    });
    const missing = buildAddByRssBoostSheetItem({
      guid: null,
      idText: 'sheet-item',
      images: [],
      title: null,
      values: bundle.value,
    });
    const kept = buildAddByRssBoostSheetItem({
      guid: 'kept-guid',
      idText: 'sheet-item',
      images: [],
      title: 'Kept',
      values: [],
    });

    expect(blank.guid).toBeNull();
    expect(missing.guid).toBeNull();
    expect(kept.guid).toBe('kept-guid');
    expect(kept.title).toBe('Kept');
    expect(kept.item_values).toEqual([]);
  });
});
