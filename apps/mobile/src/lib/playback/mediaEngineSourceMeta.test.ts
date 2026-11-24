import { describe, expect, it } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOVerifiedPublisher,
} from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';
import type { PlaybackTarget } from '@podverse/playback-core';

import { safeJsonParse } from '../../data/db/serialization';
import { addByRssPlaybackMediaId } from '../addByRss/resourceData';
import {
  clipBoundsForSoundbite,
  engineSourceIdentityFromTarget,
  engineSourceMatchesTarget,
  mediaEngineSourceMetaFromTarget,
} from './mediaEngineSourceMeta';

const channel = (
  mediumId: MediumEnum,
  title: string,
  verifiedPublishers?: DTOVerifiedPublisher[]
): DTOChannel => {
  const base: DTOChannel = {
    feed_id: 0,
    has_value_time_splits: false,
    id: 1,
    id_text: 'channel-1',
    medium_id: mediumId,
    podcast_guid: null,
    slug: null,
    sortable_title: null,
    title,
  };
  if (verifiedPublishers === undefined) {
    return base;
  }
  return { ...base, verified_publishers: verifiedPublishers };
};

const item = (idText: string, title: string): DTOItem => ({
  channel_id: 1,
  id: 2,
  id_text: idText,
  item_about: { id: 1, item_id: 2 },
  item_chat: { id: 1, item_id: 2, server: '' },
  item_content_links: [],
  item_enclosures: [],
  item_flag_status_id: 0,
  item_fundings: [],
  item_images: [],
  item_license: { id: 1, identifier: '', item_id: 2, url: null },
  item_location: { id: 1, item_id: 2, name: null },
  item_persons: [],
  item_season: { channel_season_id: 0, id: 1, item_id: 2, title: null },
  item_social_interacts: [],
  item_soundbites: [],
  item_transcripts: [],
  item_txts: [],
  item_values: [],
  title,
});

const musicArtist: DTOVerifiedPublisher = {
  id_text: 'artist-1',
  medium_id: MediumEnum.PublisherMusic,
  title: 'Artist',
};

describe('mediaEngineSourceMetaFromTarget', () => {
  it('puts the artist name in subtitle and the album title in albumTitle', () => {
    const target: PlaybackTarget = {
      channel: channel(MediumEnum.Music, 'Album', [musicArtist]),
      intent: 'explicit_play',
      item: item('track-1', 'Track'),
      kind: 'item-music',
    };
    const meta = mediaEngineSourceMetaFromTarget(target, 'js');

    expect(meta?.subtitle).toBe('Artist');
    expect(meta?.albumTitle).toBe('Album');
  });

  it('keeps the channel title in subtitle and leaves albumTitle null without a verified artist', () => {
    const target: PlaybackTarget = {
      channel: channel(MediumEnum.Music, 'Album'),
      intent: 'explicit_play',
      item: item('track-1', 'Track'),
      kind: 'item-music',
    };
    const meta = mediaEngineSourceMetaFromTarget(target, 'js');

    expect(meta?.subtitle).toBe('Album');
    expect(meta?.albumTitle).toBeNull();
  });

  it('keeps the channel title in subtitle and leaves albumTitle null for a podcast episode', () => {
    const target: PlaybackTarget = {
      channel: channel(MediumEnum.Podcast, 'Show'),
      item: item('ep-1', 'Episode'),
      kind: 'item-podcast',
    };
    const meta = mediaEngineSourceMetaFromTarget(target, 'js');

    expect(meta?.subtitle).toBe('Show');
    expect(meta?.albumTitle).toBeNull();
  });
});

