import { describe, expect, it } from 'vitest';

import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import type { DTOItemSoundbite } from '@podverse/helpers/dto';
import type { PlaybackTarget } from '@podverse/playback-core';

import {
  FULL_PLAYER_JUMP_BACK_SECONDS,
  FULL_PLAYER_JUMP_FORWARD_SECONDS,
  hasNextQueueItem,
  resolveAddToPlaylistTarget,
  shouldShowV4vAction,
} from './fullPlayerRows';

const channel = (idText: string): DTOChannel => ({
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
});

const item = (idText: string, includeValueTag: boolean): DTOItem => ({
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
  item_values: includeValueTag
    ? [
        {
          id: 1,
          item_id: 1,
          item_value_recipients: [],
          method: 'keysend',
          suggested: null,
          type: 'lightning',
        },
      ]
    : [],
});

const clip = (idText: string, clipItem: DTOItem): DTOClip => ({
  account: {
    id: 1,
    id_text: 'acct',
    verified: true,
  },
  end_time: null,
  id: 1,
  id_text: idText,
  item: clipItem,
  item_id: clipItem.id_text,
  sharable_status: {
    id: 1,
    status: 'public',
  },
  start_time: '0',
});

const soundbite = (idText: string, sourceItem: DTOItem): DTOItemSoundbite => ({
  end_time: null,
  id: 1,
  id_text: idText,
  item: sourceItem,
  item_id: sourceItem.id_text,
  sharable_status: {
    id: 1,
    status: 'public',
  },
  start_time: '15',
  title: 'Soundbite',
});

describe('fullPlayerRows', () => {
  it('disables next when manual and auto queues are empty', () => {
    expect(hasNextQueueItem(0, 0)).toBe(false);
    expect(hasNextQueueItem(1, 0)).toBe(true);
    expect(hasNextQueueItem(0, 1)).toBe(true);
  });

  it('shows V4V only when gate and value tags are both present', () => {
    const withValueTags: PlaybackTarget = {
      channel: channel('podcast'),
      item: item('episode-with-value', true),
      kind: 'item-podcast',
    };
    const withoutValueTags: PlaybackTarget = {
      channel: channel('podcast'),
      item: item('episode-no-value', false),
      kind: 'item-podcast',
    };

    expect(shouldShowV4vAction(withValueTags, true)).toBe(true);
    expect(shouldShowV4vAction(withValueTags, false)).toBe(false);
    expect(shouldShowV4vAction(withoutValueTags, true)).toBe(false);
  });

  it('uses shared jump constants and playlist targets', () => {
    expect(FULL_PLAYER_JUMP_BACK_SECONDS).toBe(10);
    expect(FULL_PLAYER_JUMP_FORWARD_SECONDS).toBe(30);

    const clipItem = item('episode', false);
    const clipTarget: PlaybackTarget = {
      channel: channel('podcast'),
      clip: clip('clip-1', clipItem),
      item: clipItem,
      kind: 'clip',
    };
    const itemTarget: PlaybackTarget = {
      channel: channel('podcast'),
      item: item('episode-2', false),
      kind: 'item-podcast',
    };
    const soundbiteTarget: PlaybackTarget = {
      channel: channel('podcast'),
      item: item('episode-3', false),
      kind: 'soundbite',
      soundbite: soundbite('soundbite-1', item('episode-3', false)),
    };
    const addByRssTarget: PlaybackTarget = {
      kind: 'add-by-rss',
      resourceData: {
        channel_title: 'RSS channel',
        title: 'RSS item',
      },
    };

    expect(resolveAddToPlaylistTarget(clipTarget)).toEqual({
      idText: 'clip-1',
      kind: 'clip',
      medium: 'av',
    });
    expect(resolveAddToPlaylistTarget(itemTarget)).toEqual({
      idText: 'episode-2',
      kind: 'item',
      medium: 'av',
    });
    expect(resolveAddToPlaylistTarget(soundbiteTarget)).toEqual({
      idText: 'soundbite-1',
      kind: 'soundbite',
      medium: 'av',
    });
    expect(resolveAddToPlaylistTarget(addByRssTarget)).toEqual({
      kind: 'add-by-rss',
      medium: 'av',
      resourceData: {
        channel_title: 'RSS channel',
        title: 'RSS item',
      },
    });
  });
});
