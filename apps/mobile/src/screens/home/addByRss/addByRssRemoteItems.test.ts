import { describe, expect, it } from 'vitest';

import type {
  DTOAddByRSSRemoteItemLookupResult,
  DTOIndexProviderFeedTarget,
  DTORemoteChannelStub,
  DTORemoteItemStub,
} from '@podverse/helpers/dto';
import type { AddByRSSBundleRemoteRef } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../../prefs/addByRSSFeeds';
import type { AddByRssRemoteEntry } from './addByRssRemoteItems';
import {
  applyRemoteLookup,
  artworkAddByRssFeedUrlForEntry,
  remoteEntryDisplayTitle,
  remoteFeedDetailParamsForRef,
  remoteRefKey,
  toInitialRemoteEntries,
} from './addByRssRemoteItems';

const channelRef = (overrides: Partial<AddByRSSBundleRemoteRef> = {}): AddByRSSBundleRemoteRef => ({
  feedGuid: 'guid-a',
  feedUrl: 'https://remote.example/feed.xml',
  itemGuid: null,
  title: 'Ref Channel',
  ...overrides,
});

const itemRef = (overrides: Partial<AddByRSSBundleRemoteRef> = {}): AddByRSSBundleRemoteRef =>
  channelRef({ itemGuid: 'item-1', title: 'Ref Episode', ...overrides });

