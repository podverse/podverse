import { describe, expect, it } from 'vitest';

import type { AddByRssDeviceRefreshEntry } from './addByRssDevicePath';
import {
  ADD_BY_RSS_DEVICE_REFRESH_STALE_AFTER_MS,
  addByRssFollowOwnershipValues,
  classifySignupCarryFollowError,
  deviceCacheForFetch,
  deviceCacheToStore,
  isAddByRssFeedHiddenInSession,
  isDeviceRefreshDue,
  mergeAddByRssLoginSettleMarker,
  parseAddByRssLoginSettleMarker,
  planAddByRssSignupCarry,
  planSignInOwnership,
  selectDeviceRefreshFeedUrls,
} from './addByRssDevicePath';

const NOW = 1_800_000_000_000;

describe('deviceCacheForFetch', () => {
  it('sends no cache when the row holds no bundle', () => {
    expect(
      deviceCacheForFetch({
        deviceEtag: '"abc"',
        deviceFeedHash: 'hash',
        deviceLastModified: 'Tue, 01 Sep 2026 00:00:00 GMT',
        hasBundle: false,
      })
    ).toBeNull();
  });

  it('sends no cache when nothing was cached', () => {
    expect(
      deviceCacheForFetch({
        deviceEtag: null,
        deviceFeedHash: null,
        deviceLastModified: null,
        hasBundle: true,
      })
    ).toBeNull();
  });

  it('passes the stored values through', () => {
    expect(
      deviceCacheForFetch({
        deviceEtag: '"abc"',
        deviceFeedHash: null,
        deviceLastModified: 'Tue, 01 Sep 2026 00:00:00 GMT',
        hasBundle: true,
      })
    ).toEqual({
      etag: '"abc"',
      feedHash: null,
      lastModified: 'Tue, 01 Sep 2026 00:00:00 GMT',
    });
  });
});

describe('deviceCacheToStore', () => {
  const cache = { etag: '"v2"', feedHash: 'hash-2', lastModified: null };

  it('stores the cache that came with a new bundle, including none', () => {
    expect(deviceCacheToStore({ conditionalCache: cache, mappedFeed: {}, status: 'parsed' })).toBe(
      cache
    );
    expect(
      deviceCacheToStore({ conditionalCache: null, mappedFeed: {}, status: 'parsed' })
    ).toBeNull();
  });

  it('keeps the stored cache for an unchanged feed when the host sent no new validator', () => {
    expect(
      deviceCacheToStore({ conditionalCache: null, mappedFeed: null, status: 'not_modified' })
    ).toBeUndefined();
  });

  it('keeps the stored cache after a failure', () => {
    expect(
      deviceCacheToStore({ conditionalCache: cache, mappedFeed: null, status: 'failed' })
    ).toBeUndefined();
  });
});

describe('isDeviceRefreshDue', () => {
  it('always runs a user refresh', () => {
    expect(isDeviceRefreshDue({ checkedAtMs: NOW, nowMs: NOW, priority: 'user' })).toBe(true);
  });

  it('runs a feed this device never fetched', () => {
    expect(isDeviceRefreshDue({ checkedAtMs: null, nowMs: NOW, priority: 'background' })).toBe(
      true
    );
  });

  it('skips a background refresh inside the stale window and runs it outside', () => {
    expect(
      isDeviceRefreshDue({
        checkedAtMs: NOW - ADD_BY_RSS_DEVICE_REFRESH_STALE_AFTER_MS + 1,
        nowMs: NOW,
        priority: 'background',
      })
    ).toBe(false);
    expect(
      isDeviceRefreshDue({
        checkedAtMs: NOW - ADD_BY_RSS_DEVICE_REFRESH_STALE_AFTER_MS,
        nowMs: NOW,
        priority: 'background',
      })
    ).toBe(true);
  });
});

describe('selectDeviceRefreshFeedUrls', () => {
  const entry = (overrides: Partial<AddByRssDeviceRefreshEntry>): AddByRssDeviceRefreshEntry => ({
    checkedAtMs: null,
    feedUrl: 'https://example.com/feed.xml',
    hasCredentials: false,
    requiresCredentials: false,
    ...overrides,
  });

  it('skips a feed that needs credentials this device lacks and keeps input order', () => {
    const entries = [
      entry({ feedUrl: 'https://c.example.com/feed.xml' }),
      entry({ feedUrl: 'https://locked.example.com/feed.xml', requiresCredentials: true }),
      entry({
        feedUrl: 'https://held.example.com/feed.xml',
        hasCredentials: true,
        requiresCredentials: true,
      }),
      entry({ feedUrl: 'https://a.example.com/feed.xml' }),
    ];

    expect(selectDeviceRefreshFeedUrls({ entries, nowMs: NOW, priority: 'user' })).toEqual([
      'https://c.example.com/feed.xml',
      'https://held.example.com/feed.xml',
      'https://a.example.com/feed.xml',
    ]);
  });

  it('leaves out a feed fetched inside the stale window on a background refresh', () => {
    const entries = [
      entry({ checkedAtMs: NOW, feedUrl: 'https://fresh.example.com/feed.xml' }),
      entry({ feedUrl: 'https://never.example.com/feed.xml' }),
    ];

    expect(selectDeviceRefreshFeedUrls({ entries, nowMs: NOW, priority: 'background' })).toEqual([
      'https://never.example.com/feed.xml',
    ]);
  });
});

