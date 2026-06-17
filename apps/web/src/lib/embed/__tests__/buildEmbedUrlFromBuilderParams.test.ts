import { describe, expect, it } from 'vitest';

import { MediumEnum } from '@podverse/helpers';

import { buildEmbedUrlPathFromBuilderParams } from '../buildEmbedUrlFromBuilderParams';
import type { EmbedBuilderQueryParams } from '../embedBuilderTypes';

const baseParams: EmbedBuilderQueryParams = {
  playerSize: 'compact',
  listEnabled: false,
  mediaPreference: 'audio',
  channel: 'podcast-channel',
  mediumId: null,
  item: 'episode-item',
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

describe('buildEmbedUrlPathFromBuilderParams', () => {
  it('builds single episode paths for compact type', () => {
    expect(buildEmbedUrlPathFromBuilderParams(baseParams)).toBe(
      '/embed/episode/episode-item?presentation=audio&player=compact'
    );
  });

  it('builds track paths when mediumId is music', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        channel: 'album-channel',
        mediumId: MediumEnum.Music,
        item: 'track-item',
      })
    ).toBe('/embed/track/track-item?presentation=audio&player=compact');
  });

  it('builds podcast list paths for compact-list type', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        playerSize: 'compact',
        listEnabled: true,
        item: null,
        listVisibleRows: 8,
      })
    ).toBe('/embed/podcast/podcast-channel?presentation=audio&player=compact&rows=8');
  });

  it('maps playlist_item to play_id_text for playlist list embeds', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        playerSize: 'compact',
        listEnabled: true,
        channel: null,
        item: null,
        playlist: 'playlist-1',
        playlistItem: 'episode-item',
      })
    ).toBe('/embed/playlist/playlist-1?presentation=audio&player=compact&play_id_text=episode-item');
  });

  it('includes ar query param for non-default aspect ratio on responsive player', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        playerSize: 'responsive',
        mediaPreference: 'video',
        aspectRatio: '4x3',
      })
    ).toBe('/embed/episode/episode-item?ar=4x3&presentation=video&player=responsive');
  });

  it('emits prefer video on compact player when builder overrides default', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        mediaPreference: 'video',
      })
    ).toBe('/embed/episode/episode-item?presentation=video&player=compact');
  });

  it('builds episode-chapters list paths for a chapters list', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        playerSize: 'compact',
        listEnabled: true,
        listContentType: 'chapters',
        listSort: 'asc',
      })
    ).toBe('/embed/episode-chapters/episode-item?presentation=audio&player=compact');
  });

  it('emits a descending sort for a chapters list', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        playerSize: 'compact',
        listEnabled: true,
        listContentType: 'chapters',
        listSort: 'desc',
      })
    ).toBe('/embed/episode-chapters/episode-item?presentation=audio&player=compact&sort=desc');
  });

  it('includes clip list query params for podcast list builder params', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        playerSize: 'compact',
        listEnabled: true,
        item: null,
        listContentType: 'clips',
        listSort: 'top',
        listRange: 'all-time',
      })
    ).toBe(
      '/embed/podcast/podcast-channel?presentation=audio&player=compact&type=clips&sort=top&range=all-time'
    );
  });
});
