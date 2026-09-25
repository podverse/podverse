import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAddByRSSFeedByIdTextMock, getAddByRSSItemByIdTextMock } = vi.hoisted(() => ({
  getAddByRSSFeedByIdTextMock: vi.fn(),
  getAddByRSSItemByIdTextMock: vi.fn(),
}));

vi.mock('./storage', () => ({
  getAddByRSSFeedByIdText: getAddByRSSFeedByIdTextMock,
  getAddByRSSItemByIdText: getAddByRSSItemByIdTextMock,
}));

import {
  addByRSSProtectedMediaMessageKey,
  classifyAddByRSSProtectedMediaFailure,
  findAddByRSSFeedForItem,
  logAddByRSSProtectedMediaFailure,
} from './protectedMedia';

const flaggedFeed = {
  feedUrl: 'https://feeds.example.com/private.xml',
  requiresCredentials: true,
};

describe('classifyAddByRSSProtectedMediaFailure', () => {
  it('leaves failures on feeds without a credentials flag to the generic handling', () => {
    expect(
      classifyAddByRSSProtectedMediaFailure(
        { feedUrl: flaggedFeed.feedUrl, requiresCredentials: false },
        'https://cdn.other.net/ep.mp3'
      )
    ).toBeNull();
    expect(
      classifyAddByRSSProtectedMediaFailure(
        { feedUrl: flaggedFeed.feedUrl },
        'https://feeds.example.com/ep.mp3'
      )
    ).toBeNull();
    expect(classifyAddByRSSProtectedMediaFailure(null, 'https://x.example.com/ep.mp3')).toBeNull();
  });

  it('explains media on another registrable domain than the feed', () => {
    expect(classifyAddByRSSProtectedMediaFailure(flaggedFeed, 'https://cdn.other.net/ep.mp3')).toBe(
      'media_other_domain'
    );
  });

  it('explains same-site media, including subdomains and plain http, as needing credentials', () => {
    for (const url of [
      'https://feeds.example.com/ep.mp3',
      'https://media.example.com/ep.mp3',
      'http://media.example.com/ep.mp3',
    ]) {
      expect(classifyAddByRSSProtectedMediaFailure(flaggedFeed, url)).toBe(
        'media_needs_credentials'
      );
    }
  });

  it('falls back to the credentials message when the media URL is unknown', () => {
    expect(classifyAddByRSSProtectedMediaFailure(flaggedFeed, null)).toBe(
      'media_needs_credentials'
    );
  });

  it('maps each failure to its own catalog key', () => {
    expect(addByRSSProtectedMediaMessageKey('media_other_domain')).toBe(
      'add_by_rss.media_other_domain'
    );
    expect(addByRSSProtectedMediaMessageKey('media_needs_credentials')).toBe(
      'add_by_rss.media_needs_credentials'
    );
  });
});

describe('findAddByRSSFeedForItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the feed through the item index when the channel idText is missing', async () => {
    const feed = { idText: 'feed-1', feedUrl: flaggedFeed.feedUrl };
    getAddByRSSItemByIdTextMock.mockResolvedValue({ channelIdText: 'feed-1' });
    getAddByRSSFeedByIdTextMock.mockResolvedValue(feed);

    await expect(findAddByRSSFeedForItem({ itemIdText: 'item-1' })).resolves.toBe(feed);
    expect(getAddByRSSFeedByIdTextMock).toHaveBeenCalledWith('feed-1');
  });
});

describe('logAddByRSSProtectedMediaFailure', () => {
  it('logs hosts only, never the full media URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logAddByRSSProtectedMediaFailure({
      surface: 'playback',
      failure: 'media_needs_credentials',
      feed: { idText: 'feed-1', feedUrl: flaggedFeed.feedUrl },
      mediaUrl: 'https://media.example.com/ep.mp3?token=signed-secret',
      mediaErrorCode: 4,
    });

    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain('media.example.com');
    expect(logged).not.toContain('signed-secret');
    expect(logged).toContain('not_applicable');
    warn.mockRestore();
  });
});
