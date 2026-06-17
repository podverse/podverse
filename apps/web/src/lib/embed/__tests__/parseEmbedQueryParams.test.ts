import { describe, expect, it } from 'vitest';

import {
  parseEmbedAlbumListQueryParams,
  parseEmbedPlaylistListQueryParams,
  parseEmbedPodcastListQueryParams,
  parseEmbedSingleQueryParams,
} from '../parseEmbedQueryParams';

describe('parseEmbedSingleQueryParams', () => {
  it('returns stable defaults for missing params', () => {
    expect(parseEmbedSingleQueryParams({})).toEqual({
      startSeconds: 0,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'audio',
      presentationLocked: false,
      playerSize: 'compact',
      playerSizeLocked: false,
    });
  });

  it('normalizes invalid start time values', () => {
    expect(
      parseEmbedSingleQueryParams({
        t: '-5',
      })
    ).toEqual({
      startSeconds: 0,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'audio',
      presentationLocked: false,
      playerSize: 'compact',
      playerSizeLocked: false,
    });
  });

  it('parses start seconds from t query param', () => {
    expect(
      parseEmbedSingleQueryParams({
        t: '42',
      })
    ).toEqual({
      startSeconds: 42,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'audio',
      presentationLocked: false,
      playerSize: 'compact',
      playerSizeLocked: false,
    });
  });

  it('locks presentation when presentation query param is present', () => {
    expect(parseEmbedSingleQueryParams({ presentation: 'video' })).toEqual({
      startSeconds: 0,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'video',
      presentationLocked: true,
      playerSize: 'responsive',
      playerSizeLocked: false,
    });
  });

  it('parses player size independently from presentation', () => {
    expect(
      parseEmbedSingleQueryParams({
        presentation: 'video',
        player: 'compact',
      })
    ).toEqual({
      startSeconds: 0,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'video',
      presentationLocked: true,
      playerSize: 'compact',
      playerSizeLocked: true,
    });
  });

  it('disables chapter markers when chapter_markers is 0 or false', () => {
    expect(parseEmbedSingleQueryParams({ chapter_markers: '0' })).toMatchObject({
      showChapterMarkers: false,
    });
    expect(parseEmbedSingleQueryParams({ chapter_markers: 'false' })).toMatchObject({
      showChapterMarkers: false,
    });
  });

  it('parses and normalizes aspect ratio values', () => {
    expect(parseEmbedSingleQueryParams({ ar: '4x3' })).toMatchObject({
      aspectRatio: '4x3',
    });
    expect(parseEmbedSingleQueryParams({ ar: 'invalid' })).toMatchObject({
      aspectRatio: '16x9',
    });
  });
});

describe('parseEmbedPodcastListQueryParams', () => {
  it('returns podcast list defaults', () => {
    expect(parseEmbedPodcastListQueryParams({})).toEqual({
      startSeconds: 0,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'audio',
      presentationLocked: false,
      playerSize: 'compact',
      playerSizeLocked: false,
      type: 'episodes',
      sort: 'recent',
      page: 1,
      range: null,
      playIdText: null,
      listVisibleRows: 5,
    });
  });

  it('falls back when sort and type are invalid', () => {
    expect(
      parseEmbedPodcastListQueryParams({
        sort: 'not-a-sort',
        type: 'not-a-type',
      })
    ).toEqual({
      startSeconds: 0,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'audio',
      presentationLocked: false,
      playerSize: 'compact',
      playerSizeLocked: false,
      type: 'episodes',
      sort: 'recent',
      page: 1,
      range: null,
      playIdText: null,
      listVisibleRows: 5,
    });
  });

  it('passes through play_id_text when present', () => {
    expect(
      parseEmbedPodcastListQueryParams({
        play_id_text: 'e2ePodResume02',
      })
    ).toMatchObject({
      playIdText: 'e2ePodResume02',
    });
  });

  it('parses and clamps rows query param', () => {
    expect(parseEmbedPodcastListQueryParams({ rows: '1' }).listVisibleRows).toBe(2);
    expect(parseEmbedPodcastListQueryParams({ rows: '10' }).listVisibleRows).toBe(10);
    expect(parseEmbedPodcastListQueryParams({ rows: '99' }).listVisibleRows).toBe(10);
  });
});

describe('parseEmbedAlbumListQueryParams', () => {
  it('returns album list defaults', () => {
    expect(parseEmbedAlbumListQueryParams({})).toEqual({
      startSeconds: 0,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'audio',
      presentationLocked: false,
      playerSize: 'compact',
      playerSizeLocked: false,
      type: 'tracks',
      sort: 'forward',
      page: 1,
      range: null,
      playIdText: null,
      listVisibleRows: 5,
    });
  });
});

describe('parseEmbedPlaylistListQueryParams', () => {
  it('returns playlist list defaults', () => {
    expect(parseEmbedPlaylistListQueryParams({})).toEqual({
      startSeconds: 0,
      showChapterMarkers: true,
      aspectRatio: '16x9',
      presentation: 'audio',
      presentationLocked: false,
      playerSize: 'compact',
      playerSizeLocked: false,
      page: 1,
      playIdText: null,
      listVisibleRows: 5,
    });
  });
});
