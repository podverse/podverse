import { describe, expect, it } from 'vitest';

import type { FeedObject } from '@podverse/parser-mapping';
import type { AddByRSSBundleRemoteRef } from '@podverse/parser-mapping';
import { convertParsedRSSFeedToCompat, Phase4Medium } from '@podverse/parser-mapping';

import {
  findAddByRSSFeedForRemoteRef,
  remoteFeedPathForRef,
  remoteRefRowKey,
} from './remoteItemRefs';
import type { AddByRSSFeedRecord } from './types';

const queryParams = (path: string): URLSearchParams => {
  const query = path.split('?')[1] ?? '';
  return new URLSearchParams(query);
};

const feedRecord = (input: {
  idText: string;
  feedUrl: string;
  guid?: string;
}): AddByRSSFeedRecord => {
  const parsed: FeedObject = {
    title: input.idText,
    explicit: false,
    link: 'https://example.com',
    guid: input.guid,
    medium: Phase4Medium.Podcast,
    items: [],
  };
  return {
    id: 1,
    idText: input.idText,
    resourceType: 'podcasts',
    feedUrl: input.feedUrl,
    title: input.idText,
    imageUrl: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...(input.guid === undefined ? {} : { mappedFeed: convertParsedRSSFeedToCompat(parsed) }),
  };
};

const ref = (
  input: Partial<AddByRSSBundleRemoteRef> & Pick<AddByRSSBundleRemoteRef, 'feedGuid' | 'feedUrl'>
): AddByRSSBundleRemoteRef => ({
  itemGuid: null,
  title: null,
  ...input,
});

describe('findAddByRSSFeedForRemoteRef', () => {
  const byUrl = feedRecord({
    idText: 'url-feed',
    feedUrl: 'https://feeds.example/show.xml',
    guid: 'guid-of-url-feed',
  });
  const byGuid = feedRecord({
    idText: 'guid-feed',
    feedUrl: 'https://feeds.example/other.xml',
    guid: 'guid-only',
  });
  const feeds = [byGuid, byUrl];

  it('matches the comparable feed URL before a podcast GUID on another feed', () => {
    const match = findAddByRSSFeedForRemoteRef(
      ref({
        feedGuid: 'guid-only',
        feedUrl: 'HTTPS://Feeds.Example/show.xml',
        title: 'Show',
      }),
      feeds
    );

    expect(match?.idText).toBe('url-feed');
  });

  it('matches by podcast GUID when the reference has no feed URL', () => {
    const match = findAddByRSSFeedForRemoteRef(
      ref({ feedGuid: '  GUID-ONLY  ', feedUrl: null }),
      feeds
    );

    expect(match?.idText).toBe('guid-feed');
  });

  it('returns undefined when neither the URL nor the GUID matches', () => {
    const match = findAddByRSSFeedForRemoteRef(
      ref({
        feedGuid: 'missing-guid',
        feedUrl: 'https://feeds.example/missing.xml',
      }),
      feeds
    );

    expect(match).toBeUndefined();
  });
});

describe('remoteRefRowKey', () => {
  it('differs for a channel reference and an item reference on the same feed', () => {
    const channel = ref({
      feedGuid: 'abc-guid',
      feedUrl: 'https://feeds.example/show.xml',
      title: 'Show',
    });
    const item = ref({
      feedGuid: 'abc-guid',
      feedUrl: 'https://feeds.example/show.xml',
      itemGuid: 'item-1',
      title: 'Episode',
    });

    expect(remoteRefRowKey(channel)).toBe('guid:abc-guid');
    expect(remoteRefRowKey(item)).toBe('guid:abc-guid|item:item-1');
    expect(remoteRefRowKey(channel)).not.toBe(remoteRefRowKey(item));
  });
});

describe('remoteFeedPathForRef', () => {
  const feedUrl = 'https://feeds.example/show.xml';

  it('keeps the title for a channel reference, and the query holds only feed_url and title', () => {
    const path = remoteFeedPathForRef(ref({ feedGuid: 'abc-guid', feedUrl, title: 'Remote Show' }));

    expect(path).not.toBeNull();
    if (path === null) {
      return;
    }
    const params = queryParams(path);
    expect([...params.keys()].sort()).toEqual(['feed_url', 'title']);
    expect(params.get('feed_url')).toBe(feedUrl);
    expect(params.get('title')).toBe('Remote Show');
  });

  it('drops the title for an item reference', () => {
    const path = remoteFeedPathForRef(
      ref({
        feedGuid: 'abc-guid',
        feedUrl,
        itemGuid: 'item-1',
        title: 'Episode One',
      })
    );

    expect(path).not.toBeNull();
    if (path === null) {
      return;
    }
    const params = queryParams(path);
    expect([...params.keys()]).toEqual(['feed_url']);
    expect(params.get('feed_url')).toBe(feedUrl);
    expect(params.has('title')).toBe(false);
  });

  it('returns null when the reference has no feed URL', () => {
    expect(
      remoteFeedPathForRef(ref({ feedGuid: 'abc-guid', feedUrl: null, title: 'Show' }))
    ).toBeNull();
  });
});