describe('isAddByRssFeedHiddenInSession', () => {
  it('hides only a followed signed-out row while someone is signed in', () => {
    expect(
      isAddByRssFeedHiddenInSession({ followed: true, isSignedIn: true, signedOutOwned: true })
    ).toBe(true);
    expect(
      isAddByRssFeedHiddenInSession({ followed: true, isSignedIn: true, signedOutOwned: false })
    ).toBe(false);
  });

  it('never hides a listed-only row', () => {
    expect(
      isAddByRssFeedHiddenInSession({ followed: false, isSignedIn: true, signedOutOwned: true })
    ).toBe(false);
  });

  it('never hides a row while signed out', () => {
    expect(
      isAddByRssFeedHiddenInSession({ followed: true, isSignedIn: false, signedOutOwned: true })
    ).toBe(false);
  });
});

describe('addByRssFollowOwnershipValues', () => {
  it('gives the follow to the signed-out user or the signed-in account', () => {
    expect(
      addByRssFollowOwnershipValues({
        isNewFeed: true,
        isSignedIn: false,
        nowMs: NOW,
        wasFollowed: false,
      }).signedOutOwned
    ).toBe(1);
    expect(
      addByRssFollowOwnershipValues({
        isNewFeed: true,
        isSignedIn: true,
        nowMs: NOW,
        wasFollowed: false,
      }).signedOutOwned
    ).toBe(0);
  });

  it('stamps when a new feed or a newly followed feed starts being followed', () => {
    expect(
      addByRssFollowOwnershipValues({
        isNewFeed: true,
        isSignedIn: false,
        nowMs: NOW,
        wasFollowed: false,
      })
    ).toEqual({ followedAt: NOW, signedOutOwned: 1 });
    expect(
      addByRssFollowOwnershipValues({
        isNewFeed: false,
        isSignedIn: true,
        nowMs: NOW,
        wasFollowed: false,
      })
    ).toEqual({ followedAt: NOW, signedOutOwned: 0 });
  });

  it('keeps the follow order of a feed already followed', () => {
    const values = addByRssFollowOwnershipValues({
      isNewFeed: false,
      isSignedIn: true,
      nowMs: NOW,
      wasFollowed: true,
    });

    expect(values).toEqual({ signedOutOwned: 0 });
    expect('followedAt' in values).toBe(false);
  });
});

describe('parseAddByRssLoginSettleMarker', () => {
  it('reads a marker with a sign-up time and one without', () => {
    expect(
      parseAddByRssLoginSettleMarker({
        accountIdText: 'acct_1',
        signedUpAtMs: 1_700_000_000_000,
        signup: true,
      })
    ).toEqual({
      accountIdText: 'acct_1',
      signedUpAtMs: 1_700_000_000_000,
      signup: true,
    });
    expect(
      parseAddByRssLoginSettleMarker({
        accountIdText: 'acct_1',
        signedUpAtMs: null,
        signup: false,
      })
    ).toEqual({ accountIdText: 'acct_1', signedUpAtMs: null, signup: false });
  });

  it('rejects a missing account, a string signup flag, and a non-number sign-up time', () => {
    expect(parseAddByRssLoginSettleMarker({ signedUpAtMs: 1, signup: true })).toBeNull();
    expect(
      parseAddByRssLoginSettleMarker({ accountIdText: '', signedUpAtMs: 1, signup: true })
    ).toBeNull();
    expect(
      parseAddByRssLoginSettleMarker({
        accountIdText: 'acct_1',
        signedUpAtMs: 1,
        signup: 'true',
      })
    ).toBeNull();
    expect(
      parseAddByRssLoginSettleMarker({
        accountIdText: 'acct_1',
        signedUpAtMs: '1',
        signup: true,
      })
    ).toBeNull();
  });
});