describe('engineSourceIdentityFromTarget', () => {
  const show = channel(MediumEnum.Podcast, 'Show');
  const episode = item('ep-1', 'Episode');
  const chapter: DTOItemChapter = {
    data_hash: 'hash',
    id: 1,
    id_text: 'chapter-1',
    item_chapters_feed_id: 1,
    start_time: '5',
    table_of_contents: false,
  };
  // The account and sharing fields are not read here.
  const clip = safeJsonParse<DTOClip>(
    JSON.stringify({ end_time: '20', id: 1, id_text: 'clip-1', item_id: null, start_time: '10' })
  );
  if (clip === null) {
    throw new Error('Failed to build clip fixture');
  }
  const soundbite: DTOItemSoundbite = {
    duration: '4',
    id: 1,
    id_text: 'sb-1',
    item_id: 2,
    start_time: '3',
  };

  it('matches the kind and id text the engine meta records', () => {
    const resourceData = { feed_url: 'https://e.x/feed.xml', guid: 'guid-1', title: 'RSS' };
    const targets: PlaybackTarget[] = [
      { channel: show, item: episode, kind: 'item-podcast' },
      { channel: show, chapter, item: episode, kind: 'chapter' },
      { channel: show, clip, item: episode, kind: 'clip' },
      { channel: show, item: episode, kind: 'soundbite', soundbite },
      { kind: 'add-by-rss', resourceData },
    ];

    expect(targets.map(engineSourceIdentityFromTarget)).toEqual([
      { idText: 'ep-1', kind: 'item' },
      { idText: 'ep-1', kind: 'item' },
      { idText: 'clip-1', kind: 'clip' },
      { idText: 'sb-1', kind: 'item_soundbite' },
      { idText: addByRssPlaybackMediaId(resourceData), kind: 'add_by_rss' },
    ]);
    for (const target of targets) {
      const meta = mediaEngineSourceMetaFromTarget(target, 'js');
      expect({ idText: meta?.idText, kind: meta?.kind }).toEqual(
        engineSourceIdentityFromTarget(target)
      );
    }
  });

  it('ends a soundbite at start plus duration only when the duration is positive', () => {
    expect(clipBoundsForSoundbite({ duration: '4', start_time: '3' })).toEqual({
      end: 7,
      start: 3,
    });
    expect(clipBoundsForSoundbite({ duration: '0', start_time: '3' })).toEqual({
      end: null,
      start: 3,
    });
  });
});

describe('engineSourceMatchesTarget', () => {
  const show = channel(MediumEnum.Podcast, 'Show');
  const episode = item('ep-1', 'Episode');
  const chapter: DTOItemChapter = {
    data_hash: 'hash',
    id: 1,
    id_text: 'chapter-1',
    item_chapters_feed_id: 1,
    start_time: '5',
    table_of_contents: false,
  };
  // The account and sharing fields are not read here.
  const clip = safeJsonParse<DTOClip>(
    JSON.stringify({ end_time: '20', id: 1, id_text: 'clip-1', item_id: null, start_time: '10' })
  );
  if (clip === null) {
    throw new Error('Failed to build clip fixture');
  }
  const chapterTarget: PlaybackTarget = {
    channel: show,
    chapter,
    item: episode,
    kind: 'chapter',
  };
  const itemTarget: PlaybackTarget = {
    channel: show,
    item: episode,
    kind: 'item-podcast',
  };
  const clipTarget: PlaybackTarget = {
    channel: show,
    clip,
    item: episode,
    kind: 'clip',
  };
  const resourceData = { feed_url: 'https://e.x/feed.xml', guid: 'guid-1', title: 'RSS' };
  const addByRssTarget: PlaybackTarget = { kind: 'add-by-rss', resourceData };

  it('matches a chapter target to its item id, not the chapter id or another item', () => {
    expect(engineSourceMatchesTarget(episode.id_text, chapterTarget)).toBe(true);
    expect(engineSourceMatchesTarget(chapter.id_text, chapterTarget)).toBe(false);
    expect(engineSourceMatchesTarget('other-item', chapterTarget)).toBe(false);
  });

  it('matches an item target to its own id and not another item', () => {
    expect(engineSourceMatchesTarget(episode.id_text, itemTarget)).toBe(true);
    expect(engineSourceMatchesTarget('other-item', itemTarget)).toBe(false);
  });

  it('matches a clip target to the clip id and not its item', () => {
    expect(engineSourceMatchesTarget(clip.id_text, clipTarget)).toBe(true);
    expect(engineSourceMatchesTarget(episode.id_text, clipTarget)).toBe(false);
  });

  it('matches an Add by RSS target to its playback media id', () => {
    expect(engineSourceMatchesTarget(addByRssPlaybackMediaId(resourceData), addByRssTarget)).toBe(
      true
    );
    expect(engineSourceMatchesTarget('other-item', addByRssTarget)).toBe(false);
  });

  it('counts a null engine id or a null target as a match', () => {
    expect(engineSourceMatchesTarget(null, itemTarget)).toBe(true);
    expect(engineSourceMatchesTarget(episode.id_text, null)).toBe(true);
  });
});
