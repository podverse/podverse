import { describe, expect, it, vi } from 'vitest';

import {
  rememberChannelNotifications,
  rememberChannelSubscribed,
  resetChannelActionChromeForTests,
} from '../lib/channelActionChrome';
import { buildPodcastDetailParams } from './podcastDetailParams';

vi.mock('expo-image', () => ({
  Image: { prefetch: vi.fn() },
}));

describe('buildPodcastDetailParams', () => {
  it('fills subscribe and notification preview from the device cache', () => {
    resetChannelActionChromeForTests();
    rememberChannelSubscribed('abc', true);
    rememberChannelNotifications('abc', true);

    expect(buildPodcastDetailParams({ podcastId: 'abc' })).toEqual({
      podcastId: 'abc',
      previewIsSubscribed: true,
      previewNotificationsEnabled: true,
    });
  });

  it('lets the source override a cached follow for Downloaded-only rows', () => {
    resetChannelActionChromeForTests();
    rememberChannelSubscribed('abc', true);

    expect(
      buildPodcastDetailParams({
        podcastId: 'abc',
        previewIsSubscribed: false,
      })
    ).toEqual({
      podcastId: 'abc',
      previewIsSubscribed: false,
    });
  });
});