describe('mergeAddByRssLoginSettleMarker', () => {
  const signup = { accountIdText: 'acct_1', signedUpAtMs: 10, signup: true };
  const plain = { accountIdText: 'acct_1', signedUpAtMs: null, signup: false };

  it('keeps a pending sign-up against a plain login for the same account', () => {
    expect(mergeAddByRssLoginSettleMarker(signup, plain)).toEqual(signup);
  });

  it('replaces a pending sign-up when a different account logs in', () => {
    const other = { accountIdText: 'acct_2', signedUpAtMs: null, signup: false };
    expect(mergeAddByRssLoginSettleMarker(signup, other)).toEqual(other);
  });

  it('replaces a plain marker with a sign-up for the same account', () => {
    expect(mergeAddByRssLoginSettleMarker(plain, signup)).toEqual(signup);
  });
});

describe('planSignInOwnership', () => {
  const startedAtMs = 5_000;
  const stored = 'https://example.com/feeds/show';

  it('claims a shared row and keeps the stored URL when the account spells it differently', () => {
    const exact = 'http://localhost:2111/feeds/feed-1.rss';
    const { claim, release } = planSignInOwnership({
      accountFeedUrls: ['https://Example.com/feeds/show/', exact],
      rows: [
        { feedUrl: stored, followedAtMs: 1, signedOutOwned: true },
        { feedUrl: exact, followedAtMs: 2, signedOutOwned: true },
      ],
      startedAtMs,
    });

    expect(claim).toEqual([stored, exact]);
    expect(release).toEqual([]);
  });

  it('releases an earlier account row and keeps a row followed after the settle started', () => {
    const { claim, release } = planSignInOwnership({
      accountFeedUrls: ['https://example.com/kept.xml'],
      rows: [
        {
          feedUrl: 'https://earlier.example.com/feed.xml',
          followedAtMs: 1,
          signedOutOwned: false,
        },
        {
          feedUrl: 'https://during.example.com/feed.xml',
          followedAtMs: startedAtMs,
          signedOutOwned: false,
        },
        {
          feedUrl: 'https://after.example.com/feed.xml',
          followedAtMs: startedAtMs + 1,
          signedOutOwned: false,
        },
      ],
      startedAtMs,
    });

    expect(claim).toEqual([]);
    expect(release).toEqual(['https://earlier.example.com/feed.xml']);
  });

  it('leaves a signed-out row the account does not follow alone', () => {
    const { claim, release } = planSignInOwnership({
      accountFeedUrls: ['https://example.com/kept.xml'],
      rows: [
        {
          feedUrl: 'https://signed-out.example.com/feed.xml',
          followedAtMs: 1,
          signedOutOwned: true,
        },
      ],
      startedAtMs,
    });

    expect(claim).toEqual([]);
    expect(release).toEqual([]);
  });
});

describe('planAddByRssSignupCarry', () => {
  const feeds = [
    { feedUrl: 'oldest', followedAtMs: 100 },
    { feedUrl: 'middle', followedAtMs: 200 },
    { feedUrl: 'after', followedAtMs: 500 },
  ];

  it('saves every feed and removes none when the count is under the limit', () => {
    expect(planAddByRssSignupCarry({ feeds, limit: 10, signedUpAtMs: 400 })).toEqual({
      remove: [],
      save: ['oldest', 'middle', 'after'],
    });
  });

  it('saves the oldest feeds up to the limit and removes only earlier extras', () => {
    expect(
      planAddByRssSignupCarry({
        feeds: [...feeds, { feedUrl: 'unstamped', followedAtMs: null }],
        limit: 1,
        signedUpAtMs: 400,
      })
    ).toEqual({
      remove: ['middle', 'unstamped'],
      save: ['oldest'],
    });
  });

  it('removes none when the sign-up time is unknown', () => {
    expect(planAddByRssSignupCarry({ feeds, limit: 1, signedUpAtMs: null })).toEqual({
      remove: [],
      save: ['oldest'],
    });
  });

  it('saves none when the limit is zero', () => {
    expect(planAddByRssSignupCarry({ feeds, limit: 0, signedUpAtMs: 400 })).toEqual({
      remove: ['oldest', 'middle'],
      save: [],
    });
  });
});

describe('classifySignupCarryFollowError', () => {
  const gate = (i18nKey: string): unknown => ({
    response: { data: { i18nKey }, status: 403 },
  });

  it('stops on a feed-limit, expired, or feature-not-available denial', () => {
    expect(classifySignupCarryFollowError(gate('membership.add_by_rss_feed_limit_reached'))).toBe(
      'stop'
    );
    expect(classifySignupCarryFollowError(gate('membership.membership_expired'))).toBe('stop');
    expect(
      classifySignupCarryFollowError(gate('membership.feature_not_available_for_account_type'))
    ).toBe('stop');
  });

  it('skips a rejected URL and rethrows a server or network failure', () => {
    expect(classifySignupCarryFollowError({ response: { data: {}, status: 400 } })).toBe('skip');
    expect(classifySignupCarryFollowError({ response: { data: {}, status: 500 } })).toBe('rethrow');
    expect(classifySignupCarryFollowError(new Error('network'))).toBe('rethrow');
  });
});