const deviceFeed = (
  overrides: Partial<MobileAddByRSSFeedRecord> = {}
): MobileAddByRSSFeedRecord => ({
  enclosureUrl: null,
  feedUrl: 'https://device.example/own.xml',
  id: 1,
  idText: 'feedabc',
  imageUrl: 'https://device.example/art.jpg',
  latestItemPubDateMs: null,
  playbackPosition: null,
  resourceType: 'podcasts',
  title: 'On Device',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const providerTarget = (
  overrides: Partial<DTOIndexProviderFeedTarget> = {}
): DTOIndexProviderFeedTarget => ({
  author: null,
  feed_url: 'https://remote.example/feed.xml',
  image_url: 'https://img.example/show.jpg',
  index_provider: 'podcast_index',
  provider_feed_id: '99',
  title: 'Provider Show',
  ...overrides,
});

const channelStub = (overrides: Partial<DTORemoteChannelStub> = {}): DTORemoteChannelStub => ({
  author: null,
  feed_guid: 'guid-a',
  feed_url: 'https://remote.example/feed.xml',
  image_url: 'https://img.example/channel.jpg',
  index_provider: 'podcast_index',
  is_remote_stub: true,
  medium_id: null,
  provider_feed_id: '99',
  title: 'Stub Show',
  ...overrides,
});

const itemStub = (overrides: Partial<DTORemoteItemStub> = {}): DTORemoteItemStub => ({
  channel_stub: channelStub(),
  duration_seconds: null,
  image_url: 'https://img.example/item.jpg',
  is_remote_stub: true,
  item_guid: 'item-1',
  provider_item_id: null,
  pub_date: null,
  title: 'Stub Episode',
  ...overrides,
});

const kinds = (entries: readonly AddByRssRemoteEntry[]): string[] =>
  entries.map((entry) => entry.kind);

describe('add-by-RSS remote item rows', () => {
  it('turns a device match into an add-by-RSS row that carries that record feed URL', () => {
    const record = deviceFeed();
    const matched = channelRef();
    const unmatched = itemRef();
    const entries = toInitialRemoteEntries(
      [matched, unmatched],
      new Map([[remoteRefKey(matched), record]])
    );

    expect(kinds(entries)).toEqual(['add_by_rss', 'reference']);
    expect(entries[0]).toMatchObject({
      feedIdText: 'feedabc',
      feedUrl: 'https://device.example/own.xml',
      imageUrl: 'https://device.example/art.jpg',
      kind: 'add_by_rss',
      subtitle: null,
      title: 'On Device',
    });
    expect(entries[1]).toMatchObject({
      kind: 'reference',
      subtitle: null,
      title: 'Ref Episode',
    });
  });

  it('maps lookup results onto the references that were looked up and leaves device rows', () => {
    const record = deviceFeed();
    const onDevice = channelRef();
    const lookedUp = itemRef();
    const initial = toInitialRemoteEntries(
      [onDevice, lookedUp],
      new Map([[remoteRefKey(onDevice), record]])
    );
    const itemResult: DTOAddByRSSRemoteItemLookupResult = {
      item: {
        channel: { id_text: 'ch1', medium_id: 9, title: 'Directory Show' },
        id_text: 'item1',
        title: 'Directory Episode',
      },
      kind: 'item',
    };

    const entries = applyRemoteLookup(initial, [lookedUp], [itemResult]);

    expect(entries[0]).toMatchObject({
      feedUrl: record.feedUrl,
      kind: 'add_by_rss',
    });
    expect(entries[1]).toMatchObject({
      itemIdText: 'item1',
      kind: 'item',
      mediumId: 9,
      subtitle: 'Directory Show',
      title: 'Directory Episode',
    });
  });

  it('maps channel, provider feed, item stub, and none, and builds titles and subtitles', () => {
    const channel = channelRef({ title: 'Listed Channel' });
    const providerItem = itemRef({ itemGuid: 'item-provider', title: 'Listed Episode' });
    const stubItem = itemRef({ itemGuid: 'item-stub', title: null });
    const missed = channelRef({ feedGuid: 'guid-miss', title: 'Still a Reference' });
    const initial = toInitialRemoteEntries([channel, providerItem, stubItem, missed], new Map());

    const channelResult: DTOAddByRSSRemoteItemLookupResult = {
      channel: { id_text: 'ch-added', medium_id: 2, title: 'Parsed Album' },
      kind: 'channel',
    };
    const providerResult: DTOAddByRSSRemoteItemLookupResult = {
      kind: 'provider_feed',
      provider_feed: providerTarget({ title: 'Index Show' }),
    };
    const stub = itemStub({ image_url: null, title: 'Stub Track' });
    const stubResult: DTOAddByRSSRemoteItemLookupResult = {
      item_stub: stub,
      kind: 'item_stub',
    };
    const noneResult: DTOAddByRSSRemoteItemLookupResult = { kind: 'none' };

    const entries = applyRemoteLookup(
      initial,
      [channel, providerItem, stubItem, missed],
      [channelResult, providerResult, stubResult, noneResult]
    );

    expect(entries[0]).toMatchObject({
      channelIdText: 'ch-added',
      imageUrl: null,
      kind: 'channel',
      mediumId: 2,
      subtitle: null,
      title: 'Parsed Album',
    });
    expect(entries[1]).toMatchObject({
      imageUrl: 'https://img.example/show.jpg',
      kind: 'provider_feed',
      subtitle: 'Index Show',
      title: 'Listed Episode',
    });
    expect(entries[2]).toMatchObject({
      imageUrl: 'https://img.example/channel.jpg',
      kind: 'item_stub',
      subtitle: 'Stub Show',
      title: 'Stub Track',
    });
    expect(entries[3]).toMatchObject({
      kind: 'reference',
      title: 'Still a Reference',
    });
  });

  it('prefers the reference title on an item row and drops a repeated subtitle', () => {
    const sameName = itemRef({ title: 'Same Name' });
    const initial = toInitialRemoteEntries([sameName], new Map());
    const result: DTOAddByRSSRemoteItemLookupResult = {
      item: {
        channel: { id_text: 'ch1', medium_id: null, title: 'Same Name' },
        id_text: 'item-same',
        title: 'Same Name',
      },
      kind: 'item',
    };

    expect(applyRemoteLookup(initial, [sameName], [result])[0]).toMatchObject({
      subtitle: null,
      title: 'Same Name',
    });

    const blankChannel = itemRef({ title: 'Episode' });
    const blankInitial = toInitialRemoteEntries([blankChannel], new Map());
    const blankResult: DTOAddByRSSRemoteItemLookupResult = {
      channel: { id_text: 'ch-blank', medium_id: null, title: '   ' },
      kind: 'channel',
    };
    expect(applyRemoteLookup(blankInitial, [blankChannel], [blankResult])[0]).toMatchObject({
      kind: 'channel',
      subtitle: null,
      title: 'Episode',
    });
  });

  it('shows the feed URL, then the untitled label, when a reference has no title', () => {
    const untitledRef = channelRef({ feedUrl: 'https://remote.example/plain.xml', title: null });
    const [entry] = toInitialRemoteEntries([untitledRef], new Map());
    expect(entry?.title).toBeNull();
    expect(entry === undefined ? null : remoteEntryDisplayTitle(entry, 'Untitled')).toBe(
      'https://remote.example/plain.xml'
    );

    const noUrl = channelRef({ feedGuid: 'guid-only', feedUrl: null, title: '   ' });
    const [blank] = toInitialRemoteEntries([noUrl], new Map());
    expect(blank === undefined ? null : remoteEntryDisplayTitle(blank, 'Untitled')).toBe(
      'Untitled'
    );
  });

  it('keeps a stable key for GUID and URL refs, and separates an item on that feed', () => {
    const byGuid = channelRef({ feedGuid: 'abc', feedUrl: 'https://remote.example/feed.xml' });
    const byUrl = channelRef({ feedGuid: null, feedUrl: 'https://remote.example/only.xml' });
    const item = itemRef({ feedGuid: 'abc', itemGuid: 'ep-1' });

    expect(remoteRefKey(byGuid)).toBe('guid:abc');
    expect(remoteRefKey(byGuid)).toBe(remoteRefKey(channelRef({ feedGuid: 'abc' })));
    expect(remoteRefKey(byUrl)).toBe('url:https://remote.example/only.xml');
    expect(remoteRefKey(item)).toBe('guid:abc|item:ep-1');
    expect(remoteRefKey(item)).not.toBe(remoteRefKey(byGuid));
  });

  it('allows artwork credentials only for the matched device feed URL', () => {
    const record = deviceFeed({ feedUrl: 'https://device.example/own.xml' });
    const matched = channelRef();
    const [deviceRow, referenceRow] = toInitialRemoteEntries(
      [matched, itemRef()],
      new Map([[remoteRefKey(matched), record]])
    );
    const lookedUp = applyRemoteLookup(
      toInitialRemoteEntries([channelRef({ feedGuid: 'other' })], new Map()),
      [channelRef({ feedGuid: 'other' })],
      [
        {
          kind: 'provider_feed',
          provider_feed: providerTarget(),
        },
      ]
    )[0];
    const stubRow = applyRemoteLookup(
      toInitialRemoteEntries([itemRef({ feedGuid: 'stubbed' })], new Map()),
      [itemRef({ feedGuid: 'stubbed' })],
      [{ item_stub: itemStub(), kind: 'item_stub' }]
    )[0];

    expect(deviceRow === undefined ? null : artworkAddByRssFeedUrlForEntry(deviceRow)).toBe(
      'https://device.example/own.xml'
    );
    expect(referenceRow === undefined ? null : artworkAddByRssFeedUrlForEntry(referenceRow)).toBe(
      null
    );
    expect(lookedUp === undefined ? null : artworkAddByRssFeedUrlForEntry(lookedUp)).toBeNull();
    expect(stubRow === undefined ? null : artworkAddByRssFeedUrlForEntry(stubRow)).toBeNull();
  });

  it('keeps a channel reference title for the remote feed screen and drops an item title', () => {
    expect(remoteFeedDetailParamsForRef(channelRef({ title: 'Remote Show' }))).toEqual({
      feedUrl: 'https://remote.example/feed.xml',
      title: 'Remote Show',
    });
    expect(remoteFeedDetailParamsForRef(itemRef({ title: 'Remote Episode' }))).toEqual({
      feedUrl: 'https://remote.example/feed.xml',
    });
    expect(remoteFeedDetailParamsForRef(channelRef({ feedUrl: null }))).toBeNull();
    expect(remoteFeedDetailParamsForRef(itemRef({ feedUrl: '  ' }))).toBeNull();
  });
});
