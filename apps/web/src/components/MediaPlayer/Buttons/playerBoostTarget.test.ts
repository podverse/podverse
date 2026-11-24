import { describe, expect, it } from 'vitest';

import type {
  DTOChannel,
  DTOChannelValue,
  DTOChannelValueRecipient,
  DTOItem,
  DTOItemValue,
} from '@podverse/helpers';
import type { AddByRSSFeedRecordWithMapped, Episode, Phase4Value } from '@podverse/parser-mapping';
import { convertParsedRSSFeedToCompat, toIndexItem } from '@podverse/parser-mapping';

import {
  boostTargetFromAddByRss,
  boostTargetFromRecords,
  databaseChannelNeedsFetch,
  databaseItemNeedsFetch,
} from './playerBoostTarget';

const channel = (channelValues?: DTOChannel['channel_values']): DTOChannel => ({
  id: 1,
  id_text: 'channel1',
  slug: null,
  feed_id: 1,
  podcast_guid: null,
  title: 'Show',
  sortable_title: null,
  medium_id: 1,
  has_value_time_splits: false,
  ...(channelValues === undefined ? {} : { channel_values: channelValues }),
});

const lightningRecipient = (type: string): DTOChannelValueRecipient => ({
  address: 'host@example.com',
  custom_key: null,
  custom_value: null,
  fee: false,
  id: 1,
  name: 'Host',
  split: 100,
  type,
});

const lightningChannelValue = (recipientType: string | null): DTOChannelValue => ({
  channel_value_recipients: recipientType === null ? [] : [lightningRecipient(recipientType)],
  id: 1,
  method: 'keysend',
  suggested: null,
  type: 'lightning',
});

const item = (itemValues: DTOItem['item_values']): DTOItem => ({
  id: 1,
  id_text: 'item1',
  channel_id: 1,
  guid: 'item-guid',
  title: 'Episode',
  item_flag_status_id: 0,
  item_about: { id: 1, item_id: 1 },
  item_chat: { id: 1, item_id: 1, server: '' },
  item_license: { id: 1, item_id: 1, identifier: '', url: null },
  item_location: { id: 1, item_id: 1, name: null },
  item_season: { id: 1, channel_season_id: 1, item_id: 1, title: null },
  item_content_links: [],
  item_enclosures: [],
  item_fundings: [],
  item_images: [],
  item_persons: [],
  item_social_interacts: [],
  item_soundbites: [],
  item_transcripts: [],
  item_txts: [],
  item_values: itemValues,
});

const itemLightningValue = (): DTOItemValue => ({
  id: 1,
  item_id: 1,
  item_value_recipients: [
    {
      address: 'host@example.com',
      fee: false,
      id: 1,
      item_value_id: 1,
      split: 100,
      type: 'node',
    },
  ],
  method: 'keysend',
  suggested: null,
  type: 'lightning',
});

const itemWithoutValues = (): DTOItem => {
  const stored = item([]);
  Reflect.deleteProperty(stored, 'item_values');
  return stored;
};

const lightningValue = (): Phase4Value => ({
  type: 'lightning',
  method: 'keysend',
  recipients: [{ type: 'node', address: 'node@example.com', split: 100, fee: false }],
});

const episode = (): Episode => ({
  guid: 'episode-guid',
  title: 'Episode',
  enclosure: { url: 'https://example.com/episode.mp3', type: 'audio/mpeg', length: 1 },
  duration: 1,
  explicit: false,
});

const addByRssEpisode = () => {
  const mappedFeed = convertParsedRSSFeedToCompat({
    title: 'Show',
    explicit: false,
    link: 'https://example.com',
    items: [episode()],
    values: [lightningValue()],
  });
  const feed: AddByRSSFeedRecordWithMapped = {
    id: 1,
    idText: 'channelIdText1',
    feedUrl: 'https://example.com/feed.xml',
    title: 'Show',
    imageUrl: null,
    mappedFeed,
  };
  const bundle = mappedFeed.items[0];
  if (bundle === undefined) {
    throw new Error('expected one mapped item');
  }
  return { feed, indexItem: toIndexItem(feed, bundle, 0, 'itemIdText01') };
};

describe('databaseChannelNeedsFetch', () => {
  it('skips a channel whose channel_values array is already present, including an empty array', () => {
    expect(databaseChannelNeedsFetch(channel([]))).toBe(false);
  });

  it('loads a channel that has no channel_values property', () => {
    expect(databaseChannelNeedsFetch(channel())).toBe(true);
  });
});

describe('databaseItemNeedsFetch', () => {
  it('skips an item whose item_values array is already present, including an empty array', () => {
    expect(databaseItemNeedsFetch(item([]))).toBe(false);
  });

  it('loads an item that has no item_values property', () => {
    expect(databaseItemNeedsFetch(itemWithoutValues())).toBe(true);
  });

  it('skips a null item', () => {
    expect(databaseItemNeedsFetch(null)).toBe(false);
  });
});

describe('boostTargetFromRecords', () => {
  it('returns a target for a lightning node recipient when the channel has no MetaBoost tag', () => {
    const show = channel([lightningChannelValue('node')]);
    const target = boostTargetFromRecords(show, null);

    expect(target?.channel).toBe(show);
    expect(target?.item).toBeNull();
  });

  it('returns null when that lightning value has an empty recipient list and no MetaBoost tag', () => {
    const show = channel([lightningChannelValue(null)]);

    expect(boostTargetFromRecords(show, null)).toBeNull();
  });

  it('returns a target when the channel value list is empty and the item has a lightning node recipient', () => {
    const show = channel([]);
    const episodeItem = item([itemLightningValue()]);
    const target = boostTargetFromRecords(show, episodeItem);

    expect(target?.channel).toBe(show);
    expect(target?.item).toBe(episodeItem);
  });
});

describe('boostTargetFromAddByRss', () => {
  it('returns a target whose item guid is the index item guid when the feed has a lightning node recipient', () => {
    const { feed, indexItem } = addByRssEpisode();
    const target = boostTargetFromAddByRss(feed, indexItem);

    expect(target?.item?.guid).toBe(indexItem.itemGuid);
  });

  it('returns null for a null feed', () => {
    const { indexItem } = addByRssEpisode();

    expect(boostTargetFromAddByRss(null, indexItem)).toBeNull();
  });
});
