import { describe, expect, it } from 'vitest';

import { MediumEnum } from '@podverse/helpers';

import type { EmbedUrlEntityContext } from '../buildEmbedUrl';
import { buildEmbedUrl, buildEmbedUrlPath, resolveEmbedUrlTarget } from '../buildEmbedUrl';

const podcastChannel = {
  id_text: 'podcast-channel',
  medium_id: MediumEnum.Podcast,
} as EmbedUrlEntityContext['channel'];

const musicChannel = {
  id_text: 'album-channel',
  medium_id: MediumEnum.Music,
} as EmbedUrlEntityContext['channel'];

const podcastItem = {
  id_text: 'episode-item',
} as EmbedUrlEntityContext['item'];

const musicItem = {
  id_text: 'track-item',
} as EmbedUrlEntityContext['item'];

const clip = {
  id_text: 'clip-item',
} as EmbedUrlEntityContext['clip'];

const chapter = {
  id_text: 'chapter-item',
} as EmbedUrlEntityContext['item_chapter'];

const soundbite = {
  id_text: 'soundbite-item',
} as EmbedUrlEntityContext['item_soundbite'];

const playlist = {
  id_text: 'playlist-item',
} as EmbedUrlEntityContext['playlist'];

describe('resolveEmbedUrlTarget', () => {
  it('maps podcast channel with episode to single episode embed', () => {
    expect(
      resolveEmbedUrlTarget({
        channel: podcastChannel,
        item: podcastItem,
        clip: null,
        item_chapter: null,
        item_soundbite: null,
        playlist: null,
      })
    ).toEqual({
      routeKind: 'episode',
      pathname: '/embed/episode/episode-item',
      isListRoute: false,
      resourceIdText: 'episode-item',
    });
  });

  it('maps podcast channel without episode to list podcast embed', () => {
    expect(
      resolveEmbedUrlTarget({
        channel: podcastChannel,
        item: null,
        clip: null,
        item_chapter: null,
        item_soundbite: null,
        playlist: null,
      })
    ).toEqual({
      routeKind: 'podcast',
      pathname: '/embed/podcast/podcast-channel',
      isListRoute: true,
      resourceIdText: 'podcast-channel',
    });
  });

  it('maps album channel with track to single track embed', () => {
    expect(
      resolveEmbedUrlTarget({
        channel: musicChannel,
        item: musicItem,
        clip: null,
        item_chapter: null,
        item_soundbite: null,
        playlist: null,
      })
    ).toEqual({
      routeKind: 'track',
      pathname: '/embed/track/track-item',
      isListRoute: false,
      resourceIdText: 'track-item',
    });
  });

  it('maps album channel without track to list album embed', () => {
    expect(
      resolveEmbedUrlTarget({
        channel: musicChannel,
        item: null,
        clip: null,
        item_chapter: null,
        item_soundbite: null,
        playlist: null,
      })
    ).toEqual({
      routeKind: 'album',
      pathname: '/embed/album/album-channel',
      isListRoute: true,
      resourceIdText: 'album-channel',
    });
  });

  it('maps clip, chapter, official clip, and playlist contexts', () => {
    expect(
      resolveEmbedUrlTarget({
        channel: podcastChannel,
        item: podcastItem,
        clip,
        item_chapter: null,
        item_soundbite: null,
        playlist: null,
      })?.pathname
    ).toBe('/embed/clip/clip-item');

    expect(
      resolveEmbedUrlTarget({
        channel: podcastChannel,
        item: podcastItem,
        clip: null,
        item_chapter: chapter,
        item_soundbite: null,
        playlist: null,
      })?.pathname
    ).toBe('/embed/chapter/chapter-item');

    expect(
      resolveEmbedUrlTarget({
        channel: podcastChannel,
        item: podcastItem,
        clip: null,
        item_chapter: null,
        item_soundbite: soundbite,
        playlist: null,
      })?.pathname
    ).toBe('/embed/official-clip/soundbite-item');

    expect(
      resolveEmbedUrlTarget({
        channel: null,
        item: null,
        clip: null,
        item_chapter: null,
        item_soundbite: null,
        playlist,
      })?.pathname
    ).toBe('/embed/playlist/playlist-item');
  });

  it('honors explicit list layout when channel and item are both present', () => {
    expect(
      resolveEmbedUrlTarget(
        {
          channel: podcastChannel,
          item: podcastItem,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        'list'
      )?.pathname
    ).toBe('/embed/podcast/podcast-channel');
  });

  it('maps an item with chapters list content to the episode-chapters route', () => {
    expect(
      resolveEmbedUrlTarget(
        {
          channel: podcastChannel,
          item: podcastItem,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        'list',
        'chapters'
      )
    ).toEqual({
      routeKind: 'episode-chapters',
      pathname: '/embed/episode-chapters/episode-item',
      isListRoute: true,
      resourceIdText: 'episode-item',
    });
  });

  it('keeps the channel list route when list content is episodes even with an item present', () => {
    expect(
      resolveEmbedUrlTarget(
        {
          channel: podcastChannel,
          item: podcastItem,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        'list',
        'episodes'
      )?.pathname
    ).toBe('/embed/podcast/podcast-channel');
  });
});

describe('buildEmbedUrlPath', () => {
  it('omits default query params and includes optional ones', () => {
    const context: EmbedUrlEntityContext = {
      channel: podcastChannel,
      item: podcastItem,
      clip: null,
      item_chapter: null,
      item_soundbite: null,
      playlist: null,
    };

    expect(buildEmbedUrlPath(context)).toBe('/embed/episode/episode-item');
    expect(
      buildEmbedUrlPath(context, {
        startSeconds: 42,
      })
    ).toBe('/embed/episode/episode-item?t=42');

    expect(
      buildEmbedUrlPath(context, {
        presentation: 'video',
        aspectRatio: '4x3',
      })
    ).toBe('/embed/episode/episode-item?ar=4x3&presentation=video');
  });

  it('includes play_id_text only for list routes', () => {
    expect(
      buildEmbedUrlPath(
        {
          channel: podcastChannel,
          item: null,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        { playIdText: 'other-episode' }
      )
    ).toBe('/embed/podcast/podcast-channel?play_id_text=other-episode');

    expect(
      buildEmbedUrlPath(
        {
          channel: podcastChannel,
          item: podcastItem,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        { playIdText: 'other-episode' }
      )
    ).toBe('/embed/episode/episode-item');
  });

  it('includes rows only for list routes and when non-default', () => {
    expect(
      buildEmbedUrlPath(
        {
          channel: podcastChannel,
          item: null,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        { listVisibleRows: 7 }
      )
    ).toBe('/embed/podcast/podcast-channel?rows=7');

    expect(
      buildEmbedUrlPath(
        {
          channel: podcastChannel,
          item: podcastItem,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        { listVisibleRows: 7 }
      )
    ).toBe('/embed/episode/episode-item');
  });

  it('includes clip list type and popularity range for podcast list routes', () => {
    expect(
      buildEmbedUrlPath(
        {
          channel: podcastChannel,
          item: null,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        {
          listContentType: 'clips',
          listSort: 'top',
          listRange: 'all-time',
        }
      )
    ).toBe('/embed/podcast/podcast-channel?type=clips&sort=top&range=all-time');
  });

  it('builds the episode-chapters route with a descending sort', () => {
    expect(
      buildEmbedUrlPath(
        {
          channel: podcastChannel,
          item: podcastItem,
          clip: null,
          item_chapter: null,
          item_soundbite: null,
          playlist: null,
        },
        {
          layout: 'list',
          listContentType: 'chapters',
          listSort: 'desc',
          sort: 'desc',
        }
      )
    ).toBe('/embed/episode-chapters/episode-item?sort=desc');
  });
});

describe('buildEmbedUrl', () => {
  it('prefixes origin from options', () => {
    expect(
      buildEmbedUrl(
        {
          channel: podcastChannel,
          item: null,
          clip: null,
          item_chapter: null,
          item_soundbite: soundbite,
          playlist: null,
        },
        { origin: 'https://example.test' }
      )
    ).toBe('https://example.test/embed/official-clip/soundbite-item');
  });
});
