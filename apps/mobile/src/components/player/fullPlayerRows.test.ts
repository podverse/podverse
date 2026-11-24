import { describe, expect, it } from 'vitest';

import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';
import type { DTOPlaybackResourceSummary } from '@podverse/helpers/accountPlaybackStream';
import type { DTOItemSoundbite } from '@podverse/helpers/dto';
import type { PlaybackTarget } from '@podverse/playback-core';

import {
  canAdvanceToNextQueueItem,
  FULL_PLAYER_JUMP_BACK_SECONDS,
  FULL_PLAYER_JUMP_FORWARD_SECONDS,
  hasNextQueueItem,
  resolveAddToPlaylistTarget,
  resolveQueueMutationTarget,
  resolveRemoteAddToPlaylistTarget,
  shouldClearNowPlayingAfterAdvance,
  shouldDismissFullPlayerOnEmptySession,
  shouldShowV4vAction,
  upcomingManualCountFromCombined,
} from './fullPlayerRows';

const channel = (idText: string): DTOChannel => ({
  feed_id: 1,
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
  duration: '30',
  id: 1,
  id_text: idText,
  item: sourceItem,
  item_id: sourceItem.id,
  start_time: '15',
  title: 'Soundbite',
});

describe('fullPlayerRows', () => {
  it('disables next when manual and auto queues are empty', () => {
    expect(hasNextQueueItem(0, 0)).toBe(false);
    expect(hasNextQueueItem(1, 0)).toBe(true);
    expect(hasNextQueueItem(0, 1)).toBe(true);
  });

  it('counts only items ahead of now-playing in a combined queue load', () => {
    expect(upcomingManualCountFromCombined(3, true)).toBe(2);
    expect(upcomingManualCountFromCombined(1, true)).toBe(0);
    expect(upcomingManualCountFromCombined(0, false)).toBe(0);
    expect(upcomingManualCountFromCombined(2, false)).toBe(2);
  });

  it('advances only when manual upcoming or auto-queue has a next item', () => {
    expect(canAdvanceToNextQueueItem(0, false)).toBe(false);
    expect(canAdvanceToNextQueueItem(1, false)).toBe(true);
    expect(canAdvanceToNextQueueItem(0, true)).toBe(true);
  });

  it('never clears now-playing on a skip that found nothing ahead', () => {
    expect(shouldClearNowPlayingAfterAdvance('skip', false)).toBe(false);
    expect(shouldClearNowPlayingAfterAdvance('skip', true)).toBe(false);
    expect(shouldClearNowPlayingAfterAdvance('complete', false)).toBe(true);
    expect(shouldClearNowPlayingAfterAdvance('complete', true)).toBe(false);
  });

  it('dismisses the focused full player when the session is gone, not make clip', () => {
    expect(
      shouldDismissFullPlayerOnEmptySession({
        hasPlaybackSession: false,
        isAuthoringHold: false,
        isFocused: true,
      })
    ).toBe(true);
    expect(
      shouldDismissFullPlayerOnEmptySession({
        hasPlaybackSession: true,
        isAuthoringHold: false,
        isFocused: true,
      })
    ).toBe(false);
    expect(
      shouldDismissFullPlayerOnEmptySession({
        hasPlaybackSession: false,
        isAuthoringHold: true,
        isFocused: true,
      })
    ).toBe(false);
    expect(
      shouldDismissFullPlayerOnEmptySession({
        hasPlaybackSession: false,
        isAuthoringHold: false,
        isFocused: false,
      })
    ).toBe(false);
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

    const omittedValues = item('episode-abridged', false);
    Reflect.deleteProperty(omittedValues, 'item_values');
    const abridgedTarget: PlaybackTarget = {
      channel: channel('podcast'),
      item: omittedValues,
      kind: 'item-podcast',
    };
    expect(shouldShowV4vAction(abridgedTarget, true)).toBe(false);
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

  it('resolves queue mutation targets for Add by RSS', () => {
    const avResourceData = {
      feed_url: 'https://example.com/feed.xml',
      guid: 'episode-guid',
      title: 'RSS episode',
    };
    const avTarget: PlaybackTarget = {
      kind: 'add-by-rss',
      resourceData: avResourceData,
    };
    const avResolved = resolveQueueMutationTarget(avTarget);
    expect(avResolved).toEqual({
      kind: 'add-by-rss',
      medium: 'av',
      resourceData: avResourceData,
    });
    expect(avResolved !== null && avResolved.kind === 'add-by-rss' && avResolved.resourceData).toBe(
      avResourceData
    );

    const musicResourceData = {
      feed_url: 'https://example.com/music.xml',
      guid: 'track-guid',
      medium_id: MediumEnum.Music,
      title: 'RSS track',
    };
    expect(
      resolveQueueMutationTarget({
        kind: 'add-by-rss',
        resourceData: musicResourceData,
      })
    ).toEqual({
      kind: 'add-by-rss',
      medium: 'music',
      resourceData: musicResourceData,
    });

    expect(
      resolveQueueMutationTarget({
        kind: 'add-by-rss',
        resourceData: {
          feed_url: 'https://example.com/live.xml',
          guid: 'live-guid',
          liveItem: {},
          title: 'RSS live',
        },
      })
    ).toBeNull();

    expect(
      resolveQueueMutationTarget({
        channel: channel('album'),
        intent: 'explicit_play',
        item: item('track-1', false),
        kind: 'item-music',
      })
    ).toEqual({
      idText: 'track-1',
      kind: 'item',
      mediaType: 'tracks',
    });
  });

  it('resolves a remote playlist target from the summary medium', () => {
    const summary = (
      ref: DTOPlaybackResourceSummary['ref'],
      medium: MediumEnum
    ): DTOPlaybackResourceSummary => ({
      channel_title: 'Show',
      image_url: null,
      medium,
      ref,
      title: 'Title',
    });
    const addByRssData = { feed_url: 'https://example.com/feed.xml', title: 'RSS item' };

    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ item_id_text: 'ep-1', kind: 'item' }, MediumEnum.Podcast),
        null
      )
    ).toEqual({ idText: 'ep-1', kind: 'item', medium: 'av' });
    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ item_id_text: 'track-1', kind: 'item' }, MediumEnum.Music),
        null
      )
    ).toEqual({ idText: 'track-1', kind: 'item', medium: 'music' });
    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ item_id_text: 'live-1', kind: 'item' }, MediumEnum.MusicL),
        null
      )
    ).toEqual({ idText: 'live-1', kind: 'item', medium: 'av' });
    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ clip_id_text: 'clip-1', kind: 'clip' }, MediumEnum.Music),
        null
      )
    ).toEqual({ idText: 'clip-1', kind: 'clip', medium: 'music' });
    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ clip_id_text: 'clip-2', kind: 'clip' }, MediumEnum.Podcast),
        null
      )
    ).toEqual({ idText: 'clip-2', kind: 'clip', medium: 'av' });
    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ item_soundbite_id_text: 'sb-1', kind: 'soundbite' }, MediumEnum.Music),
        null
      )
    ).toEqual({ idText: 'sb-1', kind: 'soundbite', medium: 'music' });
    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ item_soundbite_id_text: 'sb-2', kind: 'soundbite' }, MediumEnum.Video),
        null
      )
    ).toEqual({ idText: 'sb-2', kind: 'soundbite', medium: 'av' });
    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ add_by_rss_hash_id: 'hash-1', kind: 'add_by_rss' }, MediumEnum.Music),
        addByRssData
      )
    ).toEqual({ kind: 'add-by-rss', medium: 'music', resourceData: addByRssData });
    expect(
      resolveRemoteAddToPlaylistTarget(
        summary({ add_by_rss_hash_id: 'hash-1', kind: 'add_by_rss' }, MediumEnum.Podcast),
        null
      )
    ).toBeNull();
  });
});
