import { describe, expect, it } from 'vitest';

import { MediumEnum } from '@podverse/helpers';

import { buildEmbedUrlPathFromBuilderParams } from '../buildEmbedUrlFromBuilderParams';
import type { EmbedBuilderQueryParams } from '../embedBuilderTypes';

const baseParams: EmbedBuilderQueryParams = {
  type: 'audio',
  channel: 'podcast-channel',
  mediumId: null,
  item: 'episode-item',
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
};

describe('buildEmbedUrlPathFromBuilderParams', () => {
  it('builds single episode paths for audio type', () => {
    expect(buildEmbedUrlPathFromBuilderParams(baseParams)).toBe(
      '/embed/episode/episode-item?presentation=audio'
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
    ).toBe('/embed/track/track-item?presentation=audio');
  });

  it('builds podcast list paths for audio-list type', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        type: 'audio-list',
        item: null,
        autoplay: true,
      })
    ).toBe('/embed/podcast/podcast-channel?autoplay=true&presentation=audio');
  });

  it('maps playlist_item to play_id_text for playlist list embeds', () => {
    expect(
      buildEmbedUrlPathFromBuilderParams({
        ...baseParams,
        type: 'audio-list',
        channel: null,
        item: null,
        playlist: 'playlist-1',
        playlistItem: 'episode-item',
        autoplay: true,
      })
    ).toBe('/embed/playlist/playlist-1?autoplay=true&presentation=audio&play_id_text=episode-item');
  });
});
