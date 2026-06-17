import { describe, expect, it } from 'vitest';

import { parseEmbedBuilderQueryParams } from '../parseEmbedBuilderQueryParams';

describe('parseEmbedBuilderQueryParams', () => {
  it('returns compact defaults when params are missing', () => {
    expect(parseEmbedBuilderQueryParams({})).toEqual({
      playerSize: 'compact',
      listEnabled: false,
      mediaPreference: 'audio',
      channel: null,
      mediumId: null,
      item: null,
      clip: null,
      itemChapter: null,
      itemSoundbite: null,
      playlist: null,
      playlistItem: null,
      sort: null,
      listContentType: 'episodes',
      listSort: 'recent',
      listRange: null,
      startSeconds: 0,
      playIdText: null,
      listVisibleRows: 5,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      borderColor: '#444444',
    });
  });

  it('accepts legacy audio type aliases', () => {
    expect(parseEmbedBuilderQueryParams({ type: 'audio' })).toMatchObject({
      playerSize: 'compact',
      listEnabled: false,
      mediaPreference: 'audio',
    });
    expect(parseEmbedBuilderQueryParams({ type: 'video-list' })).toMatchObject({
      playerSize: 'responsive',
      listEnabled: true,
      mediaPreference: 'video',
    });
  });

  it('parses list query param independently from type', () => {
    expect(parseEmbedBuilderQueryParams({ type: 'compact', list: '1' })).toMatchObject({
      playerSize: 'compact',
      listEnabled: true,
    });
    expect(parseEmbedBuilderQueryParams({ type: 'responsive', list: 'off' })).toMatchObject({
      playerSize: 'responsive',
      listEnabled: false,
    });
  });

  it('parses prefer query param for media preference', () => {
    expect(parseEmbedBuilderQueryParams({ type: 'compact', prefer: 'video' })).toMatchObject({
      playerSize: 'compact',
      mediaPreference: 'video',
    });
    expect(parseEmbedBuilderQueryParams({ type: 'responsive', prefer: 'audio' })).toMatchObject({
      playerSize: 'responsive',
      mediaPreference: 'audio',
    });
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

  it('maps playlist_item to playlistItem for legacy list type alias', () => {
    expect(
      parseEmbedBuilderQueryParams({
        type: 'audio-list',
        playlist: 'pl-1',
        playlist_item: 'item-1',
      })
    ).toMatchObject({
      playerSize: 'compact',
      listEnabled: true,
      playlist: 'pl-1',
      playlistItem: 'item-1',
    });
  });

  it('parses and normalizes aspect ratio values', () => {
    expect(parseEmbedBuilderQueryParams({ ar: '1x1' }).aspectRatio).toBe('1x1');
    expect(parseEmbedBuilderQueryParams({ ar: 'nope' }).aspectRatio).toBe('16x9');
  });

  it('parses and clamps rows', () => {
    expect(parseEmbedBuilderQueryParams({ rows: '1' }).listVisibleRows).toBe(2);
    expect(parseEmbedBuilderQueryParams({ rows: '8' }).listVisibleRows).toBe(8);
    expect(parseEmbedBuilderQueryParams({ rows: '99' }).listVisibleRows).toBe(10);
  });

  it('parses and sanitizes the border color', () => {
    expect(parseEmbedBuilderQueryParams({}).borderColor).toBe('#444444');
    expect(parseEmbedBuilderQueryParams({ border: 'none' }).borderColor).toBe('none');
    expect(parseEmbedBuilderQueryParams({ border: '#abcdef' }).borderColor).toBe('#abcdef');
    expect(parseEmbedBuilderQueryParams({ border: 'evil;"></iframe>' }).borderColor).toBe(
      '#444444'
    );
  });

  it('forces list on for channel-only sources', () => {
    expect(
      parseEmbedBuilderQueryParams({
        channel: 'podcast-1',
        type: 'compact',
      })
    ).toMatchObject({
      playerSize: 'compact',
      listEnabled: true,
    });

    expect(
      parseEmbedBuilderQueryParams({
        channel: 'podcast-1',
        type: 'responsive',
        list: '0',
      })
    ).toMatchObject({
      playerSize: 'responsive',
      listEnabled: true,
    });
  });
});
