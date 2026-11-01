import { describe, expect, it, vi } from 'vitest';

import { resetChannelActionChromeForTests } from '../../lib/channelActionChrome';
import { buildProfileStackContentTarget } from './openProfileStackContent';

vi.mock('expo-image', () => ({
  Image: { prefetch: vi.fn() },
}));

describe('buildProfileStackContentTarget', () => {
  it('opens a podcast on PodcastDetail with list preview chrome', () => {
    resetChannelActionChromeForTests();

    expect(
      buildProfileStackContentTarget({
        kind: 'podcast',
        row: {
          id: 'pod-1',
          imageUrl: 'https://example.com/cover.jpg',
          title: 'Example Podcast',
        },
      })
    ).toEqual({
      name: 'PodcastDetail',
      params: {
        podcastId: 'pod-1',
        previewImageUrl: 'https://example.com/cover.jpg',
        previewTitle: 'Example Podcast',
      },
    });
  });

  it('opens an album on AlbumDetail with list preview chrome', () => {
    resetChannelActionChromeForTests();

    expect(
      buildProfileStackContentTarget({
        kind: 'album',
        row: {
          id: 'album-1',
          imageUrl: 'https://example.com/album.jpg',
          title: 'Example Album',
        },
      })
    ).toEqual({
      name: 'AlbumDetail',
      params: {
        albumId: 'album-1',
        previewImageUrl: 'https://example.com/album.jpg',
        previewTitle: 'Example Album',
      },
    });
  });

  it('opens a clip on ClipDetail by id', () => {
    expect(buildProfileStackContentTarget({ id: 'clip-1', kind: 'clip' })).toEqual({
      name: 'ClipDetail',
      params: { clipId: 'clip-1' },
    });
  });

  it('opens a playlist on PlaylistDetail by id', () => {
    expect(buildProfileStackContentTarget({ id: 'pl-1', kind: 'playlist' })).toEqual({
      name: 'PlaylistDetail',
      params: { playlistId: 'pl-1' },
    });
  });
});
