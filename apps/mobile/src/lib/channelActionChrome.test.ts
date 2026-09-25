import { describe, expect, it } from 'vitest';

import {
  getChannelActionChrome,
  hydrateChannelActionChrome,
  parsePersistedChannelActionChrome,
  rememberChannelIdentity,
  rememberChannelNotifications,
  rememberChannelSubscribed,
  resetChannelActionChromeForTests,
  resolveChannelNotificationsEnabled,
  resolveInitialSubscribed,
  snapshotPersistedChannelActionChrome,
} from './channelActionChrome';

describe('resolveInitialSubscribed', () => {
  it('prefers the navigate preview over the cache', () => {
    resetChannelActionChromeForTests();
    rememberChannelSubscribed('abc', true);
    expect(resolveInitialSubscribed('abc', false)).toBe(false);
    expect(resolveInitialSubscribed('abc', true)).toBe(true);
  });

  it('uses the cache when the source did not already know', () => {
    resetChannelActionChromeForTests();
    rememberChannelSubscribed('abc', true);
    expect(resolveInitialSubscribed('abc')).toBe(true);
    expect(resolveInitialSubscribed('missing')).toBe(false);
  });
});

describe('hydrateChannelActionChrome', () => {
  it('marks stored follows subscribed and restores persisted identity', () => {
    resetChannelActionChromeForTests();
    hydrateChannelActionChrome({
      persisted: {
        abc: { channelId: 12, notificationsEnabled: true },
        gone: { channelId: 99, notificationsEnabled: false },
      },
      subscribedIdTexts: ['abc'],
    });

    expect(getChannelActionChrome('abc')).toEqual({
      channelId: 12,
      isSubscribed: true,
      notificationsEnabled: true,
    });
    expect(getChannelActionChrome('gone')).toEqual({
      channelId: 99,
      isSubscribed: false,
      notificationsEnabled: false,
    });
  });
});

describe('resolveChannelNotificationsEnabled', () => {
  it('reads the account once a numeric id is known', () => {
    expect(
      resolveChannelNotificationsEnabled({
        accountNotificationChannelIds: [12],
        cachedChannelId: 12,
        cachedNotificationsEnabled: false,
        channelId: null,
        previewNotificationsEnabled: false,
      })
    ).toBe(true);
    expect(
      resolveChannelNotificationsEnabled({
        accountNotificationChannelIds: [],
        cachedChannelId: null,
        cachedNotificationsEnabled: true,
        channelId: 12,
      })
    ).toBe(false);
  });

  it('uses preview then cache when the numeric id is not known yet', () => {
    expect(
      resolveChannelNotificationsEnabled({
        accountNotificationChannelIds: [12],
        cachedChannelId: null,
        cachedNotificationsEnabled: false,
        channelId: null,
        previewNotificationsEnabled: true,
      })
    ).toBe(true);
    expect(
      resolveChannelNotificationsEnabled({
        accountNotificationChannelIds: [12],
        cachedChannelId: null,
        cachedNotificationsEnabled: true,
        channelId: null,
      })
    ).toBe(true);
  });
});

describe('persisted channel action chrome', () => {
  it('omits rows that only know a follow', () => {
    resetChannelActionChromeForTests();
    rememberChannelSubscribed('abc', true);
    expect(snapshotPersistedChannelActionChrome()).toEqual({});
  });

  it('round-trips numeric id and bell state', () => {
    resetChannelActionChromeForTests();
    rememberChannelIdentity('abc', 12);
    rememberChannelNotifications('abc', true);
    const parsed = parsePersistedChannelActionChrome(snapshotPersistedChannelActionChrome());
    expect(parsed).toEqual({
      abc: { channelId: 12, notificationsEnabled: true },
    });
  });

  it('ignores a malformed persist payload', () => {
    expect(parsePersistedChannelActionChrome(null)).toEqual({});
    expect(parsePersistedChannelActionChrome('nope')).toEqual({});
    expect(parsePersistedChannelActionChrome({ abc: 'nope' })).toEqual({
      abc: { channelId: null, notificationsEnabled: null },
    });
  });
});
