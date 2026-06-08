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
      autoplay: false,
      startSeconds: 0,
      showChapterMarkers: true,
    });
  });

  it('normalizes invalid autoplay and start time values', () => {
    expect(
      parseEmbedSingleQueryParams({
        autoplay: 'maybe',
        t: '-5',
      })
    ).toEqual({
      autoplay: false,
      startSeconds: 0,
      showChapterMarkers: true,
    });
  });

  it('parses valid autoplay and start seconds', () => {
    expect(
      parseEmbedSingleQueryParams({
        autoplay: 'true',
        t: '42',
      })
    ).toEqual({
      autoplay: true,
      startSeconds: 42,
      showChapterMarkers: true,
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
});

describe('parseEmbedPodcastListQueryParams', () => {
  it('returns podcast list defaults', () => {
    expect(parseEmbedPodcastListQueryParams({})).toEqual({
      autoplay: false,
      startSeconds: 0,
      showChapterMarkers: true,
      type: 'episodes',
      sort: 'recent',
      page: 1,
      range: null,
      playIdText: null,
    });
  });

  it('falls back when sort and type are invalid', () => {
    expect(
      parseEmbedPodcastListQueryParams({
        sort: 'not-a-sort',
        type: 'not-a-type',
      })
    ).toEqual({
      autoplay: false,
      startSeconds: 0,
      showChapterMarkers: true,
      type: 'episodes',
      sort: 'recent',
      page: 1,
      range: null,
      playIdText: null,
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
});

describe('parseEmbedAlbumListQueryParams', () => {
  it('returns album list defaults', () => {
    expect(parseEmbedAlbumListQueryParams({})).toEqual({
      autoplay: false,
      startSeconds: 0,
      showChapterMarkers: true,
      type: 'tracks',
      sort: 'forward',
      page: 1,
      range: null,
      playIdText: null,
    });
  });
});

describe('parseEmbedPlaylistListQueryParams', () => {
  it('returns playlist list defaults', () => {
    expect(parseEmbedPlaylistListQueryParams({})).toEqual({
      autoplay: false,
      startSeconds: 0,
      showChapterMarkers: true,
      page: 1,
      playIdText: null,
    });
  });
});
