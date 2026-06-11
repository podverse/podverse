import { describe, expect, it } from 'vitest';

import { parseEmbedBuilderQueryParams } from '../parseEmbedBuilderQueryParams';

describe('parseEmbedBuilderQueryParams', () => {
  it('returns audio defaults when params are missing', () => {
    expect(parseEmbedBuilderQueryParams({})).toEqual({
      type: 'audio',
      channel: null,
      mediumId: null,
      item: null,
      clip: null,
      itemChapter: null,
      itemSoundbite: null,
      playlist: null,
      playlistItem: null,
      sort: null,
      autoplay: false,
      startSeconds: 0,
      playIdText: null,
      showChapterMarkers: true,
    });
  });

  it('defaults autoplay on for list types', () => {
    expect(parseEmbedBuilderQueryParams({ type: 'audio-list' }).autoplay).toBe(true);
    expect(parseEmbedBuilderQueryParams({ type: 'video-list' }).autoplay).toBe(true);
  });

  it('maps medium_id to mediumId', () => {
    expect(
      parseEmbedBuilderQueryParams({
        channel: 'album-1',
        medium_id: '3',
      })
    ).toMatchObject({
      channel: 'album-1',
      mediumId: 3,
    });
  });

  it('maps playlist_item to playlistItem', () => {
    expect(
      parseEmbedBuilderQueryParams({
        type: 'audio-list',
        playlist: 'pl-1',
        playlist_item: 'item-1',
      })
    ).toMatchObject({
      playlist: 'pl-1',
      playlistItem: 'item-1',
    });
  });
});
