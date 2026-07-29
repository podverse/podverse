import { describe, expect, it } from 'vitest';

import type { DTOPlaylist } from '@podverse/helpers/dto';

import type { NativeCacheBrowseNode } from '../nativeCache';
import {
  mapPlaylistToNode,
  mapSubscribedChannelToNode,
  mergeLibraryBrowseNodes,
} from './libraryBrowseProjection';
import type { SubscribedChannel } from './subscriptionsMerge';

/** Narrow a mapper result to non-null without a type assertion (mappers drop untitled entries). */
const requireNode = (value: NativeCacheBrowseNode | null): NativeCacheBrowseNode => {
  if (value === null) {
    throw new Error('expected a mapped NativeCacheBrowseNode, received null');
  }
  return value;
};

const subscribed = (partial: Partial<SubscribedChannel>): SubscribedChannel => ({
  idText: 'chan1',
  title: 'Channel One',
  imageUrl: null,
  source: 'directory',
  medium: 'podcasts',
  ...partial,
});

const playlist = (partial: Partial<DTOPlaylist>): DTOPlaylist => ({
  id: 1,
  id_text: 'pl1',
  sharable_status_id: 1,
  is_default_likes: false,
  item_count: 3,
  medium_id: 1,
  last_updated: '2026-01-01T00:00:00.000Z',
  title: 'Playlist One',
  ...partial,
});

describe('mapSubscribedChannelToNode', () => {
  it('maps a directory channel to a podcast node preserving idText/title/artwork', () => {
    const node = mapSubscribedChannelToNode(
      subscribed({ idText: 'dir1', title: 'Directory', imageUrl: 'https://img/1.jpg' })
    );
    expect(node).toEqual({
      idText: 'dir1',
      title: 'Directory',
      kind: 'podcast',
      artworkUrl: 'https://img/1.jpg',
    });
  });

  it('maps an add-by-RSS channel to a podcast node with a null artwork when absent', () => {
    const node = mapSubscribedChannelToNode(
      subscribed({ idText: 'https://feed.xml', title: 'RSS Feed', source: 'addByRss' })
    );
    expect(node.kind).toBe('podcast');
    expect(node.idText).toBe('https://feed.xml');
    expect(node.artworkUrl).toBeNull();
  });
});

describe('mapPlaylistToNode', () => {
  it('maps a titled playlist to a playlist node with a null artwork (DTO has no image)', () => {
    const node = requireNode(mapPlaylistToNode(playlist({ id_text: 'pl9', title: 'Road Trip' })));
    expect(node).toEqual({
      idText: 'pl9',
      title: 'Road Trip',
      kind: 'playlist',
      artworkUrl: null,
    });
  });

  it('drops an untitled or blank-title playlist', () => {
    expect(mapPlaylistToNode(playlist({ title: null }))).toBeNull();
    expect(mapPlaylistToNode(playlist({ title: '   ' }))).toBeNull();
  });

  it('drops a playlist missing a usable id_text', () => {
    expect(mapPlaylistToNode(playlist({ id_text: '   ', title: 'Has Title' }))).toBeNull();
  });
});

describe('mergeLibraryBrowseNodes', () => {
  it('concatenates channel nodes before playlist nodes', () => {
    const channels = [mapSubscribedChannelToNode(subscribed({ idText: 'c1', title: 'C1' }))];
    const playlists = [requireNode(mapPlaylistToNode(playlist({ id_text: 'p1', title: 'P1' })))];
    const merged = mergeLibraryBrowseNodes(channels, playlists);
    expect(merged.map((node) => node.idText)).toEqual(['c1', 'p1']);
    expect(merged.map((node) => node.kind)).toEqual(['podcast', 'playlist']);
  });

  it('dedupes by idText keeping the first (channel) occurrence', () => {
    const channels = [mapSubscribedChannelToNode(subscribed({ idText: 'dupe', title: 'Channel' }))];
    const playlists = [
      requireNode(mapPlaylistToNode(playlist({ id_text: 'dupe', title: 'Playlist' }))),
    ];
    const merged = mergeLibraryBrowseNodes(channels, playlists);
    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe('podcast');
    expect(merged[0].title).toBe('Channel');
  });

  it('returns an empty list when both inputs are empty', () => {
    expect(mergeLibraryBrowseNodes([], [])).toEqual([]);
  });
});
