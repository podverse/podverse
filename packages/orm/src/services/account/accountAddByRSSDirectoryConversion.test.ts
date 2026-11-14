import { describe, expect, it } from 'vitest';

import {
  addByRssResourceMatchesCanonicalFeed,
  decideAddByRssDirectoryCollision,
  directoryEpisodeRefFromAddByRssResource,
} from './accountAddByRSSDirectoryConversion.js';

const CANONICAL = 'https://example.com/show';

describe('addByRssResourceMatchesCanonicalFeed', () => {
  it('treats host case, a default port, and a trailing slash as the same feed', () => {
    expect(
      addByRssResourceMatchesCanonicalFeed({ feed_url: 'https://Example.com/show/' }, CANONICAL)
    ).toBe(true);
    expect(
      addByRssResourceMatchesCanonicalFeed({ feed_url: 'https://example.com:443/show' }, CANONICAL)
    ).toBe(true);
  });

  it('rejects a different scheme or path', () => {
    expect(
      addByRssResourceMatchesCanonicalFeed({ feed_url: 'http://example.com/show' }, CANONICAL)
    ).toBe(false);
    expect(
      addByRssResourceMatchesCanonicalFeed({ feed_url: 'https://example.com/other' }, CANONICAL)
    ).toBe(false);
    expect(addByRssResourceMatchesCanonicalFeed({}, CANONICAL)).toBe(false);
  });
});

describe('directoryEpisodeRefFromAddByRssResource', () => {
  it('keeps a real guid and the enclosure so the enclosure can be tried second', () => {
    expect(
      directoryEpisodeRefFromAddByRssResource({
        feed_url: 'https://example.com/show',
        guid: 'episode-guid',
        enclosure_url: 'https://cdn.example/episode.mp3',
      })
    ).toEqual({
      guid: 'episode-guid',
      enclosureUrl: 'https://cdn.example/episode.mp3',
    });
  });

  it('drops a device-local guid and uses the enclosure', () => {
    expect(
      directoryEpisodeRefFromAddByRssResource({
        feed_url: 'https://example.com/show',
        channel_id_text: 'devicechan1',
        guid: 'devicechan1-4',
        enclosure_url: 'https://cdn.example/episode.mp3',
      })
    ).toEqual({
      guid: null,
      enclosureUrl: 'https://cdn.example/episode.mp3',
    });
  });
});

describe('decideAddByRssDirectoryCollision', () => {
  it('moves a row when the directory episode is not already on that list', () => {
    expect(
      decideAddByRssDirectoryCollision({
        surface: 'queue',
        directoryRowPresent: false,
        listPosition: '1',
        addByRssPlaybackPosition: '5',
        directoryPlaybackPosition: null,
        sourceRemoved: false,
      })
    ).toEqual({ action: 'move' });
  });

  it('drops an upcoming duplicate without copying playback', () => {
    expect(
      decideAddByRssDirectoryCollision({
        surface: 'queue',
        directoryRowPresent: true,
        listPosition: '1',
        addByRssPlaybackPosition: '40',
        directoryPlaybackPosition: '5',
        sourceRemoved: false,
      })
    ).toEqual({ action: 'drop', playbackPosition: null });
  });

  it('keeps the larger history playback position from the Add by RSS row', () => {
    expect(
      decideAddByRssDirectoryCollision({
        surface: 'queue',
        directoryRowPresent: true,
        listPosition: '-1',
        addByRssPlaybackPosition: '40',
        directoryPlaybackPosition: '5',
        sourceRemoved: false,
      })
    ).toEqual({ action: 'drop', playbackPosition: '40' });
  });

  it('leaves the directory history playback when it is already larger or equal', () => {
    expect(
      decideAddByRssDirectoryCollision({
        surface: 'queue',
        directoryRowPresent: true,
        listPosition: '-1',
        addByRssPlaybackPosition: '5',
        directoryPlaybackPosition: '10.00',
        sourceRemoved: false,
      })
    ).toEqual({ action: 'drop', playbackPosition: null });
    expect(
      decideAddByRssDirectoryCollision({
        surface: 'queue',
        directoryRowPresent: true,
        listPosition: '-1',
        addByRssPlaybackPosition: '10',
        directoryPlaybackPosition: '10.00',
        sourceRemoved: false,
      })
    ).toEqual({ action: 'drop', playbackPosition: null });
  });

  it('leaves a playlist row whose source was removed', () => {
    expect(
      decideAddByRssDirectoryCollision({
        surface: 'playlist',
        directoryRowPresent: false,
        listPosition: '2',
        addByRssPlaybackPosition: null,
        directoryPlaybackPosition: null,
        sourceRemoved: true,
      })
    ).toEqual({ action: 'leave' });
  });

  it('drops a playlist duplicate', () => {
    expect(
      decideAddByRssDirectoryCollision({
        surface: 'playlist',
        directoryRowPresent: true,
        listPosition: '2',
        addByRssPlaybackPosition: null,
        directoryPlaybackPosition: null,
        sourceRemoved: false,
      })
    ).toEqual({ action: 'drop', playbackPosition: null });
  });
});
