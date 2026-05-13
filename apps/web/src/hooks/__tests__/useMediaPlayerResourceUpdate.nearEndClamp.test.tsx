/**
 * Pins the 5-second near-end clamp behavior inside
 * `useMediaPlayerResourceUpdate`.
 *
 * The clamp lives at
 * [useMediaPlayerResourceUpdate.tsx:153](../useMediaPlayerResourceUpdate.tsx):
 *
 * ```ts
 * if (duration > 0 && currentTime >= duration - 5) {
 *   currentTime = 0;
 * }
 * ```
 *
 * Matrix reference:
 * [MEDIA-PLAYER-DECISION-MATRIX.md](../../components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)
 * § 6 "Near-end clamp / 5-second rule". Phase 2 of the media-player refactor
 * extracts this rule into `clampNearEndSeconds.ts`; this pinning test must be
 * rewritten against the new helper at that time so the semantics survive the
 * extraction unchanged.
 */
import { cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  EnclosureSelectedParams,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { useMediaPlayerResourceUpdate } from '../useMediaPlayerResourceUpdate';

const hoisted = vi.hoisted(() => ({
  setMPCurrentTime: vi.fn<(t: number) => void>(),
  updateNowPlaying: vi.fn(),
  abridgedRef: {
    current: {
      items: {},
      clips: {},
      item_soundbites: {},
      add_by_rss_resource_datas: {},
    } as QueueResourcesAbridgedIndex,
  },
}));

vi.mock('../../contexts/AddByRSSListContext', () => ({
  useAddByRSSListContext: () => ({
    setAddByRSSListContext: vi.fn(),
  }),
}));

vi.mock('../../contexts/AutoQueue', () => ({
  useAutoQueue: () => ({
    autoQueueConfig: {
      playlist_id_text: null,
      disabled: false,
      random: false,
      repeat: false,
      nextPage: 1,
      shuffleHash: '',
    },
    setAutoQueueConfig: vi.fn(),
    setAutoQueueResources: vi.fn(),
    setAutoQueueActiveRow: vi.fn(),
  }),
}));

vi.mock('../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    setMPAddByRSS: vi.fn(),
    setMPShouldPlay: vi.fn(),
    setMPChannel: vi.fn(),
    setMPClip: vi.fn(),
    setMPItem: vi.fn(),
    setMPItemChapter: vi.fn(),
    setMPItemChapterShouldSeek: vi.fn(),
    setMPItemSoundbite: vi.fn(),
    setMPItemLabeledItemEnclosures: vi.fn(),
    setMPEnclosureSelectedParams: vi.fn(),
    setMPIsPlaying: vi.fn(),
    mpEnclosureSelectedParams: null,
    mpItem: null,
  }),
}));

vi.mock('../../contexts/MediaPlayerCurrentTime', () => ({
  useMediaPlayerCurrentTime: () => ({
    setMPCurrentTime: hoisted.setMPCurrentTime,
  }),
}));

vi.mock('../../contexts/QueueResourcesAbridgedIndex', () => ({
  useQueueResourcesAbridgedIndex: () => ({
    queueResourcesAbridgedIndex: hoisted.abridgedRef.current,
  }),
}));

vi.mock('../useQueueResourceUpdateNowPlaying', () => ({
  useQueueResourcesUpdateNowPlaying: () => hoisted.updateNowPlaying,
}));

const defaultEnclosureParams: EnclosureSelectedParams = {
  type: 'default',
  enclosureRowSelected: null,
  sourceRowSelected: null,
};

const channel = (mediumId: number): DTOChannel =>
  ({
    id: 1,
    medium_id: mediumId,
    podcast_index_id: '0',
  }) as unknown as DTOChannel;

const item = (id: number): DTOItem =>
  ({
    id,
    id_text: `item-${id}`,
  }) as unknown as DTOItem;

const clip = (id: number): DTOClip =>
  ({
    id,
    id_text: `clip-${id}`,
    start_time: 0,
    end_time: 60,
  }) as unknown as DTOClip;

const soundbite = (id: number): DTOItemSoundbite =>
  ({
    id,
    start_time: 0,
    duration: 15,
  }) as unknown as DTOItemSoundbite;

type UpdateArgs = Parameters<ReturnType<typeof useMediaPlayerResourceUpdate>>[0];

function Probe({ args }: { args: UpdateArgs }) {
  const update = useMediaPlayerResourceUpdate();
  useEffect(() => {
    update(args);
  }, [update, args]);
  return null;
}

function dispatch(
  abridged: QueueResourcesAbridgedIndex,
  args: Partial<UpdateArgs> & Pick<UpdateArgs, 'channel'>
) {
  hoisted.abridgedRef.current = abridged;
  const merged: UpdateArgs = {
    channel: args.channel,
    clip: args.clip ?? null,
    item: args.item ?? null,
    itemChapter: args.itemChapter ?? null,
    itemChapterShouldSeek: args.itemChapterShouldSeek ?? false,
    itemSoundbite: args.itemSoundbite ?? null,
    enclosureSelectedParams: args.enclosureSelectedParams ?? defaultEnclosureParams,
    skipMoveNowPlayingToHistory: args.skipMoveNowPlayingToHistory ?? false,
    newAutoQueueConfig: args.newAutoQueueConfig ?? {
      playlist_id_text: null,
      disabled: false,
      random: false,
      repeat: false,
      nextPage: 1,
      shuffleHash: '',
    },
    autoQueueShouldClear: args.autoQueueShouldClear ?? false,
  };
  render(<Probe args={merged} />);
}

beforeEach(() => {
  hoisted.setMPCurrentTime.mockClear();
  hoisted.updateNowPlaying.mockClear();
  hoisted.abridgedRef.current = {
    items: {},
    clips: {},
    item_soundbites: {},
    add_by_rss_resource_datas: {},
  };
});

afterEach(() => {
  cleanup();
});

describe('useMediaPlayerResourceUpdate near-end clamp (matrix § 6)', () => {
  it('item-podcast: p well below d-5 -> setMPCurrentTime(p)', () => {
    dispatch(
      {
        items: { 10: { p: '150', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(150);
  });

  it('item-podcast: p exactly at d-5 -> clamped to 0', () => {
    dispatch(
      {
        items: { 10: { p: '2995', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('item-podcast: p just under d-5 -> not clamped', () => {
    dispatch(
      {
        items: { 10: { p: '2994', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(2994);
  });

  it('item-video: clamp applies the same way', () => {
    dispatch(
      {
        items: { 11: { p: '2999', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Video), item: item(11) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('clip: clamp applies against clip-row abridged p/d', () => {
    dispatch(
      {
        items: {},
        clips: { 7: { p: '58', d: '60' } },
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10), clip: clip(7) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('soundbite: clamp applies against soundbite-row abridged p/d', () => {
    dispatch(
      {
        items: {},
        clips: {},
        item_soundbites: { 8: { p: '14', d: '15' } },
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10), itemSoundbite: soundbite(8) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('item-music: always 0 regardless of abridged p (music skip path, not clamp)', () => {
    dispatch(
      {
        items: { 12: { p: '200', d: '240' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Music), item: item(12) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('item-podcast: zero duration -> clamp gate is false, setMPCurrentTime(p)', () => {
    dispatch(
      {
        items: { 13: { p: '2995', d: '0' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(13) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(2995);
  });

  it('item-podcast: missing abridged row -> setMPCurrentTime(0)', () => {
    dispatch(
      {
        items: {},
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(99) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });
});
