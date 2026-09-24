import { describe, expect, it, vi } from 'vitest';

import type { RemoteItemDto } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import {
  groupNewRemoteItemsByFeed,
  listNewRemoteItemRefs,
  newRemoteItemsFromParsedChannel,
  pickFirstResolvedRemoteAlbum,
  remoteAlbumNotificationTitle,
  shouldNotifyForRemoteAlbumRefs,
} from './remoteAlbumNotification.js';

const FEED_A = '11111111-1111-4111-8111-111111111111';
const FEED_B = '22222222-2222-4222-8222-222222222222';

const ref = (
  overrides: Partial<RemoteItemDto> & Pick<RemoteItemDto, 'feed_guid'>
): RemoteItemDto => ({
  feed_url: null,
  item_guid: null,
  medium_id: null,
  title: null,
  ...overrides,
});

describe('shouldNotifyForRemoteAlbumRefs', () => {
  it('notifies artist feeds only', () => {
    expect(shouldNotifyForRemoteAlbumRefs(MediumEnum.PublisherMusic)).toBe(true);
    expect(shouldNotifyForRemoteAlbumRefs(MediumEnum.Podcast)).toBe(false);
    expect(shouldNotifyForRemoteAlbumRefs(MediumEnum.Music)).toBe(false);
  });
});

describe('listNewRemoteItemRefs', () => {
  it('keeps pairs that were not already stored, once, in incoming order', () => {
    const existing = [{ feed_guid: FEED_A, item_guid: null }];
    const incoming = [
      ref({ feed_guid: FEED_A, title: 'Already stored' }),
      ref({ feed_guid: FEED_B, item_guid: 'track-1', title: 'New track' }),
      ref({ feed_guid: FEED_B, item_guid: 'track-1', title: 'Duplicate' }),
      ref({ feed_guid: FEED_A, feed_url: 'https://example.com/new.xml', title: 'Same album, new url' }),
    ];

    expect(listNewRemoteItemRefs(existing, incoming).map((row) => row.title)).toEqual(['New track']);
  });
});

describe('groupNewRemoteItemsByFeed', () => {
  it('groups by feed guid and keeps album and track titles', () => {
    const groups = groupNewRemoteItemsByFeed([
      ref({ feed_guid: FEED_B, feed_url: 'https://b.example/rss', item_guid: 't1', title: 'Track one' }),
      ref({ feed_guid: FEED_A, title: 'Album A' }),
      ref({ feed_guid: FEED_B, item_guid: 't2', title: 'Track two' }),
    ]);

    expect(groups.map((group) => group.feedGuid)).toEqual([FEED_B, FEED_A]);
    expect(groups[0]).toMatchObject({
      albumTitle: null,
      feedUrls: ['https://b.example/rss'],
      trackTitles: ['Track one', 'Track two'],
    });
    expect(groups[1]?.albumTitle).toBe('Album A');
  });
});

describe('remoteAlbumNotificationTitle', () => {
  it('prefers the resolved name, then the album title, then the first track title', () => {
    const group = {
      albumTitle: 'Album title',
      feedGuid: FEED_A,
      feedUrls: [],
      trackTitles: ['Track title'],
    };
    expect(remoteAlbumNotificationTitle(group, 'Resolved')).toBe('Resolved');
    expect(remoteAlbumNotificationTitle(group, '  ')).toBe('Album title');
    expect(remoteAlbumNotificationTitle({ ...group, albumTitle: null }, null)).toBe('Track title');
    expect(
      remoteAlbumNotificationTitle({ ...group, albumTitle: null, trackTitles: [] }, null)
    ).toBe('');
  });
});

describe('pickFirstResolvedRemoteAlbum', () => {
  it('stops at the first group that resolves', async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('second')
      .mockResolvedValueOnce('third');
    const groups = [FEED_A, FEED_B, '33333333-3333-4333-8333-333333333333'].map((feedGuid) => ({
      albumTitle: null,
      feedGuid,
      feedUrls: [],
      trackTitles: [],
    }));

    await expect(pickFirstResolvedRemoteAlbum(groups, resolve)).resolves.toBe('second');
    expect(resolve).toHaveBeenCalledTimes(2);
  });
});

describe('newRemoteItemsFromParsedChannel', () => {
  it('treats a missing parse result as no new remote items', () => {
    expect(newRemoteItemsFromParsedChannel(undefined)).toEqual([]);
    expect(newRemoteItemsFromParsedChannel(null)).toEqual([]);
    expect(newRemoteItemsFromParsedChannel({ newRemoteItems: [ref({ feed_guid: FEED_A })] })).toHaveLength(
      1
    );
  });
});
