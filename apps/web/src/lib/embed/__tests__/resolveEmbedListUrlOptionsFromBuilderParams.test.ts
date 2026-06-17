import { describe, expect, it } from 'vitest';

import type { EmbedBuilderQueryParams } from '../embedBuilderTypes';
import { resolveEmbedListUrlOptionsFromBuilderParams } from '../resolveEmbedListUrlOptionsFromBuilderParams';

const baseParams: EmbedBuilderQueryParams = {
  playerSize: 'compact',
  listEnabled: true,
  mediaPreference: 'audio',
  channel: 'podcast-channel',
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
};

describe('resolveEmbedListUrlOptionsFromBuilderParams', () => {
  it('omits sort for default episode lists but keeps content type', () => {
    expect(resolveEmbedListUrlOptionsFromBuilderParams(baseParams)).toEqual({
      listContentType: 'episodes',
      listSort: null,
      listRange: null,
      sort: null,
    });
  });

  it('emits sort for oldest episode lists', () => {
    expect(
      resolveEmbedListUrlOptionsFromBuilderParams({ ...baseParams, listSort: 'oldest' })
    ).toEqual({
      listContentType: 'episodes',
      listSort: 'oldest',
      listRange: null,
      sort: 'oldest',
    });
  });

  it('maps clip popularity lists to embed query options', () => {
    expect(
      resolveEmbedListUrlOptionsFromBuilderParams({
        ...baseParams,
        listContentType: 'clips',
        listSort: 'top',
        listRange: null,
      })
    ).toEqual({
      listContentType: 'clips',
      listSort: 'top',
      listRange: 'all-time',
      sort: 'top',
    });
  });

  it('omits the default forward sort for track lists', () => {
    expect(
      resolveEmbedListUrlOptionsFromBuilderParams({
        ...baseParams,
        listContentType: 'tracks',
        listSort: 'forward',
      })
    ).toEqual({
      listContentType: 'tracks',
      listSort: null,
      listRange: null,
      sort: null,
    });
  });

  it('emits the backward sort for track lists', () => {
    expect(
      resolveEmbedListUrlOptionsFromBuilderParams({
        ...baseParams,
        listContentType: 'tracks',
        listSort: 'backward',
      })
    ).toEqual({
      listContentType: 'tracks',
      listSort: 'backward',
      listRange: null,
      sort: 'backward',
    });
  });

  it('emits the descending sort for chapter lists', () => {
    expect(
      resolveEmbedListUrlOptionsFromBuilderParams({
        ...baseParams,
        listContentType: 'chapters',
        listSort: 'desc',
      })
    ).toEqual({
      listContentType: 'chapters',
      listSort: 'desc',
      listRange: null,
      sort: 'desc',
    });
  });
});
