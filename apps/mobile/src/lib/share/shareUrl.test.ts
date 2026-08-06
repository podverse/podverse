import { describe, expect, it } from 'vitest';

import type {
  AddByRSSResourceData,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import type { PlaybackTarget } from '@podverse/playback-core';

import { buildNowPlayingShareUrl, buildPublicShareUrl } from './shareUrl';

const makeChannel = (idText: string): DTOChannel => {
  return {
    feed_id: 1,
    has_podcast_index_value: false,
    has_value_time_splits: false,
    id: 1,
    id_text: idText,
    medium_id: 1,
    podcast_guid: null,
    slug: null,
    sortable_title: null,
    title: null,
  };
};

const makeItem = (idText: string): DTOItem => {
  return {
    channel_id: 1,
    id: 1,
    id_text: idText,
    item_about: {
      id: 1,
      item_id: 1,
    },
    item_chat: {
      id: 1,
      item_id: 1,
      server: '',
    },
    item_content_links: [],
    item_enclosures: [],
    item_flag_status_id: 1,
    item_fundings: [],
    item_images: [],
    item_license: {
      id: 1,
      identifier: '',
      item_id: 1,
      url: null,
    },
    item_location: {
      id: 1,
      item_id: 1,
      name: null,
    },
    item_persons: [],
    item_season: {
      channel_season_id: 1,
      id: 1,
      item_id: 1,
      title: null,
    },
    item_social_interacts: [],
    item_soundbites: [],
    item_transcripts: [],
    item_txts: [],
    item_values: [],
  };
};

const makeClip = (idText: string, item: DTOItem): DTOClip => {
  return {
    account: {
      id: 1,
      id_text: 'acct',
      verified: true,
    },
    end_time: null,
    id: 1,
    id_text: idText,
    item,
    item_id: item.id_text,
    sharable_status: {
      id: 1,
      status: 'public',
    },
    start_time: '0',
  };
};

const makeSoundbite = (): DTOItemSoundbite => {
  return {
    duration: '5',
    id: 1,
    id_text: 'sb1',
    item_id: 1,
    start_time: '0',
  };
};

const makeChapter = (): DTOItemChapter => {
  return {
    data_hash: 'hash',
    id: 1,
    id_text: 'ch1',
    item_chapters_feed_id: 1,
    start_time: '0',
    table_of_contents: false,
  };
};

describe('buildPublicShareUrl', () => {
  it('joins base/resource/id_text', () => {
    expect(buildPublicShareUrl('https://podverse.fm', 'episode', 'ep123')).toBe(
      'https://podverse.fm/episode/ep123'
    );
  });

  it('strips trailing slash from web base url', () => {
    expect(buildPublicShareUrl('https://podverse.fm/', 'podcast', 'pod123')).toBe(
      'https://podverse.fm/podcast/pod123'
    );
  });
});

describe('buildNowPlayingShareUrl', () => {
  const webBaseUrl = 'https://podverse.fm/';
  const channel = makeChannel('pod123');
  const item = makeItem('ep123');

  it('maps clip targets to /clip/:id_text', () => {
    const target: PlaybackTarget = {
      channel,
      clip: makeClip('clip123', item),
      item,
      kind: 'clip',
    };
    expect(buildNowPlayingShareUrl(webBaseUrl, target)).toBe('https://podverse.fm/clip/clip123');
  });

  it('maps item/soundbite/chapter targets to /episode/:id_text', () => {
    const soundbiteTarget: PlaybackTarget = {
      channel,
      item,
      kind: 'soundbite',
      soundbite: makeSoundbite(),
    };
    const chapterTarget: PlaybackTarget = {
      channel,
      chapter: makeChapter(),
      item,
      kind: 'chapter',
    };
    const itemPodcastTarget: PlaybackTarget = {
      channel,
      item,
      kind: 'item-podcast',
    };
    const itemVideoTarget: PlaybackTarget = {
      channel,
      item,
      kind: 'item-video',
    };
    const itemMusicTarget: PlaybackTarget = {
      channel,
      intent: 'explicit_play',
      item,
      kind: 'item-music',
    };

    expect(buildNowPlayingShareUrl(webBaseUrl, soundbiteTarget)).toBe(
      'https://podverse.fm/episode/ep123'
    );
    expect(buildNowPlayingShareUrl(webBaseUrl, chapterTarget)).toBe(
      'https://podverse.fm/episode/ep123'
    );
    expect(buildNowPlayingShareUrl(webBaseUrl, itemPodcastTarget)).toBe(
      'https://podverse.fm/episode/ep123'
    );
    expect(buildNowPlayingShareUrl(webBaseUrl, itemVideoTarget)).toBe(
      'https://podverse.fm/episode/ep123'
    );
    expect(buildNowPlayingShareUrl(webBaseUrl, itemMusicTarget)).toBe(
      'https://podverse.fm/episode/ep123'
    );
  });

  it('maps livestream targets to /podcast/:id_text', () => {
    const target: PlaybackTarget = {
      channel: makeChannel('pod999'),
      item: null,
      kind: 'livestream',
    };
    expect(buildNowPlayingShareUrl(webBaseUrl, target)).toBe('https://podverse.fm/podcast/pod999');
  });

  it('returns null for add-by-rss targets', () => {
    const target: PlaybackTarget = {
      kind: 'add-by-rss',
      resourceData: {} satisfies AddByRSSResourceData,
    };
    expect(buildNowPlayingShareUrl(webBaseUrl, target)).toBeNull();
  });
});
