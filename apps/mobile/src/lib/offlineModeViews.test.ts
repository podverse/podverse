import { describe, expect, it } from 'vitest';

import {
  isEpisodeTabNetworkBody,
  isHomeChannelListOfflineCompatible,
  isHomeClipsUnavailableOffline,
  isHomeDownloadedItemsOnly,
  isPodcastSectionUnavailableOffline,
  resolvePodcastSectionForOfflineMode,
} from './offlineModeViews';

describe('offlineModeViews', () => {
  it('keeps subscribed channel lists offline-compatible', () => {
    expect(isHomeChannelListOfflineCompatible('podcasts')).toBe(true);
    expect(isHomeChannelListOfflineCompatible('artists')).toBe(true);
    expect(isHomeChannelListOfflineCompatible('albums')).toBe(true);
    expect(isHomeChannelListOfflineCompatible('episodes')).toBe(false);
  });

  it('narrows episodes and tracks to downloads only', () => {
    expect(isHomeDownloadedItemsOnly('episodes')).toBe(true);
    expect(isHomeDownloadedItemsOnly('tracks')).toBe(true);
    expect(isHomeDownloadedItemsOnly('podcasts')).toBe(false);
  });

  it('marks home clips as unavailable offline', () => {
    expect(isHomeClipsUnavailableOffline('clips')).toBe(true);
    expect(isHomeClipsUnavailableOffline('episodes')).toBe(false);
  });

  it('defaults podcast detail to Downloaded, overriding remembered About or Episodes', () => {
    expect(
      resolvePodcastSectionForOfflineMode('episodes', ['episodes', 'downloaded', 'about', 'clips'])
    ).toBe('downloaded');
    expect(
      resolvePodcastSectionForOfflineMode('about', ['episodes', 'downloaded', 'about', 'clips'])
    ).toBe('downloaded');
    expect(
      resolvePodcastSectionForOfflineMode('clips', ['episodes', 'downloaded', 'about', 'clips'])
    ).toBe('downloaded');
  });

  it('flags network-only podcast panes', () => {
    expect(isPodcastSectionUnavailableOffline('clips')).toBe(true);
    expect(isPodcastSectionUnavailableOffline('soundbites')).toBe(true);
    expect(isPodcastSectionUnavailableOffline('podroll')).toBe(true);
    expect(isPodcastSectionUnavailableOffline('downloaded')).toBe(false);
    expect(isPodcastSectionUnavailableOffline('about')).toBe(false);
    expect(isPodcastSectionUnavailableOffline('episodes')).toBe(false);
  });

  it('flags episode panes that need a network body fetch', () => {
    expect(isEpisodeTabNetworkBody('summary')).toBe(false);
    expect(isEpisodeTabNetworkBody('chapters')).toBe(true);
    expect(isEpisodeTabNetworkBody('clips')).toBe(true);
    expect(isEpisodeTabNetworkBody('soundbites')).toBe(true);
    expect(isEpisodeTabNetworkBody('transcript')).toBe(true);
    expect(isEpisodeTabNetworkBody('funding')).toBe(false);
  });
});
