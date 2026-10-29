import { describe, expect, it } from 'vitest';

import type { AddByRSSResourceType } from '@podverse/helpers';

import {
  addByRssItemsTab,
  isAddByRssFilterableSection,
  isAddByRssMusicFeed,
  isAddByRssSortableSection,
  resolveAddByRssInitialSection,
  resolveAddByRssSections,
} from './addByRssDetailSections';

const RESOURCE_TYPES: readonly AddByRSSResourceType[] = [
  'albums',
  'artists',
  'episodes',
  'podcasts',
  'tracks',
];

const podcast = {
  hasPodroll: false,
  hasRemoteItems: false,
  isArtistFeed: false,
  isMusicFeed: false,
};
const album = {
  hasPodroll: false,
  hasRemoteItems: false,
  isArtistFeed: false,
  isMusicFeed: true,
};
const artist = {
  hasPodroll: false,
  hasRemoteItems: false,
  isArtistFeed: true,
  isMusicFeed: true,
};

describe('add-by-RSS detail sections', () => {
  it('orders podcast chips and adds funding and people when the feed has them', () => {
    expect(resolveAddByRssSections({ ...podcast, hasFunding: false, hasPeople: false })).toEqual([
      'episodes',
      'downloaded',
      'about',
    ]);
    expect(resolveAddByRssSections({ ...podcast, hasFunding: true, hasPeople: false })).toEqual([
      'episodes',
      'downloaded',
      'about',
      'funding',
    ]);
    expect(resolveAddByRssSections({ ...podcast, hasFunding: false, hasPeople: true })).toEqual([
      'episodes',
      'downloaded',
      'about',
      'people',
    ]);
    expect(resolveAddByRssSections({ ...podcast, hasFunding: true, hasPeople: true })).toEqual([
      'episodes',
      'downloaded',
      'about',
      'funding',
      'people',
    ]);
  });

  it('orders album and track chips without downloaded', () => {
    expect(resolveAddByRssSections({ ...album, hasFunding: false, hasPeople: false })).toEqual([
      'tracks',
      'about',
    ]);
    expect(resolveAddByRssSections({ ...album, hasFunding: true, hasPeople: true })).toEqual([
      'tracks',
      'about',
      'funding',
      'people',
    ]);
  });

  it('gives an artist albums first, then tracks and about, then funding and people', () => {
    expect(resolveAddByRssSections({ ...artist, hasFunding: false, hasPeople: false })).toEqual([
      'albums',
      'tracks',
      'about',
    ]);
    expect(resolveAddByRssSections({ ...artist, hasFunding: true, hasPeople: true })).toEqual([
      'albums',
      'tracks',
      'about',
      'funding',
      'people',
    ]);
  });

  it('adds podroll after about, then remote items on podcast and album feeds only', () => {
    expect(
      resolveAddByRssSections({ ...podcast, hasFunding: true, hasPeople: true, hasPodroll: true })
    ).toEqual(['episodes', 'downloaded', 'about', 'podroll', 'funding', 'people']);
    expect(
      resolveAddByRssSections({
        ...album,
        hasFunding: true,
        hasPeople: true,
        hasPodroll: true,
        hasRemoteItems: true,
      })
    ).toEqual(['tracks', 'about', 'podroll', 'remote_items', 'funding', 'people']);
    expect(
      resolveAddByRssSections({
        ...podcast,
        hasFunding: false,
        hasPeople: false,
        hasRemoteItems: true,
      })
    ).toEqual(['episodes', 'downloaded', 'about', 'remote_items']);
    expect(
      resolveAddByRssSections({
        ...artist,
        hasFunding: true,
        hasPeople: true,
        hasPodroll: true,
        hasRemoteItems: true,
      })
    ).toEqual(['albums', 'tracks', 'about', 'podroll', 'funding', 'people']);
  });

  it('opens a podcast on downloaded while offline and otherwise on the items chip', () => {
    expect(resolveAddByRssInitialSection({ ...podcast, offline: true })).toBe('downloaded');
    expect(resolveAddByRssInitialSection({ ...podcast, offline: false })).toBe('episodes');
    expect(resolveAddByRssInitialSection({ ...album, offline: true })).toBe('tracks');
    expect(resolveAddByRssInitialSection({ ...album, offline: false })).toBe('tracks');
    expect(addByRssItemsTab(false)).toBe('episodes');
    expect(addByRssItemsTab(true)).toBe('tracks');
  });

  it('opens an artist on albums, offline or not', () => {
    expect(resolveAddByRssInitialSection({ ...artist, offline: true })).toBe('albums');
    expect(resolveAddByRssInitialSection({ ...artist, offline: false })).toBe('albums');
  });

  it('treats artists, albums, and tracks as music feeds', () => {
    const music = RESOURCE_TYPES.filter((resourceType) => isAddByRssMusicFeed(resourceType));
    expect(music).toEqual(['albums', 'artists', 'tracks']);
  });

  it('filters albums, downloaded, episodes, and tracks, and sorts only episodes and tracks', () => {
    expect(isAddByRssSortableSection('episodes')).toBe(true);
    expect(isAddByRssSortableSection('tracks')).toBe(true);
    expect(isAddByRssFilterableSection('episodes')).toBe(true);
    expect(isAddByRssFilterableSection('tracks')).toBe(true);
    expect(isAddByRssFilterableSection('downloaded')).toBe(true);
    expect(isAddByRssFilterableSection('albums')).toBe(true);
    expect(isAddByRssSortableSection('downloaded')).toBe(false);
    expect(isAddByRssSortableSection('albums')).toBe(false);

    for (const section of ['about', 'funding', 'people', 'podroll', 'remote_items'] as const) {
      expect(isAddByRssSortableSection(section)).toBe(false);
      expect(isAddByRssFilterableSection(section)).toBe(false);
    }
  });
});
